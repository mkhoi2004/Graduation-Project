import { ApiError } from '../utils/api-error.js';

export function createAccountingService({ accountingRepo, userRepo }) {
  function assertApproverRole(user, actionName = 'phê duyệt chứng từ kế toán') {
    if (user.role === 'ADMIN') return;
    if (user.isApprover) return;
    throw new ApiError(403, 'APPROVER_ROLE_REQUIRED', `Bạn không có quyền ${actionName}. Cần quyền Quản trị viên hoặc Kế toán trưởng có cờ Duyệt (IsApprover).`);
  }

  function assertAccountingStaff(user, actionName = 'thực hiện nghiệp vụ kế toán') {
    if (['ADMIN', 'ACCOUNTANT', 'RECEPTIONIST'].includes(user.role)) return;
    throw new ApiError(403, 'ACCOUNTING_ROLE_REQUIRED', `Chỉ Kế toán, Thu ngân hoặc Quản trị viên mới được phép ${actionName}.`);
  }

  // --- AT-09: Cash Shift Reconciliation ---
  async function reconcileCashShift(cashShiftId, payload, user) {
    assertAccountingStaff(user, 'đối soát kiểm đếm ca thu ngân');
    return accountingRepo.reconcileCashShift(cashShiftId, payload, user);
  }

  async function getCashDiscrepancies(filter, user) {
    assertAccountingStaff(user, 'xem danh sách chênh lệch tiền');
    return accountingRepo.getCashDiscrepancies(filter);
  }

  async function resolveCashDiscrepancy(discrepancyId, payload, user) {
    assertApproverRole(user, 'phê duyệt xử lý chênh lệch tiền mặt ca thu ngân (Maker-Checker AT-09)');
    return accountingRepo.resolveCashDiscrepancy(discrepancyId, payload, user);
  }

  // --- AT-10: Accounting Periods ---
  async function getAccountingPeriods(user) {
    return accountingRepo.getAccountingPeriods();
  }

  async function createAccountingPeriod(payload, user) {
    assertApproverRole(user, 'khởi tạo kỳ kế toán mới');
    return accountingRepo.createAccountingPeriod(payload, user);
  }

  async function closeAccountingPeriod(periodId, user) {
    assertApproverRole(user, 'khóa sổ kỳ kế toán (AT-10)');
    return accountingRepo.closeAccountingPeriod(periodId, user);
  }

  // --- Chart of Accounts ---
  async function getAccounts(user) {
    return accountingRepo.getAccounts();
  }

  async function createAccount(payload, user) {
    assertApproverRole(user, 'tạo tài khoản trong hệ thống tài khoản kế toán');
    return accountingRepo.createAccount(payload, user);
  }

  // --- Journal Entries ---
  async function createJournalEntry(payload, user) {
    assertAccountingStaff(user, 'lập bút toán sổ cái');
    return accountingRepo.createJournalEntry(payload, user);
  }

  async function postJournalEntry(journalEntryId, user) {
    assertApproverRole(user, 'phê duyệt ghi sổ bút toán kế toán (Maker-Checker)');
    return accountingRepo.postJournalEntry(journalEntryId, user);
  }

  async function getJournalEntries(filter, user) {
    assertAccountingStaff(user, 'xem sổ nhật ký chung kế toán');
    return accountingRepo.getJournalEntries(filter);
  }

  return {
    reconcileCashShift,
    getCashDiscrepancies,
    resolveCashDiscrepancy,
    getAccountingPeriods,
    createAccountingPeriod,
    closeAccountingPeriod,
    getAccounts,
    createAccount,
    createJournalEntry,
    postJournalEntry,
    getJournalEntries,
  };
}
