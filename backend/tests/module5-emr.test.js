import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { env } from '../src/config/load-env.js';
import { createDatabase } from '../src/config/db.js';
import { initUserModels } from '../src/models/user-models.js';
import { initCatalogModels } from '../src/models/catalog-models.js';
import { initPatientVisitModels } from '../src/models/patient-visit-models.js';
import { initClinicalModels } from '../src/models/clinical-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createCatalogRepository } from '../src/repositories/catalog-repository.js';
import { createPatientVisitRepository } from '../src/repositories/patient-visit-repository.js';
import { createClinicalRepository } from '../src/repositories/clinical-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createUserService } from '../src/services/user-service.js';
import { createCatalogService } from '../src/services/catalog-service.js';
import { createPatientVisitService } from '../src/services/patient-visit-service.js';
import { createClinicalService } from '../src/services/clinical-service.js';
import { createAuthController } from '../src/controllers/auth-controller.js';
import { createUserController } from '../src/controllers/user-controller.js';
import { createCatalogController } from '../src/controllers/catalog-controller.js';
import { createPatientVisitController } from '../src/controllers/patient-visit-controller.js';
import { createClinicalController } from '../src/controllers/clinical-controller.js';
import { createAuthRoutes } from '../src/routes/auth-routes.js';
import { createUserRoutes } from '../src/routes/user-routes.js';
import { createCatalogRoutes } from '../src/routes/catalog-routes.js';
import { createPatientRoutes } from '../src/routes/patient-routes.js';
import { createVisitRoutes } from '../src/routes/visit-routes.js';
import { createClinicalRoutes } from '../src/routes/clinical-routes.js';
import { createApp } from '../src/app.js';

test('Module 5 - Clinical EMR, Consents (AT-06), SignQueue (AT-13), Service Completion (AT-18) & Immutability (AT-23)', async (t) => {
  const database = createDatabase(env.db);
  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);
  const clinicalModels = initClinicalModels(database.sequelize, userModels, catalogModels, patientVisitModels);

  const userRepo = createUserRepository({ sequelize: database.sequelize, models: userModels });
  const catalogRepo = createCatalogRepository({ sequelize: database.sequelize, models: catalogModels });
  const patientVisitRepo = createPatientVisitRepository({
    sequelize: database.sequelize,
    models: patientVisitModels,
    userModels,
    catalogModels,
  });
  const clinicalRepo = createClinicalRepository({
    sequelize: database.sequelize,
    models: clinicalModels,
    userModels,
    catalogModels,
    patientVisitModels,
  });

  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });
  const userService = createUserService({ userRepo });
  const catalogService = createCatalogService({ catalogRepo, userRepo });
  const patientVisitService = createPatientVisitService({ patientVisitRepo, userRepo });
  const clinicalService = createClinicalService({ clinicalRepo, patientVisitRepo, userRepo });

  const authController = createAuthController({ authService });
  const userController = createUserController({ userService });
  const catalogController = createCatalogController({ catalogService });
  const patientVisitController = createPatientVisitController({ patientVisitService });
  const clinicalController = createClinicalController({ clinicalService });

  const authRoutes = createAuthRoutes({ authController, authMiddlewares });
  const userRoutes = createUserRoutes({ userController, authMiddlewares });
  const catalogRoutes = createCatalogRoutes({ catalogController, authMiddlewares });
  const patientRoutes = createPatientRoutes({ patientVisitController, authMiddlewares });
  const visitRoutes = createVisitRoutes({ patientVisitController, authMiddlewares });
  const clinicalRoutes = createClinicalRoutes({ clinicalController, authMiddlewares });

  const app = createApp({
    config: { ...env, logLevel: 'silent' },
    health: { readiness: async () => ({ statusCode: 200, body: {} }) },
    authRoutes,
    userRoutes,
    catalogRoutes,
    patientRoutes,
    visitRoutes,
    clinicalRoutes,
  });

  let adminToken = '';
  let doctorToken = '';
  let otherDoctorToken = '';
  let doctorId = '';
  let otherDoctorId = '';
  let testPatientId = '';
  let testVisitId = '';
  let branchId = '';
  let activeServiceId = '';
  let activePriceVersionId = '';

  await t.test('Setup: Login users and create test visit with doctor assignment', async () => {
    // 1. Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin1234@' });
    assert.equal(adminRes.status, 200);
    adminToken = adminRes.body.data.token;
    branchId = adminRes.body.data.user.branchId;

    // 2. Login Doctor
    const docRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'doctor', password: 'Doctor1234@' });
    assert.equal(docRes.status, 200);
    doctorToken = docRes.body.data.token;
    doctorId = docRes.body.data.user.userId;

    // 3. Create or login Other Doctor (Bác sĩ Bình) for AT-17 testing
    const uniqueDoctorUser = 'doc_' + Math.floor(1000 + Math.random() * 9000);
    const doctorRoleId = '205C41D3-E4C7-F111-B1C3-C0A5E8AB4284';
    const createDocRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: uniqueDoctorUser,
        displayName: 'Bác sĩ Bình',
        password: 'DoctorOther1234@',
        roleId: doctorRoleId,
        branchId: branchId,
      });
    assert.equal(createDocRes.status, 201);
    otherDoctorId = createDocRes.body.data.userId;

    const otherDocRes = await request(app)
      .post('/api/auth/login')
      .send({ username: uniqueDoctorUser, password: 'DoctorOther1234@' });
    assert.equal(otherDocRes.status, 200);
    otherDoctorToken = otherDocRes.body.data.token;

    // 4. Create Patient
    const uniquePhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
    const patRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Bệnh Nhân Test EMR',
        phoneNumber: uniquePhone,
        gender: 'MALE',
        dateOfBirth: '1995-05-20',
      });
    assert.equal(patRes.status, 201);
    testPatientId = patRes.body.data.patientId;

    // 5. Create Visit with assigned Doctor An
    const visitRes = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: testPatientId,
        branchId: branchId,
        doctorId: doctorId,
        chiefComplaint: 'Đau buốt răng cấm hàm dưới',
      });
    assert.equal(visitRes.status, 201);
    testVisitId = visitRes.body.data.visitId;

    // 6. Find or create an approved service with active price
    const serviceRes = await request(app)
      .get('/api/catalog/services')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(serviceRes.status, 200);
    const servicesList = serviceRes.body.data?.items || serviceRes.body.data?.rows || (Array.isArray(serviceRes.body.data) ? serviceRes.body.data : []);
    const approvedService = servicesList.find(s => s.currentPrice);

    if (approvedService) {
      activeServiceId = approvedService.serviceId;
    } else {
      // Create a new service with initial price and approve it
      const createSvcRes = await request(app)
        .post('/api/catalog/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'SVC-TEST-' + Math.floor(1000 + Math.random() * 9000),
          name: 'Dịch vụ Kiểm thử EMR',
          initialPrice: '500000.00',
        });
      assert.equal(createSvcRes.status, 201);
      activeServiceId = createSvcRes.body.data.serviceId;

      const detailSvc = await request(app)
        .get(`/api/catalog/services/${activeServiceId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      const priceVersionId = detailSvc.body.data.priceVersions?.[0]?.priceVersionId;

      if (priceVersionId) {
        await request(app)
          .patch(`/api/catalog/services/${activeServiceId}/prices/${priceVersionId}/status`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ status: 'APPROVED' });
      }
    }
  });

  let emrVersionId = '';

  await t.test('EMR Draft creation and update (Chief complaint, Diagnoses, ToothChart)', async () => {
    // 1. Doctor retrieves EMR (auto initializes draft version 1)
    const emrRes = await request(app)
      .get(`/api/visits/${testVisitId}/emr`)
      .set('Authorization', `Bearer ${doctorToken}`);

    if (emrRes.status !== 200) {
      console.error('EMR RES ERROR:', emrRes.status, emrRes.body);
    }
    assert.equal(emrRes.status, 200);
    assert.equal(emrRes.body.data.status, 'DRAFT');
    assert.equal(emrRes.body.data.versions.length, 1);
    emrVersionId = emrRes.body.data.versions[0].emrVersionId;
    assert.ok(emrVersionId);

    // 2. Doctor updates draft EMR with diagnoses and tooth chart
    const updateRes = await request(app)
      .put(`/api/visits/${testVisitId}/emr/${emrVersionId}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        clinicalContent: {
          chiefComplaint: 'Đau buốt răng hàm dưới khi uống nước lạnh',
          medicalHistory: 'Không có tiền sử dị ứng thuốc',
          clinicalExamination: 'Răng 46 sâu lỗ to mặt nhai, gõ ngang đau nhẹ',
          diagnosisSummary: 'Viêm tủy không hồi phục R46',
        },
        diagnoses: [
          { code: 'K04.0', description: 'Viêm tủy cấp không hồi phục', isPrimary: true },
          { code: 'K02.1', description: 'Sâu ngà răng R46', isPrimary: false },
        ],
        toothChart: [
          { toothCode: '46', surfaceCode: 'O', findingCode: 'CARIES', note: 'Lỗ sâu đáy mềm' },
          { toothCode: '48', surfaceCode: null, findingCode: 'IMPACTED', note: 'Răng khôn mọc lệch' },
        ],
      });

    assert.equal(updateRes.status, 200);
    const updatedVersion = updateRes.body.data.versions.find(v => v.emrVersionId === emrVersionId);
    assert.equal(updatedVersion.diagnoses.length, 2);
    assert.equal(updatedVersion.toothChart.length, 2);
  });

  await t.test('AT-17: Doctor without treatment relationship is rejected with 403', async () => {
    // Doctor Binh has no assignment on this visit -> 403 NO_TREATMENT_RELATIONSHIP
    const res = await request(app)
      .get(`/api/visits/${testVisitId}/emr`)
      .set('Authorization', `Bearer ${otherDoctorToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'NO_TREATMENT_RELATIONSHIP');
  });

  await t.test('AT-13: Network loss simulation during signing pushes to SignQueue without fake signature', async () => {
    // Simulate network loss during signing
    const res = await request(app)
      .post(`/api/visits/${testVisitId}/emr/${emrVersionId}/sign`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ simulateNetworkLoss: true });

    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, 'NETWORK_DISCONNECTED_QUEUED_FOR_SIGN');

    // Verify SignQueue has the pending item
    const queueRes = await request(app)
      .get('/api/sign-queue')
      .set('Authorization', `Bearer ${doctorToken}`);

    assert.equal(queueRes.status, 200);
    const pendingItem = queueRes.body.data.find(q => q.status === 'PENDING');
    assert.ok(pendingItem, 'Must have a pending item in SignQueue');
    assert.equal(pendingItem.status, 'PENDING');

    // Verify EMR record was NOT fake signed
    const emrRes = await request(app)
      .get(`/api/visits/${testVisitId}/emr`)
      .set('Authorization', `Bearer ${doctorToken}`);
    assert.equal(emrRes.body.data.status, 'DRAFT');
    const version = emrRes.body.data.versions.find(v => v.emrVersionId === emrVersionId);
    assert.equal(version.status, 'DRAFT');
    assert.equal(version.signatureHash, null);

    // Now retry signing via sign-queue item
    const retryRes = await request(app)
      .post(`/api/sign-queue/${pendingItem.signQueueId}/retry`)
      .set('Authorization', `Bearer ${doctorToken}`);

    assert.equal(retryRes.status, 200);
    assert.equal(retryRes.body.data.status, 'SIGNED');
    const signedVersion = retryRes.body.data.versions.find(v => v.emrVersionId === emrVersionId);
    assert.equal(signedVersion.status, 'SIGNED');
    assert.ok(signedVersion.signatureHash);
    assert.equal(signedVersion.signatureHash.length, 64);
  });

  await t.test('AT-23: EMR content cannot be modified directly once signed; Addenda required', async () => {
    // Attempting direct update on signed EMR version
    const failUpdateRes = await request(app)
      .put(`/api/visits/${testVisitId}/emr/${emrVersionId}`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        clinicalContent: { chiefComplaint: 'Cố tình sửa nội dung sau khi đã ký số' },
      });

    assert.equal(failUpdateRes.status, 400);
    assert.equal(failUpdateRes.body.error.code, 'EMR_VERSION_LOCKED_CANNOT_UPDATE');

    // Create an Addendum to append corrections (AT-23)
    const addendumRes = await request(app)
      .post(`/api/visits/${testVisitId}/emr/${emrVersionId}/addenda`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        content: 'Bổ sung: Bệnh nhân có tiền sử đau dạ dày nhẹ, tránh kê NSAID liều cao.',
        reason: 'Bổ sung thông tin bệnh sử do bệnh nhân nhớ thêm sau khi hoàn tất ký số.',
      });

    assert.equal(addendumRes.status, 201);
    assert.ok(addendumRes.body.data.emrAddendumId);

    // Verify Addendum appears in EMR
    const emrRes = await request(app)
      .get(`/api/visits/${testVisitId}/emr`)
      .set('Authorization', `Bearer ${doctorToken}`);
    const signedVersion = emrRes.body.data.versions.find(v => v.emrVersionId === emrVersionId);
    assert.equal(signedVersion.addenda.length, 1);
    assert.equal(signedVersion.addenda[0].reason, 'Bổ sung thông tin bệnh sử do bệnh nhân nhớ thêm sau khi hoàn tất ký số.');
  });

  await t.test('AT-06: Consent Revocation stops planned procedures, keeps completed ones, never deletes EMR', async () => {
    // 1. Create a fresh visit for consent workflow
    const vRes = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: testPatientId,
        branchId: branchId,
        doctorId: doctorId,
        chiefComplaint: 'Nhổ 2 răng khôn hàm dưới',
      });
    const visit2Id = vRes.body.data.visitId;

    // 2. Initialize EMR for this visit
    const emrInit = await request(app)
      .get(`/api/visits/${visit2Id}/emr`)
      .set('Authorization', `Bearer ${doctorToken}`);
    assert.equal(emrInit.status, 200);

    // 3. Get Consent Templates & create a Consent
    const templatesRes = await request(app)
      .get('/api/consent-templates')
      .set('Authorization', `Bearer ${doctorToken}`);
    assert.equal(templatesRes.status, 200);
    assert.ok(templatesRes.body.data.length > 0);
    const templateId = templatesRes.body.data[0].consentTemplateId;

    const consentRes = await request(app)
      .post(`/api/visits/${visit2Id}/consents`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        consentTemplateId: templateId,
        signerName: 'Nguyễn Văn Test',
        signerRelationship: 'SELF',
      });
    assert.equal(consentRes.status, 201);
    const consentId = consentRes.body.data.consentId;

    // 4. Sign the Consent
    const signConsentRes = await request(app)
      .post(`/api/visits/${visit2Id}/consents/${consentId}/sign`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ signerName: 'Nguyễn Văn Test' });
    assert.equal(signConsentRes.status, 200);
    assert.equal(signConsentRes.body.data.status, 'SIGNED');

    // 5. Add two service lines:
    // Line 1: Will be completed
    const line1Res = await request(app)
      .post(`/api/visits/${visit2Id}/services`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        serviceId: activeServiceId,
        quantity: 1,
        toothCode: '38',
      });
    assert.equal(line1Res.status, 201);
    const line1Id = line1Res.body.data.serviceLineId;

    // Complete Line 1
    const complete1Res = await request(app)
      .post(`/api/visits/${visit2Id}/services/${line1Id}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        quantityCompleted: 1,
        result: 'Nhổ thành công R38 nguyên vẹn không sang chấn',
      });
    assert.equal(complete1Res.status, 200);
    assert.equal(complete1Res.body.data.serviceLineStatus, 'COMPLETED');

    // Line 2: Will remain planned
    const line2Res = await request(app)
      .post(`/api/visits/${visit2Id}/services`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        serviceId: activeServiceId,
        quantity: 1,
        toothCode: '48',
      });
    assert.equal(line2Res.status, 201);
    const line2Id = line2Res.body.data.serviceLineId;

    // 6. Patient revokes consent after partial procedure
    const revokeRes = await request(app)
      .post(`/api/visits/${visit2Id}/consents/${consentId}/revoke`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        revocationReason: 'Bệnh nhân thấy mệt và hoảng sợ sau khi nhổ R38, xin dừng không nhổ tiếp R48 hôm nay.',
      });
    assert.equal(revokeRes.status, 200);
    assert.equal(revokeRes.body.data.status, 'REVOKED');
    assert.ok(revokeRes.body.data.revokedAt);

    // 7. Verify AT-06 outcomes:
    // - Consent record STILL EXISTS and is REVOKED
    const checkConsentRes = await request(app)
      .get(`/api/visits/${visit2Id}/consents`)
      .set('Authorization', `Bearer ${doctorToken}`);
    const foundConsent = checkConsentRes.body.data.find(c => c.consentId === consentId);
    assert.ok(foundConsent, 'Consent must NOT be deleted');
    assert.equal(foundConsent.status, 'REVOKED');

    // - EMR record STILL EXISTS
    const checkEmrRes = await request(app)
      .get(`/api/visits/${visit2Id}/emr`)
      .set('Authorization', `Bearer ${doctorToken}`);
    assert.ok(checkEmrRes.body.data, 'EMR record must NOT be deleted');

    // - Line 1 (completed) is STILL COMPLETED
    const servicesRes = await request(app)
      .get(`/api/visits/${visit2Id}/services`)
      .set('Authorization', `Bearer ${doctorToken}`);
    const sLine1 = servicesRes.body.data.find(s => s.serviceLineId === line1Id);
    const sLine2 = servicesRes.body.data.find(s => s.serviceLineId === line2Id);

    assert.equal(sLine1.status, 'COMPLETED', 'Completed procedure must be kept untouched');
    assert.equal(sLine2.status, 'CANCELLED', 'Unfinished planned procedure must be cancelled');
  });

  await t.test('AT-18: Service Completion - prevent duplicate completion call to prevent double billing/stock consumption', async () => {
    // 1. Create a fresh visit
    const vRes = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: testPatientId,
        branchId: branchId,
        doctorId: doctorId,
        chiefComplaint: 'Kiểm thử chốt dịch vụ không bị trùng',
      });
    const visitId = vRes.body.data.visitId;

    // 2. Add service line (quantity = 1)
    const lineRes = await request(app)
      .post(`/api/visits/${visitId}/services`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        serviceId: activeServiceId,
        quantity: 1,
      });
    assert.equal(lineRes.status, 201);
    const serviceLineId = lineRes.body.data.serviceLineId;

    // 3. First completion call: should succeed
    const firstCall = await request(app)
      .post(`/api/visits/${visitId}/services/${serviceLineId}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        quantityCompleted: 1,
        result: 'Hoàn thành dịch vụ đạt chuẩn',
      });
    assert.equal(firstCall.status, 200);
    assert.equal(firstCall.body.data.serviceLineStatus, 'COMPLETED');
    assert.equal(firstCall.body.data.event.completionVersion, 1);

    // 4. Second (duplicate) completion call: MUST be rejected with 409 Conflict
    const secondCall = await request(app)
      .post(`/api/visits/${visitId}/services/${serviceLineId}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        quantityCompleted: 1,
        result: 'Cố tình gọi chốt lần 2',
      });

    assert.equal(secondCall.status, 409);
    assert.equal(secondCall.body.error.code, 'SERVICE_ALREADY_COMPLETED');
  });

  await database.close();
});
