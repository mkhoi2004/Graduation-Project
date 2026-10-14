import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { env } from '../src/config/load-env.js';
import { createDatabase } from '../src/config/db.js';
import { initUserModels } from '../src/models/user-models.js';
import { initCatalogModels } from '../src/models/catalog-models.js';
import { initPatientVisitModels } from '../src/models/patient-visit-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createCatalogRepository } from '../src/repositories/catalog-repository.js';
import { createPatientVisitRepository } from '../src/repositories/patient-visit-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createUserService } from '../src/services/user-service.js';
import { createCatalogService } from '../src/services/catalog-service.js';
import { createPatientVisitService } from '../src/services/patient-visit-service.js';
import { createAuthController } from '../src/controllers/auth-controller.js';
import { createUserController } from '../src/controllers/user-controller.js';
import { createCatalogController } from '../src/controllers/catalog-controller.js';
import { createPatientVisitController } from '../src/controllers/patient-visit-controller.js';
import { createAuthRoutes } from '../src/routes/auth-routes.js';
import { createUserRoutes } from '../src/routes/user-routes.js';
import { createCatalogRoutes } from '../src/routes/catalog-routes.js';
import { createPatientRoutes } from '../src/routes/patient-routes.js';
import { createVisitRoutes } from '../src/routes/visit-routes.js';
import { createApp } from '../src/app.js';

test('Modules 3 & 4 - Patients, Appointments, Visits & AT-05/AT-17 Tests', async (t) => {
  const database = createDatabase(env.db);
  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);

  const userRepo = createUserRepository({ sequelize: database.sequelize, models: userModels });
  const catalogRepo = createCatalogRepository({ sequelize: database.sequelize, models: catalogModels });
  const patientVisitRepo = createPatientVisitRepository({ sequelize: database.sequelize, models: patientVisitModels, userModels, catalogModels });

  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });
  const userService = createUserService({ userRepo });
  const catalogService = createCatalogService({ catalogRepo, userRepo });
  const patientVisitService = createPatientVisitService({ patientVisitRepo, userRepo });

  const authController = createAuthController({ authService });
  const userController = createUserController({ userService });
  const catalogController = createCatalogController({ catalogService });
  const patientVisitController = createPatientVisitController({ patientVisitService });

  const authRoutes = createAuthRoutes({ authController, authMiddlewares });
  const userRoutes = createUserRoutes({ userController, authMiddlewares });
  const catalogRoutes = createCatalogRoutes({ catalogController, authMiddlewares });
  const patientRoutes = createPatientRoutes({ patientVisitController, authMiddlewares });
  const visitRoutes = createVisitRoutes({ patientVisitController, authMiddlewares });

  const app = createApp({
    config: { ...env, logLevel: 'silent' },
    health: { readiness: async () => ({ statusCode: 200, body: {} }) },
    authRoutes,
    userRoutes,
    catalogRoutes,
    patientRoutes,
    visitRoutes,
  });

  t.after(async () => {
    await database.close();
  });

  let receptionistToken = '';
  let doctorToken = '';
  let doctorUserId = '';
  let branchId = '';
  let patient1Id = '';
  let patient2Id = '';
  let visitId = '';

  // 1. Get tokens
  const recLogin = await request(app).post('/api/auth/login').send({ username: 'receptionist', password: 'Receptionist1234@' });
  receptionistToken = recLogin.body.data.token;
  branchId = recLogin.body.data.user.branchId;

  const docLogin = await request(app).post('/api/auth/login').send({ username: 'doctor', password: 'Doctor1234@' });
  doctorToken = docLogin.body.data.token;
  doctorUserId = docLogin.body.data.user.userId;

  const sharedPhone = '09' + Math.floor(10000000 + Math.random() * 90000000);

  await t.test('Receptionist can create patient profile 1 with phone', async () => {
    const res = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        fullName: 'Nguyễn Văn A',
        phone: sharedPhone,
        dateOfBirth: '1990-05-15',
        gender: 'MALE',
        allergy: 'Penicillin',
        allergyReaction: 'Phát ban đỏ',
      })
      .expect(201);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.fullName, 'Nguyễn Văn A');
    assert.ok(res.body.data.patientCode);
    patient1Id = res.body.data.patientId;
  });

  await t.test('AT-05: Creating patient 2 with same phone returns warning and requires confirmation', async () => {
    // Attempt without confirmation
    const warnRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        fullName: 'Nguyễn Thị B (Vợ anh A)',
        phone: sharedPhone,
        dateOfBirth: '1992-08-20',
        gender: 'FEMALE',
      })
      .expect(200);

    assert.equal(warnRes.body.status, 'warning');
    assert.equal(warnRes.body.warning, 'PHONE_DUPLICATE_WARNING');
    assert.ok(warnRes.body.requireConfirmation);

    // Now confirm and proceed to create separate profile
    const confirmRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        fullName: 'Nguyễn Thị B (Vợ anh A)',
        phone: sharedPhone,
        dateOfBirth: '1992-08-20',
        gender: 'FEMALE',
        confirmDuplicatePhone: true,
      })
      .expect(201);

    assert.equal(confirmRes.body.status, 'ok');
    assert.notEqual(confirmRes.body.data.patientId, patient1Id);
    assert.notEqual(confirmRes.body.data.patientCode, 'Expected separate patient codes');
    patient2Id = confirmRes.body.data.patientId;
  });

  await t.test('Receptionist can create visit and assign to Doctor', async () => {
    const res = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        patientId: patient1Id,
        branchId,
        doctorId: doctorUserId,
        visitType: 'FIRST_VISIT',
        paymentType: 'SELF_PAY',
      })
      .expect(201);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.status, 'REGISTERED');
    assert.equal(res.body.data.doctorId, doctorUserId);
    visitId = res.body.data.visitId;
  });

  await t.test('AT-17: Doctor can view patient profile when active treatment relationship exists', async () => {
    const res = await request(app)
      .get(`/api/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(200);

    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.data.patientId, patient1Id);
    assert.equal(res.body.data.fullName, 'Nguyễn Văn A');
  });

  await t.test('AT-17: Doctor CANNOT view patient 2 who has NO treatment relationship or assignment', async () => {
    const res = await request(app)
      .get(`/api/patients/${patient2Id}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .expect(403);

    assert.equal(res.body.error.code, 'NO_TREATMENT_RELATIONSHIP');
  });

  await t.test('Doctor can transition visit state to IN_PROGRESS and CLINICAL_COMPLETED', async () => {
    // 1. Move to IN_PROGRESS
    const inProgressRes = await request(app)
      .patch(`/api/visits/${visitId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ newStatus: 'IN_PROGRESS', reason: 'Bắt đầu khám và tư vấn' })
      .expect(200);

    assert.equal(inProgressRes.body.data.status, 'IN_PROGRESS');

    // 2. Move to CLINICAL_COMPLETED
    const completedRes = await request(app)
      .patch(`/api/visits/${visitId}/status`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ newStatus: 'CLINICAL_COMPLETED', reason: 'Hoàn tất thủ thuật cạo vôi răng' })
      .expect(200);

    assert.equal(completedRes.body.data.status, 'CLINICAL_COMPLETED');
  });

  await t.test('Patient with existing visits cannot be deleted (Business rule)', async () => {
    const adminLogin = await request(app).post('/api/auth/login').send({ username: 'admin', password: 'Admin1234@' });
    const adminToken = adminLogin.body.data.token;

    const res = await request(app)
      .delete(`/api/patients/${patient1Id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(409);

    assert.equal(res.body.error.code, 'PATIENT_HAS_VISITS');
  });
});
