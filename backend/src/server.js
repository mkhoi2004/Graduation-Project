import { env } from './config/load-env.js';
import { createDatabase } from './config/db.js';
import { createLogger } from './config/logger.js';
import { createHealthService } from './services/health-service.js';
import { initUserModels } from './models/user-models.js';
import { initCatalogModels } from './models/catalog-models.js';
import { initPatientVisitModels } from './models/patient-visit-models.js';
import { createUserRepository } from './repositories/user-repository.js';
import { createCatalogRepository } from './repositories/catalog-repository.js';
import { createPatientVisitRepository } from './repositories/patient-visit-repository.js';
import { createAuthMiddlewares } from './middlewares/auth.js';
import { createAuthService } from './services/auth-service.js';
import { createUserService } from './services/user-service.js';
import { createCatalogService } from './services/catalog-service.js';
import { createPatientVisitService } from './services/patient-visit-service.js';
import { createAuthController } from './controllers/auth-controller.js';
import { createUserController } from './controllers/user-controller.js';
import { createCatalogController } from './controllers/catalog-controller.js';
import { createPatientVisitController } from './controllers/patient-visit-controller.js';
import { createAuthRoutes } from './routes/auth-routes.js';
import { createUserRoutes } from './routes/user-routes.js';
import { createCatalogRoutes } from './routes/catalog-routes.js';
import { createPatientRoutes } from './routes/patient-routes.js';
import { createVisitRoutes } from './routes/visit-routes.js';
import { initClinicalModels } from './models/clinical-models.js';
import { createClinicalRepository } from './repositories/clinical-repository.js';
import { createClinicalService } from './services/clinical-service.js';
import { createClinicalController } from './controllers/clinical-controller.js';
import { createClinicalRoutes } from './routes/clinical-routes.js';
import { initBillingModels } from './models/billing-models.js';
import { createBillingRepository } from './repositories/billing-repository.js';
import { createBillingService } from './services/billing-service.js';
import { createBillingController } from './controllers/billing-controller.js';
import { createBillingRoutes } from './routes/billing-routes.js';
import { initInventoryModels } from './models/inventory-models.js';
import { createInventoryRepository } from './repositories/inventory-repository.js';
import { createInventoryService } from './services/inventory-service.js';
import { createInventoryController } from './controllers/inventory-controller.js';
import { createInventoryRoutes } from './routes/inventory-routes.js';
import { initAccountingModels } from './models/accounting-models.js';
import { createAccountingRepository } from './repositories/accounting-repository.js';
import { createAccountingService } from './services/accounting-service.js';
import { createAccountingController } from './controllers/accounting-controller.js';
import { createAccountingRoutes } from './routes/accounting-routes.js';
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

// Module 3 & 4: Patients, Appointments, and Visits
const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);
const patientVisitRepo = createPatientVisitRepository({ sequelize: database.sequelize, models: patientVisitModels, userModels, catalogModels });
const patientVisitService = createPatientVisitService({ patientVisitRepo, userRepo });
const patientVisitController = createPatientVisitController({ patientVisitService });
const patientRoutes = createPatientRoutes({ patientVisitController, authMiddlewares });
const visitRoutes = createVisitRoutes({ patientVisitController, authMiddlewares });

// Module 5: Clinical, EMR, Treatment Plans, Consents & Service Completion
const clinicalModels = initClinicalModels(database.sequelize, userModels, catalogModels, patientVisitModels);
const clinicalRepo = createClinicalRepository({
  sequelize: database.sequelize,
  models: clinicalModels,
  userModels,
  catalogModels,
  patientVisitModels,
});
const clinicalService = createClinicalService({ clinicalRepo, patientVisitRepo, userRepo });
const clinicalController = createClinicalController({ clinicalService });
const clinicalRoutes = createClinicalRoutes({ clinicalController, authMiddlewares });

// Module 6: Patient Billing, Cashier Shifts, Deposits & Receivables
const billingModels = initBillingModels(database.sequelize, userModels, catalogModels, patientVisitModels, clinicalModels);
const billingRepo = createBillingRepository({
  sequelize: database.sequelize,
  models: billingModels,
  userModels,
  catalogModels,
  patientVisitModels,
  clinicalModels,
});
const billingService = createBillingService({ billingRepo, userRepo });
const billingController = createBillingController({ billingService });
const billingRoutes = createBillingRoutes({ billingController, authMiddlewares });

// Module 7: Inventory, Lot Tracking, FEFO, Recall & Serial Implants
const inventoryModels = initInventoryModels(database.sequelize, userModels, patientVisitModels, clinicalModels);
const inventoryRepo = createInventoryRepository({
  sequelize: database.sequelize,
  models: inventoryModels,
  userModels,
  patientVisitModels,
  clinicalModels,
});
const inventoryService = createInventoryService({ inventoryRepo, userRepo });
const inventoryController = createInventoryController({ inventoryService });
const inventoryRoutes = createInventoryRoutes({ inventoryController, authMiddlewares });

// Module 8: Accounting, Cash Reconciliation (AT-09), Accounting Periods & Period Closing (AT-10)
const accountingModels = initAccountingModels(database.sequelize, {
  userModels,
  billingModels,
  catalogModels,
  branchModels: patientVisitModels,
});
const accountingRepo = createAccountingRepository({
  sequelize: database.sequelize,
  models: accountingModels,
  billingModels,
  userModels,
  catalogModels,
});
const accountingService = createAccountingService({ accountingRepo, userRepo });
const accountingController = createAccountingController({ accountingService });
const accountingRoutes = createAccountingRoutes({ accountingController, authMiddlewares });

const app = createApp({
  config: env,
  health: createHealthService(database),
  authRoutes,
  userRoutes,
  catalogRoutes,
  patientRoutes,
  visitRoutes,
  clinicalRoutes,
  billingRoutes,
  inventoryRoutes,
  accountingRoutes,
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
