import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { env } from '../src/config/load-env.js';
import { createDatabase } from '../src/config/db.js';
import { initUserModels } from '../src/models/user-models.js';
import { initCatalogModels } from '../src/models/catalog-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createCatalogRepository } from '../src/repositories/catalog-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createUserService } from '../src/services/user-service.js';
import { createCatalogService } from '../src/services/catalog-service.js';
import { createAuthController } from '../src/controllers/auth-controller.js';
import { createUserController } from '../src/controllers/user-controller.js';
import { createCatalogController } from '../src/controllers/catalog-controller.js';
import { createAuthRoutes } from '../src/routes/auth-routes.js';
import { createUserRoutes } from '../src/routes/user-routes.js';
import { createCatalogRoutes } from '../src/routes/catalog-routes.js';
import { createApp } from '../src/app.js';

test('Module 2 - Catalog & Versioned Configuration Integration Tests', async (t) => {
  const database = createDatabase(env.db);
  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const userRepo = createUserRepository({ sequelize: database.sequelize, models: userModels });
  const catalogRepo = createCatalogRepository({ sequelize: database.sequelize, models: catalogModels });

  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });
  const userService = createUserService({ userRepo });
  const catalogService = createCatalogService({ catalogRepo, userRepo });

  const authController = createAuthController({ authService });
  const userController = createUserController({ userService });
  const catalogController = createCatalogController({ catalogService });

  const authRoutes = createAuthRoutes({ authController, authMiddlewares });
  const userRoutes = createUserRoutes({ userController, authMiddlewares });
  const catalogRoutes = createCatalogRoutes({ catalogController, authMiddlewares });

  const app = createApp({
    config: { ...env, logLevel: 'silent' },
    health: { readiness: async () => ({ statusCode: 200, body: {} }) },
    authRoutes,
    userRoutes,
    catalogRoutes,
  });

  t.after(async () => {
    await database.close();
  });

  let adminToken = '';
  let receptionistToken = '';
  let approverToken = '';

  // Prepare tokens
  const adminLogin = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'Admin1234@' });
  adminToken = adminLogin.body.data.token;

  const recLogin = await request(app).post('/api/auth/login').send({ username: 'receptionist', password: 'Receptionist1234@' });
  receptionistToken = recLogin.body.data.token;

  const appLogin = await request(app).post('/api/auth/login').send({ username: 'approver', password: 'Approver1234@' });
  approverToken = appLogin.body.data.token;

  let createdServiceId = '';
  let draftPriceVersionId = '';

  await t.test('Receptionist can read services and see current active prices', async () => {
    const res = await request(app)
      .get('/api/catalog/services')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.data.items.length >= 2, 'Expected at least seeded services');
    const examService = res.body.data.items.find(s => s.code === 'EXAM');
    assert.ok(examService, 'Expected EXAM service to be present');
    assert.equal(examService.currentPrice, '100000.00');
  });

  await t.test('Receptionist is forbidden from creating new services with 403', async () => {
    const res = await request(app)
      .post('/api/catalog/services')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({ code: 'TEST_SVC', name: 'Dịch vụ thử nghiệm' })
      .expect(403);

    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('Admin can create a new service with initial price version', async () => {
    const testCode = 'NHAKHOA_TEST_' + Date.now().toString().slice(-6);
    const res = await request(app)
      .post('/api/catalog/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        code: testCode,
        name: 'Dịch vụ Kiểm thử Tự động',
        requiresConsent: true,
        requiresSterilePack: true,
        initialPrice: '350000.00',
        effectiveFrom: '2026-01-01T00:00:00Z',
      })
      .expect(201);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.code, testCode);
    assert.equal(res.body.data.requiresConsent, true);
    createdServiceId = res.body.data.serviceId;
    assert.ok(res.body.data.priceVersions.length > 0);
    draftPriceVersionId = res.body.data.priceVersions[0].priceVersionId;
  });

  await t.test('Approver can approve a draft price version (Maker-Checker)', async () => {
    const res = await request(app)
      .post(`/api/catalog/services/${createdServiceId}/prices/${draftPriceVersionId}/approve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.status, 'APPROVED');
  });

  await t.test('AT-21: Overlapping price versions cannot be approved simultaneously', async () => {
    // Create another price version with overlapping effective period
    const versionRes = await request(app)
      .post(`/api/catalog/services/${createdServiceId}/prices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        unitPrice: '400000.00',
        effectiveFrom: '2026-06-01T00:00:00Z', // Overlaps with open-ended previous price
      })
      .expect(201);

    const secondVersionId = versionRes.body.data.priceVersionId;

    // Trying to approve this second version while the first is open-ended must fail with 409
    const approveRes = await request(app)
      .post(`/api/catalog/services/${createdServiceId}/prices/${secondVersionId}/approve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .expect(409);

    assert.equal(approveRes.body.error.code, 'PRICE_VERSION_OVERLAP');
  });

  await t.test('Admin can soft-delete a service and archive it into Services_Deleted', async () => {
    const res = await request(app)
      .delete(`/api/catalog/services/${createdServiceId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.equal(res.body.status, 'ok');

    // Verify service is now in deleted archives
    const deletedRes = await request(app)
      .get('/api/catalog/services/deleted')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const archived = deletedRes.body.data.find(s => s.ServiceId === createdServiceId);
    assert.ok(archived, 'Expected service to appear in Services_Deleted');
    assert.equal(archived.DeletedBy, 'admin');
  });

  await t.test('Admin can restore a soft-deleted service', async () => {
    const res = await request(app)
      .post(`/api/catalog/services/${createdServiceId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.serviceId, createdServiceId);
  });

  await t.test('Authenticated staff can view system configuration versions', async () => {
    const res = await request(app)
      .get('/api/catalog/configs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.data.length >= 2, 'Expected seeded system configs');
  });
});
