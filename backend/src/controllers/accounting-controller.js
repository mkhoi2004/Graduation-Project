export function createAccountingController({ accountingService }) {
  // Cash Shift Reconciliation (AT-09)
  async function reconcileCashShift(req, res, next) {
    try {
      const { cashShiftId } = req.params;
      const data = await accountingService.reconcileCashShift(cashShiftId, req.body, req.user);
      res.json({
        success: true,
        message: data.hasDiscrepancy
          ? 'Đã ghi nhận kiểm đếm và phát hiện chênh lệch tiền mặt ca thu ngân (AT-09).'
          : 'Đối soát ca thu ngân khớp hoàn toàn với hệ thống.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async function getCashDiscrepancies(req, res, next) {
    try {
      const data = await accountingService.getCashDiscrepancies(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function resolveCashDiscrepancy(req, res, next) {
    try {
      const { discrepancyId } = req.params;
      const data = await accountingService.resolveCashDiscrepancy(discrepancyId, req.body, req.user);
      res.json({
        success: true,
        message: 'Đã phê duyệt xử lý chênh lệch tiền mặt ca thu ngân thành công (Maker-Checker AT-09).',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  // Accounting Periods (AT-10)
  async function getAccountingPeriods(req, res, next) {
    try {
      const data = await accountingService.getAccountingPeriods(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function createAccountingPeriod(req, res, next) {
    try {
      const data = await accountingService.createAccountingPeriod(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Khởi tạo kỳ kế toán thành công.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async function closeAccountingPeriod(req, res, next) {
    try {
      const { periodId } = req.params;
      const data = await accountingService.closeAccountingPeriod(periodId, req.user);
      res.json({
        success: true,
        message: 'Đã khóa sổ kỳ kế toán thành công (AT-10).',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  // Chart of Accounts
  async function getAccounts(req, res, next) {
    try {
      const data = await accountingService.getAccounts(req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
  }

  async function createAccount(req, res, next) {
    try {
      const data = await accountingService.createAccount(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Tạo tài khoản kế toán thành công.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  // Journal Entries
  async function createJournalEntry(req, res, next) {
    try {
      const data = await accountingService.createJournalEntry(req.body, req.user);
      res.status(201).json({
        success: true,
        message: 'Tạo bút toán sổ cái thành công.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async function postJournalEntry(req, res, next) {
    try {
      const { journalEntryId } = req.params;
      const data = await accountingService.postJournalEntry(journalEntryId, req.user);
      res.json({
        success: true,
        message: 'Đã phê duyệt và ghi sổ bút toán kế toán thành công.',
        data,
      });
    } catch (err) {
      next(err);
    }
  }

  async function getJournalEntries(req, res, next) {
    try {
      const data = await accountingService.getJournalEntries(req.query, req.user);
      res.json({ success: true, data });
    } catch (err) {
      next(err);
    }
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
