import { Router } from 'express';

export function createBillingRoutes({ billingController, authMiddlewares }) {
  const router = Router();
  const { authenticate } = authMiddlewares;

  router.use(authenticate);

  // Cash Shifts
  router.get('/shifts/current', billingController.getCurrentShift);
  router.post('/shifts/open', billingController.openShift);
  router.post('/shifts/:cashShiftId/close', billingController.closeShift);

  // Deposits (AT-15, AT-20)
  router.post('/deposits', billingController.createDeposit);
  router.get('/patients/:patientId/deposits', billingController.getPatientDeposits);
  router.post('/invoices/:invoiceId/apply-deposit', billingController.applyDeposit);

  // Invoices (AT-01, AT-18, AT-20)
  router.post('/visits/:visitId/invoices', billingController.createInvoice);
  router.get('/visits/:visitId/invoices', billingController.getInvoicesByVisit);
  router.get('/invoices/:invoiceId', billingController.getInvoiceById);

  // Payments (AT-01, AT-02, AT-20)
  router.post('/invoices/:invoiceId/pay', billingController.payInvoice);

  // Refunds (Maker-Checker, AT-20)
  router.post('/payments/:paymentTransactionId/refunds', billingController.requestRefund);
  router.post('/refunds/:refundId/approve', billingController.approveRefund);

  // Discounts (Maker-Checker, AT-18)
  router.post('/invoices/:invoiceId/discount-approvals', billingController.requestDiscountApproval);
  router.post('/discount-approvals/:discountApprovalId/approve', billingController.approveDiscount);

  return router;
}
