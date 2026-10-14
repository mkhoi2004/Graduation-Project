import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { ApiError } from '../utils/api-error.js';
import { setSessionUser } from '../utils/session-context.js';

export function createAccountingRepository({
  sequelize,
  models,
  billingModels,
  userModels,
  catalogModels,
}) {
  const {
    CashCount,
    CashDiscrepancy,
    AccountingPeriod,
    Account,
    JournalEntry,
    JournalLine,
  } = models;

  const { CashShift } = billingModels;
  const { User } = userModels;
  const { AccountingRuleVersion } = catalogModels;

  // --- AT-09: Cash Counts & Discrepancies Reconciliation ---
  async function reconcileCashShift(cashShiftId, payload, user) {
    const { counts = [], actualAmount = null, reason = null } = payload;

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const shift = await CashShift.findByPk(cashShiftId, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!shift) {
        throw new ApiError(404, 'SHIFT_NOT_FOUND', 'Không tìm thấy ca thu ngân.');
      }

      // Calculate expected closing amount from shift data
      const expectedAmount = Number(shift.closingFloat || shift.openingFloat || 0);

      let countedTotal = 0;
      if (counts.length > 0) {
        // Delete previous counts for this shift if re-counting
        await CashCount.destroy({ where: { cashShiftId }, transaction: t });

        for (const item of counts) {
          const denom = Number(item.denomination);
          const qty = Number(item.quantity);
          if (denom > 0 && qty >= 0) {
            countedTotal += denom * qty;
            await CashCount.create({
              cashShiftId,
              denomination: denom,
              quantity: qty,
              createdAt: new Date(),
              createdBy: user.username,
            }, { transaction: t });
          }
        }
      } else if (actualAmount !== null) {
        countedTotal = Number(actualAmount);
      } else {
        throw new ApiError(400, 'INVALID_RECONCILIATION_DATA', 'Vui lòng cung cấp chi tiết kiểm đếm từng mệnh giá hoặc số tiền thực đếm.');
      }

      const discrepancyAmount = countedTotal - expectedAmount;
      let discrepancyRecord = null;

      // AT-09: If discrepancy detected, mandatory record creation & explanation
      if (discrepancyAmount !== 0) {
        if (!reason || reason.trim() === '') {
          throw new ApiError(400, 'DISCREPANCY_REASON_REQUIRED', `Phát hiện chênh lệch tiền mặt (${discrepancyAmount > 0 ? '+' : ''}${discrepancyAmount.toLocaleString()} đ) giữa thực tế kiểm đếm và hệ thống. Bắt buộc nhập lý do giải trình (AT-09).`);
        }

        discrepancyRecord = await CashDiscrepancy.create({
          cashShiftId,
          amount: discrepancyAmount,
          reason,
          status: 'PENDING',
          createdAt: new Date(),
          createdBy: user.username,
        }, { transaction: t });
      }

      return {
        cashShiftId,
        expectedAmount,
        countedAmount: countedTotal,
        discrepancyAmount,
        hasDiscrepancy: discrepancyAmount !== 0,
        discrepancy: discrepancyRecord,
      };
    });
  }

  async function getCashDiscrepancies(filter = {}) {
    const where = {};
    if (filter.status) where.status = filter.status;
    if (filter.cashShiftId) where.cashShiftId = filter.cashShiftId;

    return CashDiscrepancy.findAll({
      where,
      include: [
        { model: CashShift, as: 'cashShift' },
        { model: User, as: 'approver', attributes: ['userId', 'username', 'displayName'] },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  async function resolveCashDiscrepancy(discrepancyId, payload, user) {
    const { status = 'APPROVED', resolutionNote } = payload;

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const record = await CashDiscrepancy.findByPk(discrepancyId, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!record) {
        throw new ApiError(404, 'DISCREPANCY_NOT_FOUND', 'Không tìm thấy bản ghi chênh lệch tiền mặt.');
      }

      if (record.status !== 'PENDING') {
        throw new ApiError(409, 'DISCREPANCY_ALREADY_RESOLVED', `Bản ghi chênh lệch này đã được xử lý trước đó (Trạng thái: ${record.status}).`);
      }

      // Maker-Checker: Creator cannot approve their own discrepancy
      if (record.createdBy === user.username) {
        throw new ApiError(403, 'MAKER_CANNOT_APPROVE', 'Người lập biên bản chênh lệch ca thu ngân không được phép tự phê duyệt phân xử (Maker-Checker AT-09).');
      }

      await record.update({
        status,
        approvedBy: user.userId,
        resolvedAt: new Date(),
        reason: resolutionNote ? `${record.reason} | Phê duyệt: ${resolutionNote}` : record.reason,
      }, { transaction: t });

      return record;
    });
  }

  // --- AT-10: Accounting Periods & Period Closing Enforcement ---
  async function getAccountingPeriods() {
    return AccountingPeriod.findAll({
      include: [
        { model: User, as: 'closer', attributes: ['userId', 'username', 'displayName'] },
      ],
      order: [['startsOn', 'DESC']],
    });
  }

  async function createAccountingPeriod(payload, user) {
    const { code, startsOn, endsOn } = payload;

    const existing = await AccountingPeriod.findOne({ where: { code } });
    if (existing) {
      throw new ApiError(409, 'PERIOD_CODE_EXISTS', `Kỳ kế toán với mã (${code}) đã tồn tại.`);
    }

    return AccountingPeriod.create({
      code,
      startsOn,
      endsOn,
      status: 'OPEN',
      createdAt: new Date(),
      createdBy: user.username,
    });
  }

  async function closeAccountingPeriod(periodId, user) {
    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const period = await AccountingPeriod.findByPk(periodId, {
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!period) {
        throw new ApiError(404, 'PERIOD_NOT_FOUND', 'Không tìm thấy kỳ kế toán.');
      }

      if (period.status === 'CLOSED') {
        throw new ApiError(409, 'PERIOD_ALREADY_CLOSED', 'Kỳ kế toán này đã được khóa sổ trước đó.');
      }

      await period.update({
        status: 'CLOSED',
        closedBy: user.userId,
        closedAt: new Date(),
      }, { transaction: t });

      return period;
    });
  }

  // AT-10: Strict validation that the target posting date belongs to an OPEN accounting period
  async function assertPeriodOpen(targetDate) {
    const dateStr = targetDate instanceof Date ? targetDate.toISOString().split('T')[0] : targetDate;

    const period = await AccountingPeriod.findOne({
      where: {
        startsOn: { [Op.lte]: dateStr },
        endsOn: { [Op.gte]: dateStr },
      },
    });

    if (period && period.status === 'CLOSED') {
      throw new ApiError(400, 'PERIOD_ALREADY_CLOSED_CANNOT_POST', `Ngày hạch toán (${dateStr}) thuộc Kỳ kế toán đã khóa sổ (${period.code}). Chặn tuyệt đối hành vi ghi lùi ngày hoặc sửa đổi chứng từ đã khóa (AT-10).`);
    }

    return period;
  }

  // --- Chart of Accounts (COA) ---
  async function getAccounts() {
    return Account.findAll({
      order: [['code', 'ASC']],
    });
  }

  async function createAccount(payload, user) {
    const { code, name, accountType, parentAccountId = null } = payload;
    return Account.create({
      code,
      name,
      accountType,
      parentAccountId,
      isActive: true,
      createdAt: new Date(),
      createdBy: user.username,
    });
  }

  // --- Double-Entry Journal Entries & Lines ---
  async function createJournalEntry(payload, user) {
    const {
      entryNo,
      sourceEventId = crypto.randomUUID(),
      sourceDocumentId = null,
      accountingRuleVersionId,
      eventType = 'MANUAL_ENTRY',
      accountingPeriodId,
      branchId,
      currency = 'VND',
      documentDate,
      postingDate,
      lines = [],
    } = payload;

    // AT-10: Check posting date period
    await assertPeriodOpen(postingDate || documentDate);

    // Validate lines exist and amounts are valid
    if (!lines || lines.length === 0) {
      throw new ApiError(400, 'EMPTY_JOURNAL_LINES', 'Bút toán kế toán bắt buộc phải có ít nhất 2 dòng hạch toán.');
    }

    let totalDebit = 0;
    let totalCredit = 0;
    for (const l of lines) {
      const d = Number(l.debit || 0);
      const c = Number(l.credit || 0);
      totalDebit += d;
      totalCredit += c;
    }

    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const entry = await JournalEntry.create({
        entryNo: entryNo || 'PKT-' + Math.floor(100000 + Math.random() * 900000),
        sourceEventId,
        sourceDocumentId,
        accountingRuleVersionId,
        eventType,
        accountingPeriodId,
        branchId,
        currency,
        documentDate,
        postingDate,
        status: 'DRAFT',
        createdByUserId: user.userId,
        createdAt: new Date(),
      }, { transaction: t });

      let lineNo = 1;
      for (const line of lines) {
        await JournalLine.create({
          journalEntryId: entry.journalEntryId,
          lineNo: lineNo++,
          accountId: line.accountId,
          debit: Number(line.debit || 0),
          credit: Number(line.credit || 0),
          description: line.description || '',
        }, { transaction: t });
      }

      return {
        entry,
        totalDebit,
        totalCredit,
        isBalanced: Math.abs(totalDebit - totalCredit) < 0.001,
      };
    });
  }

  async function postJournalEntry(journalEntryId, user) {
    return sequelize.transaction(async (t) => {
      await setSessionUser(sequelize, t, user.username);

      const entry = await JournalEntry.findByPk(journalEntryId, {
        include: [{ model: JournalLine, as: 'lines' }],
        lock: t.LOCK.UPDATE,
        transaction: t,
      });

      if (!entry) {
        throw new ApiError(404, 'ENTRY_NOT_FOUND', 'Không tìm thấy bút toán.');
      }

      if (entry.status === 'POSTED') {
        throw new ApiError(409, 'ENTRY_ALREADY_POSTED', 'Bút toán này đã được ghi sổ.');
      }

      // Maker-Checker: Enforced by CSDL constraint CK_JournalEntries_MakerChecker
      if (entry.createdByUserId === user.userId) {
        throw new ApiError(403, 'MAKER_CANNOT_APPROVE', 'Người tạo bút toán không được phép tự phê duyệt ghi sổ (Maker-Checker CSDL).');
      }

      // AT-10: Check period still open
      await assertPeriodOpen(entry.postingDate);

      // Trigger TR_JournalEntries_PostBalanced will verify SUM(Debit) == SUM(Credit)
      await entry.update({
        status: 'POSTED',
        approvedBy: user.userId,
        postedAt: new Date(),
      }, { transaction: t });

      return entry;
    });
  }

  async function getJournalEntries(filter = {}) {
    const where = {};
    if (filter.status) where.status = filter.status;
    if (filter.accountingPeriodId) where.accountingPeriodId = filter.accountingPeriodId;

    return JournalEntry.findAll({
      where,
      include: [
        { model: AccountingPeriod, as: 'period' },
        { model: JournalLine, as: 'lines', include: [{ model: Account, as: 'account' }] },
        { model: User, as: 'creator', attributes: ['userId', 'username', 'displayName'] },
        { model: User, as: 'approver', attributes: ['userId', 'username', 'displayName'] },
      ],
      order: [['postingDate', 'DESC'], ['entryNo', 'DESC']],
    });
  }

  return {
    reconcileCashShift,
    getCashDiscrepancies,
    resolveCashDiscrepancy,
    getAccountingPeriods,
    createAccountingPeriod,
    closeAccountingPeriod,
    assertPeriodOpen,
    getAccounts,
    createAccount,
    createJournalEntry,
    postJournalEntry,
    getJournalEntries,
  };
}
