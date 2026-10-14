import { Router } from 'express';

export function createClinicalRoutes({ clinicalController, authMiddlewares }) {
  const router = Router();
  const { authenticate } = authMiddlewares;

  router.use(authenticate);

  // Global / non-visit scoped routes
  router.get('/consent-templates', clinicalController.getConsentTemplates);
  router.post('/consent-templates', clinicalController.createConsentTemplate);
  router.get('/sign-queue', clinicalController.getSignQueue);
  router.post('/sign-queue/:queueId/retry', clinicalController.processSignQueueItem);

  // Visit scoped clinical routes
  router.get('/visits/:visitId/emr', clinicalController.getEmr);
  router.put('/visits/:visitId/emr/:emrVersionId', clinicalController.updateDraftEmr);
  router.post('/visits/:visitId/emr/:emrVersionId/sign', clinicalController.signEmr);
  router.post('/visits/:visitId/emr/:emrVersionId/addenda', clinicalController.createEmrAddendum);

  router.get('/visits/:visitId/treatment-plans', clinicalController.getTreatmentPlans);
  router.post('/visits/:visitId/treatment-plans', clinicalController.createTreatmentPlan);
  router.patch('/visits/:visitId/treatment-plans/:planId/status', clinicalController.updateTreatmentPlanStatus);

  router.get('/visits/:visitId/consents', clinicalController.getConsents);
  router.post('/visits/:visitId/consents', clinicalController.createConsent);
  router.post('/visits/:visitId/consents/:consentId/sign', clinicalController.signConsent);
  router.post('/visits/:visitId/consents/:consentId/revoke', clinicalController.revokeConsent);

  router.get('/visits/:visitId/prescriptions', clinicalController.getPrescriptions);
  router.post('/visits/:visitId/prescriptions', clinicalController.createPrescription);
  router.post('/visits/:visitId/prescriptions/:prescriptionId/sign', clinicalController.signPrescription);

  router.get('/visits/:visitId/orders', clinicalController.getClinicalOrders);
  router.post('/visits/:visitId/orders', clinicalController.createClinicalOrder);
  router.patch('/visits/:visitId/orders/:orderId/status', clinicalController.updateOrderStatus);

  router.get('/visits/:visitId/services', clinicalController.getServiceLines);
  router.post('/visits/:visitId/services', clinicalController.addServiceLine);
  router.post('/visits/:visitId/services/:serviceLineId/complete', clinicalController.completeServiceLine);

  return router;
}
