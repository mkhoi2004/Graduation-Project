import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { createLogger } from './config/logger.js';
import { createHealthRoutes } from './routes/health-routes.js';
import { requestLogger } from './middlewares/request-logger.js';
import { errorHandler } from './middlewares/error-handler.js';

export function createApp({ config, health, authRoutes, userRoutes, catalogRoutes, patientRoutes, visitRoutes, clinicalRoutes, billingRoutes, inventoryRoutes, accountingRoutes, insuranceRoutes, operationsRoutes, hrRoutes }) {
  const app = express();
  app.disable('x-powered-by');
  app.use(requestLogger(createLogger(config.logLevel)));
  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin }));
  app.use(rateLimit({
    windowMs: 60_000,
    limit: 120,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED' } },
  }));
  app.use(express.json({ limit: '128kb' }));

  app.use('/api/health', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  }, createHealthRoutes(health));

  if (authRoutes) app.use('/api/auth', authRoutes);
  if (userRoutes) app.use('/api/users', userRoutes);
  if (catalogRoutes) app.use('/api/catalog', catalogRoutes);
  if (patientRoutes) app.use('/api/patients', patientRoutes);
  if (visitRoutes) app.use('/api/visits', visitRoutes);
  if (clinicalRoutes) app.use('/api', clinicalRoutes);
  if (billingRoutes) app.use('/api/billing', billingRoutes);
  if (inventoryRoutes) app.use('/api/inventory', inventoryRoutes);
  if (accountingRoutes) app.use('/api/accounting', accountingRoutes);
  if (insuranceRoutes) app.use('/api/insurance', insuranceRoutes);
  if (operationsRoutes) app.use('/api/operations', operationsRoutes);
  if (hrRoutes) app.use('/api/hr', hrRoutes);

  app.use((_req, res) => res.status(404).json({ error: { code: 'NOT_FOUND' } }));
  app.use(errorHandler);
  return app;
}
