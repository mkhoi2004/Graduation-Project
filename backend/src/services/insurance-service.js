import { ApiError } from '../utils/api-error.js';

export function createInsuranceService({ insuranceRepo }) {
  function assertInsuranceStaff(user, actionName = 'thực hiện nghiệp vụ bảo hiểm') {
    if (['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(user?.role)) return;
    throw new ApiError(403, 'INSURANCE_ROLE_REQUIRED', `Chỉ Nhân viên tiếp nhận, Kế toán hoặc Quản trị viên mới được phép ${actionName}.`);
  }

  function assertApproverRole(user, actionName = 'phê duyệt xử lý bảo hiểm') {
    if (user?.role === 'ADMIN' || user?.isApprover) return;
    throw new ApiError(403, 'APPROVER_ROLE_REQUIRED', `Bạn không có quyền ${actionName}. Cần quyền Quản trị viên hoặc Kế toán trưởng có cờ Duyệt (IsApprover).`);
  }

  // --- CONTRACTS ---
  async function createContract(payload, user) {
    assertApproverRole(user, 'tạo hợp đồng bảo hiểm thương mại');
    if (!payload.contractNo || !payload.payerName || !payload.effectiveFrom || !payload.effectiveTo) {
      throw new ApiError(400, 'MISSING_CONTRACT_FIELDS', 'Vui lòng cung cấp đầy đủ: Mã hợp đồng, Tên công ty bảo hiểm, Ngày bắt đầu và Ngày kết thúc.');
    }
    return await insuranceRepo.createContract(payload, user);
  }

  async function listContracts(query, user) {
    assertInsuranceStaff(user, 'xem danh sách hợp đồng bảo hiểm');
    return await insuranceRepo.listContracts(query);
  }

  async function getContractById(id, user) {
    assertInsuranceStaff(user, 'xem chi tiết hợp đồng bảo hiểm');
    const contract = await insuranceRepo.getContractById(id);
    if (!contract) {
      throw new ApiError(404, 'CONTRACT_NOT_FOUND', 'Không tìm thấy hợp đồng bảo hiểm.');
    }
    return contract;
  }

  // --- CLAIMS ---
  async function createClaim(payload, user) {
    assertInsuranceStaff(user, 'lập hồ sơ yêu cầu bảo lãnh BHTM');
    if (!payload.visitId || !payload.patientId || !payload.insuranceContractId || !payload.lines || payload.lines.length === 0) {
      throw new ApiError(400, 'MISSING_CLAIM_FIELDS', 'Hồ sơ bảo hiểm cần có Lượt khám, Bệnh nhân, Hợp đồng bảo lãnh và ít nhất 1 dòng chi phí dịch vụ.');
    }
    try {
      return await insuranceRepo.createClaim(payload, user);
    } catch (err) {
      if (err.message === 'INSURANCE_CONTRACT_NOT_FOUND') {
        throw new ApiError(404, 'INSURANCE_CONTRACT_NOT_FOUND', 'Hợp đồng bảo hiểm không tồn tại.');
      }
      if (err.message === 'INSURANCE_CONTRACT_NOT_ACTIVE' || err.message === 'INSURANCE_CONTRACT_EXPIRED_OR_NOT_EFFECTIVE') {
        throw new ApiError(400, 'INSURANCE_CONTRACT_INVALID', 'Hợp đồng bảo hiểm không hoạt động hoặc đã hết hiệu lực.');
      }
      if (err.message === 'CLAIM_AMOUNT_EXCEEDS_CONTRACT_LIMIT') {
        throw new ApiError(400, 'LIMIT_EXCEEDED', 'Số tiền yêu cầu vượt quá hạn mức tối đa của hợp đồng bảo hiểm.');
      }
      throw err;
    }
  }

  async function listClaims(query, user) {
    assertInsuranceStaff(user, 'xem danh sách hồ sơ bảo lãnh');
    return await insuranceRepo.listClaims(query);
  }

  async function getClaimById(id, user) {
    assertInsuranceStaff(user, 'xem chi tiết hồ sơ bảo hiểm');
    const claim = await insuranceRepo.getClaimById(id);
    if (!claim) {
      throw new ApiError(404, 'CLAIM_NOT_FOUND', 'Không tìm thấy hồ sơ bảo hiểm.');
    }
    return claim;
  }

  // --- SUBMISSION & CHỐNG GỬI TRÙNG (AT-14) ---
  async function submitClaim(id, payload, user) {
    assertInsuranceStaff(user, 'gửi hồ sơ bảo lãnh BHTM');
    try {
      return await insuranceRepo.submitClaim(id, payload || {}, user);
    } catch (err) {
      if (err.message === 'DUPLICATE_CLAIM_SUBMISSION') {
        throw new ApiError(409, 'DUPLICATE_CLAIM_SUBMISSION', 'Hồ sơ phiên bản này đã được gửi tới đối tác bảo hiểm trước đó. Nghiêm cấm gửi trùng lặp.');
      }
      throw err;
    }
  }

  // --- XÉT DUYỆT (AT-03, AT-04, AT-14) ---
  async function adjudicateClaim(id, payload, user) {
    assertInsuranceStaff(user, 'ghi nhận kết quả phê duyệt bồi thường từ BHTM');
    if (payload.approvedAmount === undefined || payload.approvedAmount === null) {
      throw new ApiError(400, 'MISSING_APPROVED_AMOUNT', 'Vui lòng cung cấp số tiền được BHTM phê duyệt (ApprovedAmount).');
    }
    return await insuranceRepo.adjudicateClaim(id, payload, user);
  }

  // --- ĐỐI SOÁT TIỀN THỰC NHẬN (AT-03, AT-14) ---
  async function recordPayment(payload, user) {
    assertInsuranceStaff(user, 'ghi nhận tiền thanh toán từ BHTM');
    if (!payload.insuranceClaimId || !payload.externalReference || !payload.amount) {
      throw new ApiError(400, 'MISSING_PAYMENT_FIELDS', 'Vui lòng cung cấp: Mã hồ sơ claim, Mã giao dịch ngân hàng/chuyển khoản (ExternalReference) và Số tiền thực nhận.');
    }
    try {
      return await insuranceRepo.recordPayment(payload, user);
    } catch (err) {
      if (err.message === 'DUPLICATE_PAYMENT_REFERENCE') {
        throw new ApiError(409, 'DUPLICATE_PAYMENT_REFERENCE', 'Mã giao dịch ngân hàng này đã được đối soát trong hệ thống.');
      }
      throw err;
    }
  }

  // --- GIẢI QUYẾT TRANH CHẤP / XỬ LÝ PHẦN THIẾU (AT-04, AT-14) ---
  async function resolveDispute(disputeId, payload, user) {
    assertApproverRole(user, 'phê duyệt giải quyết tranh chấp/khoản thiếu bồi thường');
    if (!payload.resolution) {
      throw new ApiError(400, 'MISSING_RESOLUTION', 'Vui lòng nhập phương án xử lý (Resolution).');
    }
    return await insuranceRepo.resolveDispute(disputeId, payload, user);
  }

  return {
    createContract,
    listContracts,
    getContractById,
    createClaim,
    listClaims,
    getClaimById,
    submitClaim,
    adjudicateClaim,
    recordPayment,
    resolveDispute,
  };
}
