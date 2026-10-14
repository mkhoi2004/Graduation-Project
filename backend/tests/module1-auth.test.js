import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { env } from '../src/config/load-env.js';
import { createDatabase } from '../src/config/db.js';
import { initUserModels } from '../src/models/user-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createUserService } from '../src/services/user-service.js';
import { createAuthController } from '../src/controllers/auth-controller.js';
import { createUserController } from '../src/controllers/user-controller.js';
import { createAuthRoutes } from '../src/routes/auth-routes.js';
import { createUserRoutes } from '../src/routes/user-routes.js';
import { createApp } from '../src/app.js';

test('Module 1 - Authentication & Authorization Integration Tests', async (t) => {
  const database = createDatabase(env.db);
  const models = initUserModels(database.sequelize);
  const userRepo = createUserRepository({ sequelize: database.sequelize, models });
  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });
  const userService = createUserService({ userRepo });
  const authController = createAuthController({ authService });
  const userController = createUserController({ userService });
  const authRoutes = createAuthRoutes({ authController, authMiddlewares });
  const userRoutes = createUserRoutes({ userController, authMiddlewares });

  const app = createApp({
    config: { ...env, logLevel: 'silent' },
    health: { readiness: async () => ({ statusCode: 200, body: {} }) },
    authRoutes,
    userRoutes,
  });

  t.after(async () => {
    await database.close();
  });

  let adminToken = '';
  let receptionistToken = '';

  await t.test('Admin login succeeds and returns JWT and role details', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin1234@' })
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.user.username, 'admin');
    assert.equal(res.body.data.user.role, 'ADMIN');
    assert.ok(res.body.data.token);
    adminToken = res.body.data.token;
  });

  await t.test('Receptionist login succeeds and returns RECEPTIONIST role', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'receptionist', password: 'Receptionist1234@' })
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.user.role, 'RECEPTIONIST');
    assert.ok(res.body.data.token);
    receptionistToken = res.body.data.token;
  });

  await t.test('Login with wrong password fails with 401 without leaking internal details', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'WrongPassword123@' })
      .expect(401);

    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('Login with nonexistent user fails with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'ghost_user', password: 'Password123@' })
      .expect(401);

    assert.equal(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  await t.test('GET /api/auth/me returns current user profile when authenticated', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.username, 'admin');
    assert.equal(res.body.data.role, 'ADMIN');
  });

  await t.test('GET /api/auth/me rejects request without token with 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .expect(401);

    assert.equal(res.body.error.code, 'MISSING_TOKEN');
  });

  await t.test('Admin can access GET /api/users', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.data.items.length >= 6);
  });

  await t.test('Receptionist is forbidden from accessing GET /api/users with 403', async () => {
    const res = await request(app)
      .get('/api/users')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .expect(403);

    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  await t.test('Admin can view AccessAuditLogs with recorded actions', async () => {
    const res = await request(app)
      .get('/api/users/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.ok(res.body.data.total > 0);
    // Verify audit logs contain DENIED entry from receptionist attempt
    const deniedEntry = res.body.data.items.find(log => log.outcome === 'DENIED');
    assert.ok(deniedEntry, 'Expected at least one DENIED audit log entry');
  });
});
