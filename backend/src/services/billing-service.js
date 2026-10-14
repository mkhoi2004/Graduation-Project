import { ApiError } from '../utils/api-error.js';

export function createBillingService({ billingRepo, userRepo }) {
  function assertCashierRole(user, actionName = 'thực hiện giao dịch thu ngân') {
    const cashierRoles = ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'];
    if (!cashierRoles.includes(user.role)) {
      throw new ApiError(403, 'CASHIER_ROLE_REQUIRED', `Chỉ thu ngân hoặc quản trị viên mới được phép ${actionName}.`);
    }
  }

  function assertApproverRole(user, actionName = 'phê duyệt chứng từ tài chính') {
    if (!user.isApprover && user.role !== 'ADMIN') {
      throw new ApiError(403, 'APPROVER_ROLE_REQUIRED', `Bạn không có quyền phê duyệt (Cần quyền IsApprover hoặc ADMIN để ${actionName}).`);
    }
  }

  // --- Shifts ---
  async function getCurrentShift(user) {
    return billingRepo.getCurrentShift(user.userId);
  }

  async function openShift(payload, user) {
    assertCashierRole(user, 'mở ca làm việc');
    const branchId = payload.branchId || user.branchId;
    if (!branchId) {
      throw new ApiError(400, 'BRANCH_REQUIRED', 'Chi nhánh làm việc là bắt buộc khi mở ca.');
    }
    return billingRepo.openShift({ ...payload, branchId }, user);
  }

  async function closeShift(cashShiftId, payload, user) {
    assertCashierRole(user, 'kết ca làm việc');
    return billingRepo.closeShift(cashShiftId, payload, user);
  }

  // --- Deposits (AT-15, AT-20) ---
  async function createDeposit(payload, user) {
    assertCashierRole(user, 'thu tiền cọc / tạm ứng');
    return billingRepo.createDeposit(payload, user);
  }

  async function getPatientDeposits(patientId, user) {
    return billingRepo.getPatientDeposits(patientId);
  }

  async function applyDeposit(invoiceId, depositId, amount, user) {
    assertCashierRole(user, 'cấn trừ tiền cọc vào hóa đơn');
    return billingRepo.applyDeposit(invoiceId, depositId, amount, user);
  }

  // --- Invoices (AT-01, AT-18, AT-20) ---
  async function createInvoice(visitId, payload, user) {
    assertCashierRole(user, 'xuất hóa đơn');
    return billingRepo.createInvoiceFromCompletedServices(visitId, payload, user);
  }

  async function getInvoicesByVisit(visitId, user) {
    return billingRepo.getInvoicesByVisit(visitId);
  }

  async function getInvoiceById(invoiceId, user) {
    const invoice = await billingRepo.getInvoiceById(invoiceId);
    if (!invoice) {
      throw new ApiError(404, 'INVOICE_NOT_FOUND', 'Không tìm thấy hóa đơn.');
    }
    return invoice;
  }

  // --- Payments (AT-01, AT-02, AT-20) ---
  async function payInvoice(invoiceId, payload, user) {
    assertCashierRole(user, 'thanh toán hóa đơn');
    return billingRepo.payInvoice(invoiceId, payload, user);
  }

  // --- Refunds (Maker-Checker, AT-20) ---
  async function requestRefund(transactionId, payload, user) {
    assertCashierRole(user, 'yêu cầu hoàn tiền');
    return billingRepo.requestRefund(transactionId, payload, user);
  }

  async function approveRefund(refundId, user) {
    assertApproverRole(user, 'phê duyệt hoàn tiền');
    return billingRepo.approveRefund(refundId, user);
  }

  // --- Discounts (Maker-Checker, AT-18) ---
  async function requestDiscountApproval(invoiceId, payload, user) {
    assertCashierRole(user, 'đề xuất giảm giá');
    return billingRepo.requestDiscountApproval(invoiceId, payload, user);
  }

  async function approveDiscount(discountApprovalId, user) {
    assertApproverRole(user, 'phê duyệt giảm giá');
    return billingRepo.approveDiscount(discountApprovalId, user);
  }

  return {
    getCurrentShift,
    openShift,
    closeShift,
    createDeposit,
    getPatientDeposits,
    applyDeposit,
    createInvoice,
    getInvoicesByVisit,
    getInvoiceById,
    payInvoice,
    requestRefund,
    approveRefund,
    requestDiscountApproval,
    approveDiscount,
  };
}
