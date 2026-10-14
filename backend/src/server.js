import { env } from './config/load-env.js';
import { createDatabase } from './config/db.js';
import { createLogger } from './config/logger.js';
import { createHealthService } from './services/health-service.js';
import { initUserModels } from './models/user-models.js';
import { initCatalogModels } from './models/catalog-models.js';
import { createUserRepository } from './repositories/user-repository.js';
import { createCatalogRepository } from './repositories/catalog-repository.js';
import { createAuthMiddlewares } from './middlewares/auth.js';
import { createAuthService } from './services/auth-service.js';
import { createUserService } from './services/user-service.js';
import { createCatalogService } from './services/catalog-service.js';
import { createAuthController } from './controllers/auth-controller.js';
import { createUserController } from './controllers/user-controller.js';
import { createCatalogController } from './controllers/catalog-controller.js';
import { createAuthRoutes } from './routes/auth-routes.js';
import { createUserRoutes } from './routes/user-routes.js';
import { createCatalogRoutes } from './routes/catalog-routes.js';
import { createApp } from './app.js';

const logger = createLogger(env.logLevel);
const database = createDatabase(env.db);

// Module 1: Users, Auth, and Access Audit Logs
const userModels = initUserModels(database.sequelize);
const userRepo = createUserRepository({ sequelize: database.sequelize, models: userModels });
const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });
const userService = createUserService({ userRepo });
const authController = createAuthController({ authService });
const userController = createUserController({ userService });
const authRoutes = createAuthRoutes({ authController, authMiddlewares });
const userRoutes = createUserRoutes({ userController, authMiddlewares });

// Module 2: Catalog & Versioned Configurations
const catalogModels = initCatalogModels(database.sequelize, userModels);
const catalogRepo = createCatalogRepository({ sequelize: database.sequelize, models: catalogModels });
const catalogService = createCatalogService({ catalogRepo, userRepo });
const catalogController = createCatalogController({ catalogService });
const catalogRoutes = createCatalogRoutes({ catalogController, authMiddlewares });

const app = createApp({
  config: env,
  health: createHealthService(database),
  authRoutes,
  userRoutes,
  catalogRoutes,
});

const server = app.listen(env.port, '127.0.0.1', () => {
  logger.info({ port: env.port }, 'Local API started; database status available at /api/health/ready');
});

server.on('error', () => {
  logger.error('Cannot start API. Check PORT is available.');
  process.exitCode = 1;
});

let stopping = false;
async function shutdown() {
  if (stopping) return;
  stopping = true;
  const timer = setTimeout(() => process.exit(1), 10000).unref();
  server.close(async () => {
    await database.close();
    clearTimeout(timer);
  });
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
