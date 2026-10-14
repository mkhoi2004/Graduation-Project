import { Router } from 'express';

export function createAuthRoutes({ authController, authMiddlewares }) {
  const router = Router();

  router.post('/login', authController.login);
  router.get('/me', authMiddlewares.authenticate, authController.me);
  router.post('/logout', authController.logout);

  return router;
}
