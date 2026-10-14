import { Router } from 'express';

export function createCatalogRoutes({ catalogController, authMiddlewares }) {
  const router = Router();
  const { authenticate, authorize } = authMiddlewares;

  // Base authentication required for all catalog routes
  router.use(authenticate);

  // READ-ONLY: Accessible by all authenticated staff roles
  router.get('/services', catalogController.getServices);
  router.get('/services/deleted', authorize('ADMIN'), catalogController.getDeletedServices);
  router.get('/services/:id', catalogController.getServiceById);
  router.get('/rooms', catalogController.getRooms);
  router.get('/suppliers', catalogController.getSuppliers);
  router.get('/configs', catalogController.getConfigs);

  // WRITE & DELETE: Admin only
  router.post('/services', authorize('ADMIN'), catalogController.createService);
  router.put('/services/:id', authorize('ADMIN'), catalogController.updateService);
  router.delete('/services/:id', authorize('ADMIN'), catalogController.deleteService);
  router.post('/services/:id/restore', authorize('ADMIN'), catalogController.restoreService);

  // PRICE VERSIONS (AT-16 & AT-21)
  router.post('/services/:id/prices', authorize('ADMIN'), catalogController.createPriceVersion);
  router.post('/services/:id/prices/:versionId/approve', catalogController.approvePriceVersion);

  // ROOMS & SUPPLIERS WRITE: Admin only
  router.post('/rooms', authorize('ADMIN'), catalogController.createRoom);
  router.delete('/rooms/:id', authorize('ADMIN'), catalogController.deleteRoom);
  router.post('/suppliers', authorize('ADMIN'), catalogController.createSupplier);
  router.delete('/suppliers/:id', authorize('ADMIN'), catalogController.deleteSupplier);

  return router;
}
