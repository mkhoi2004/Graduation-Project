import { ApiError } from '../utils/api-error.js';

export function createOperationsService({ operationsRepo }) {
  function assertOperationsStaff(user, actionName = 'thực hiện thao tác vận hành') {
    if (['ADMIN', 'DOCTOR', 'WAREHOUSE', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user?.role)) return;
    throw new ApiError(403, 'OPERATIONS_ROLE_REQUIRED', `Bạn không có quyền ${actionName}.`);
  }

  function assertClinicalOrWarehouse(user, actionName = 'quản lý tiệt trùng/vật tư') {
    if (['ADMIN', 'DOCTOR', 'WAREHOUSE'].includes(user?.role)) return;
    throw new ApiError(403, 'CLINICAL_ROLE_REQUIRED', `Chỉ Bác sĩ, Quản lý kho hoặc Quản trị viên mới được phép ${actionName}.`);
  }

  function assertApproverRole(user, actionName = 'phê duyệt') {
    if (user?.role === 'ADMIN' || user?.isApprover) return;
    throw new ApiError(403, 'APPROVER_ROLE_REQUIRED', `Cần quyền Quản trị viên hoặc Kế toán trưởng có cờ Duyệt để ${actionName}.`);
  }

  // Assets
  async function createAsset(payload, user) {
    assertClinicalOrWarehouse(user, 'đăng ký thiết bị y tế');
    if (!payload.assetCode || !payload.name || !payload.assetType || !payload.branchId) {
      throw new ApiError(400, 'MISSING_ASSET_FIELDS', 'Vui lòng cung cấp Mã thiết bị, Tên thiết bị, Loại thiết bị và Chi nhánh.');
    }
    return await operationsRepo.createAsset(payload, user);
  }

  async function listAssets(query, user) {
    assertOperationsStaff(user, 'xem danh sách thiết bị');
    return await operationsRepo.listAssets(query);
  }

  // Sterilization Cycles
  async function createSterilizationCycle(payload, user) {
    assertClinicalOrWarehouse(user, 'khởi chạy chu trình tiệt trùng');
    if (!payload.assetId) {
      throw new ApiError(400, 'MISSING_ASSET_ID', 'Vui lòng chọn thiết bị nồi hấp tiệt trùng.');
    }
    try {
      return await operationsRepo.createSterilizationCycle(payload, user);
    } catch (err) {
      if (err.message?.startsWith('ASSET_NOT_QUALIFIED_STATUS_')) {
        throw new ApiError(400, 'ASSET_NOT_QUALIFIED', `Thiết bị không đủ điều kiện tiệt trùng (Trạng thái: ${err.message.replace('ASSET_NOT_QUALIFIED_STATUS_', '')}). Đã tự động tạo báo cáo sự cố (AT-22).`);
      }
      if (err.message === 'ASSET_CALIBRATION_EXPIRED') {
        throw new ApiError(400, 'ASSET_CALIBRATION_EXPIRED', 'Thiết bị đã quá hạn kiểm chuẩn an toàn. Đã tự động tạo báo cáo sự cố y khoa (AT-22).');
      }
      throw err;
    }
  }

  async function completeSterilizationCycle(cycleId, payload, user) {
    assertClinicalOrWarehouse(user, 'kết thúc chu trình tiệt trùng');
    if (!payload.indicatorResult) {
      throw new ApiError(400, 'MISSING_INDICATOR_RESULT', 'Vui lòng cung cấp kết quả chỉ thị tiệt trùng (PASS, FAIL, INCONCLUSIVE).');
    }
    return await operationsRepo.completeSterilizationCycle(cycleId, payload, user);
  }

  async function listSterilizationCycles(query, user) {
    assertOperationsStaff(user, 'xem danh sách chu trình tiệt trùng');
    return await operationsRepo.listSterilizationCycles(query);
  }

  // Instrument Packs
  async function createInstrumentPack(payload, user) {
    assertClinicalOrWarehouse(user, 'đóng gói dụng cụ tiệt trùng');
    if (!payload.sterilizationCycleId) {
      throw new ApiError(400, 'MISSING_CYCLE_ID', 'Vui lòng chọn chu trình tiệt trùng cho gói dụng cụ.');
    }
    return await operationsRepo.createInstrumentPack(payload, user);
  }

  async function releaseInstrumentPack(packId, payload, user) {
    assertClinicalOrWarehouse(user, 'giải phóng kiểm định gói dụng cụ');
    try {
      return await operationsRepo.releaseInstrumentPack(packId, payload || {}, user);
    } catch (err) {
      if (err.message === 'CANNOT_RELEASE_PACK_CYCLE_NOT_PASSED') {
        throw new ApiError(400, 'CANNOT_RELEASE_FAILED_CYCLE', 'Chu trình tiệt trùng chưa vượt qua kiểm định (PASSED). Nghiêm cấm giải phóng gói dụng cụ không đạt chuẩn.');
      }
      throw err;
    }
  }

  async function listInstrumentPacks(query, user) {
    assertOperationsStaff(user, 'xem danh sách gói dụng cụ');
    return await operationsRepo.listInstrumentPacks(query);
  }

  // AT-22: Pack Usages & Incident Creation
  async function useInstrumentPack(payload, user) {
    if (!['DOCTOR', 'ADMIN'].includes(user?.role)) {
      throw new ApiError(403, 'DOCTOR_ROLE_REQUIRED', 'Chỉ Bác sĩ điều trị mới được phép xác nhận sử dụng gói dụng cụ trong ca khám.');
    }
    if (!payload.instrumentPackId || !payload.visitId || !payload.patientId) {
      throw new ApiError(400, 'MISSING_USAGE_FIELDS', 'Vui lòng cung cấp đầy đủ: Mã gói dụng cụ, Mã lượt khám và Mã bệnh nhân.');
    }
    try {
      return await operationsRepo.useInstrumentPack(payload, user);
    } catch (err) {
      if (err.message === 'PACK_EXPIRED_CANNOT_USE') {
        throw new ApiError(400, 'PACK_EXPIRED_CANNOT_USE', 'Gói dụng cụ đã quá hạn tiệt trùng. Đã kích hoạt cơ chế chặn an toàn và tự động ghi nhận sự cố y khoa (AT-22).');
      }
      if (err.message?.startsWith('PACK_STATUS_INVALID_')) {
        throw new ApiError(400, 'PACK_DEFECTIVE_OR_QUARANTINED', 'Gói dụng cụ đang bị cách ly hoặc hư hỏng. Không thể sử dụng.');
      }
      if (err.message === 'PACK_NOT_RELEASED') {
        throw new ApiError(400, 'PACK_NOT_RELEASED', 'Gói dụng cụ chưa được giải phóng kiểm định an toàn.');
      }
      if (err.message === 'PACK_ALREADY_USED') {
        throw new ApiError(409, 'PACK_ALREADY_USED', 'Gói dụng cụ này đã được sử dụng cho một ca khám trước đó. Mỗi gói chỉ dùng 1 lần duy nhất.');
      }
      throw err;
    }
  }

  // Lab Orders & Reworks
  async function createLabOrder(payload, user) {
    if (!['DOCTOR', 'ADMIN'].includes(user?.role)) {
      throw new ApiError(403, 'DOCTOR_ROLE_REQUIRED', 'Chỉ Bác sĩ mới được phép lập chỉ định gia công Labo.');
    }
    if (!payload.visitId || !payload.instructions || !payload.dueAt) {
      throw new ApiError(400, 'MISSING_LAB_ORDER_FIELDS', 'Vui lòng cung cấp Lượt khám, Hướng dẫn chế tác và Ngày hẹn giao hàng.');
    }
    return await operationsRepo.createLabOrder(payload, user);
  }

  async function updateLabOrder(orderId, payload, user) {
    assertOperationsStaff(user, 'cập nhật trạng thái đơn Labo');
    return await operationsRepo.updateLabOrder(orderId, payload, user);
  }

  async function listLabOrders(query, user) {
    assertOperationsStaff(user, 'xem danh sách đơn Labo');
    return await operationsRepo.listLabOrders(query);
  }

  async function requestLabRework(orderId, payload, user) {
    if (!['DOCTOR', 'ADMIN'].includes(user?.role)) {
      throw new ApiError(403, 'DOCTOR_ROLE_REQUIRED', 'Chỉ Bác sĩ mới được phép yêu cầu làm lại sản phẩm Labo.');
    }
    if (!payload.reason) {
      throw new ApiError(400, 'MISSING_REWORK_REASON', 'Vui lòng cung cấp lý do yêu cầu làm lại (sai khớp cắn, lệch màu sắc, không vừa mẫu hàm).');
    }
    return await operationsRepo.requestLabRework(orderId, payload, user);
  }

  async function approveLabRework(reworkId, payload, user) {
    assertApproverRole(user, 'phê duyệt yêu cầu làm lại Labo và phân bổ chi phí');
    return await operationsRepo.approveLabRework(reworkId, payload || {}, user);
  }

  // Warranties
  async function createWarranty(payload, user) {
    if (!['DOCTOR', 'ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(user?.role)) {
      throw new ApiError(403, 'STAFF_ROLE_REQUIRED', 'Không có quyền cấp thẻ bảo hành.');
    }
    if (!payload.serviceLineId || !payload.patientId || !payload.expiresAt) {
      throw new ApiError(400, 'MISSING_WARRANTY_FIELDS', 'Vui lòng cung cấp Dòng dịch vụ, Bệnh nhân và Ngày hết hạn bảo hành.');
    }
    return await operationsRepo.createWarranty(payload, user);
  }

  async function claimWarranty(warrantyId, payload, user) {
    assertOperationsStaff(user, 'kích hoạt quyền lợi bảo hành');
    return await operationsRepo.claimWarranty(warrantyId, payload || {}, user);
  }

  async function listWarranties(query, user) {
    assertOperationsStaff(user, 'xem danh sách bảo hành');
    return await operationsRepo.listWarranties(query);
  }

  // Incidents
  async function listIncidents(query, user) {
    assertOperationsStaff(user, 'xem báo cáo sự cố');
    return await operationsRepo.listIncidents(query);
  }

  async function resolveIncident(incidentId, payload, user) {
    assertApproverRole(user, 'phê duyệt giải quyết sự cố y khoa/vận hành');
    if (!payload.resolution) {
      throw new ApiError(400, 'MISSING_RESOLUTION', 'Vui lòng cung cấp phương án và kết luận giải quyết sự cố.');
    }
    return await operationsRepo.resolveIncident(incidentId, payload, user);
  }

  return {
    createAsset,
    listAssets,
    createSterilizationCycle,
    completeSterilizationCycle,
    listSterilizationCycles,
    createInstrumentPack,
    releaseInstrumentPack,
    listInstrumentPacks,
    useInstrumentPack,
    createLabOrder,
    updateLabOrder,
    listLabOrders,
    requestLabRework,
    approveLabRework,
    createWarranty,
    claimWarranty,
    listWarranties,
    listIncidents,
    resolveIncident,
  };
}
