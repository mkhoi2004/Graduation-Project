import { Router } from 'express';

export function createOperationsRoutes({ operationsController, authMiddlewares }) {
  const router = Router();
  const { authenticate } = authMiddlewares;

  router.use(authenticate);

  // Assets
  router.get('/assets', operationsController.listAssets);
  router.post('/assets', operationsController.createAsset);

  // Sterilization Cycles
  router.get('/sterilization-cycles', operationsController.listSterilizationCycles);
  router.post('/sterilization-cycles', operationsController.createSterilizationCycle);
  router.post('/sterilization-cycles/:id/complete', operationsController.completeSterilizationCycle);

  // Instrument Packs
  router.get('/packs', operationsController.listInstrumentPacks);
  router.post('/packs', operationsController.createInstrumentPack);
  router.post('/packs/:id/release', operationsController.releaseInstrumentPack);

  // AT-22: Pack Usages
  router.post('/packs/use', operationsController.useInstrumentPack);

  // Lab Orders & Reworks
  router.get('/lab-orders', operationsController.listLabOrders);
  router.post('/lab-orders', operationsController.createLabOrder);
  router.patch('/lab-orders/:id', operationsController.updateLabOrder);
  router.post('/lab-orders/:id/rework', operationsController.requestLabRework);
  router.post('/lab-reworks/:id/approve', operationsController.approveLabRework);

  // Warranties
  router.get('/warranties', operationsController.listWarranties);
  router.post('/warranties', operationsController.createWarranty);
  router.post('/warranties/:id/claim', operationsController.claimWarranty);

  // Incidents
  router.get('/incidents', operationsController.listIncidents);
  router.post('/incidents/:id/resolve', operationsController.resolveIncident);

  return router;
}
