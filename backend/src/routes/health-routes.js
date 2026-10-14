import { Router } from 'express';
import { createHealthController } from '../controllers/health-controller.js';

export function createHealthRoutes(health) {
  const router = Router();
  const controller = createHealthController(health);
  router.get('/', controller.live);
  router.get('/ready', controller.ready);
  return router;
}
