import { Router } from 'express';

export function createAccountingRoutes({ accountingController, authMiddlewares }) {
  const router = Router();
  const { authenticate } = authMiddlewares;

  router.use(authenticate);

  // Cash Shifts Reconciliation & Discrepancies (AT-09)
  router.post('/shifts/:cashShiftId/reconcile', accountingController.reconcileCashShift);
  router.get('/discrepancies', accountingController.getCashDiscrepancies);
  router.post('/discrepancies/:discrepancyId/resolve', accountingController.resolveCashDiscrepancy);

  // Accounting Periods (AT-10)
  router.get('/periods', accountingController.getAccountingPeriods);
  router.post('/periods', accountingController.createAccountingPeriod);
  router.post('/periods/:periodId/close', accountingController.closeAccountingPeriod);

  // Chart of Accounts
  router.get('/accounts', accountingController.getAccounts);
  router.post('/accounts', accountingController.createAccount);

  // Journal Entries & Double-Entry Bookkeeping
  router.get('/journal-entries', accountingController.getJournalEntries);
  router.post('/journal-entries', accountingController.createJournalEntry);
  router.post('/journal-entries/:journalEntryId/post', accountingController.postJournalEntry);

  return router;
}
