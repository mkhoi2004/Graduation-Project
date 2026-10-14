import { Router } from 'express';

export function createUserRoutes({ userController, authMiddlewares }) {
  const router = Router();
  const { authenticate, authorize } = authMiddlewares;

  // Base authentication required for all routes
  router.use(authenticate);

  // Metadata routes accessible by authenticated staff
  router.get('/roles', userController.getRoles);
  router.get('/branches', userController.getBranches);

  // Admin-only user management routes
  router.get('/audit-logs', authorize('ADMIN'), userController.getAuditLogs);
  router.get('/deleted', authorize('ADMIN'), userController.getDeletedUsers);
  router.post('/:id/restore', authorize('ADMIN'), userController.restoreUser);

  router.get('/', authorize('ADMIN'), userController.getUsers);
  router.post('/', authorize('ADMIN'), userController.createUser);
  router.get('/:id', authorize('ADMIN'), userController.getUserById);
  router.put('/:id', authorize('ADMIN'), userController.updateUser);
  router.delete('/:id', authorize('ADMIN'), userController.softDeleteUser);

  return router;
}
