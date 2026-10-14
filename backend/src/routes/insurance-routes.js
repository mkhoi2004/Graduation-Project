import { Router } from 'express';

export function createInsuranceRoutes({ insuranceController, authMiddlewares }) {
  const router = Router();
  const { authenticate } = authMiddlewares;

  router.use(authenticate);

  // Contracts
  router.get('/contracts', insuranceController.listContracts);
  router.get('/contracts/:id', insuranceController.getContractById);
  router.post('/contracts', insuranceController.createContract);

  // Claims
  router.get('/claims', insuranceController.listClaims);
  router.get('/claims/:id', insuranceController.getClaimById);
  router.post('/claims', insuranceController.createClaim);

  // Submission & Antireplay (AT-14)
  router.post('/claims/:id/submit', insuranceController.submitClaim);

  // Adjudication (AT-03, AT-04, AT-14)
  router.post('/claims/:id/adjudicate', insuranceController.adjudicateClaim);

  // Payment Recording & Reconciliation (AT-03, AT-14)
  router.post('/payments', insuranceController.recordPayment);

  // Dispute Resolution (AT-04, AT-14)
  router.post('/disputes/:id/resolve', insuranceController.resolveDispute);

  return router;
}
