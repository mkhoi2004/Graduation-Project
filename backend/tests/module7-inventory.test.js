import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import request from 'supertest';
import { env } from '../src/config/load-env.js';
import { createDatabase } from '../src/config/db.js';
import { initUserModels } from '../src/models/user-models.js';
import { initCatalogModels } from '../src/models/catalog-models.js';
import { initPatientVisitModels } from '../src/models/patient-visit-models.js';
import { initClinicalModels } from '../src/models/clinical-models.js';
import { initBillingModels } from '../src/models/billing-models.js';
import { initInventoryModels } from '../src/models/inventory-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createCatalogRepository } from '../src/repositories/catalog-repository.js';
import { createPatientVisitRepository } from '../src/repositories/patient-visit-repository.js';
import { createClinicalRepository } from '../src/repositories/clinical-repository.js';
import { createBillingRepository } from '../src/repositories/billing-repository.js';
import { createInventoryRepository } from '../src/repositories/inventory-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createUserService } from '../src/services/user-service.js';
import { createCatalogService } from '../src/services/catalog-service.js';
import { createPatientVisitService } from '../src/services/patient-visit-service.js';
import { createClinicalService } from '../src/services/clinical-service.js';
import { createBillingService } from '../src/services/billing-service.js';
import { createInventoryService } from '../src/services/inventory-service.js';
import { createAuthController } from '../src/controllers/auth-controller.js';
import { createUserController } from '../src/controllers/user-controller.js';
import { createCatalogController } from '../src/controllers/catalog-controller.js';
import { createPatientVisitController } from '../src/controllers/patient-visit-controller.js';
import { createClinicalController } from '../src/controllers/clinical-controller.js';
import { createBillingController } from '../src/controllers/billing-controller.js';
import { createInventoryController } from '../src/controllers/inventory-controller.js';
import { createAuthRoutes } from '../src/routes/auth-routes.js';
import { createUserRoutes } from '../src/routes/user-routes.js';
import { createCatalogRoutes } from '../src/routes/catalog-routes.js';
import { createPatientRoutes } from '../src/routes/patient-routes.js';
import { createVisitRoutes } from '../src/routes/visit-routes.js';
import { createClinicalRoutes } from '../src/routes/clinical-routes.js';
import { createBillingRoutes } from '../src/routes/billing-routes.js';
import { createInventoryRoutes } from '../src/routes/inventory-routes.js';
import { createApp } from '../src/app.js';

test('Module 7 - Inventory: FEFO Expiry Control (AT-07), Lot Recall & Tracing (AT-08), Serial Implant Anti-Reuse (AT-12)', async (t) => {
  const database = createDatabase(env.db);
  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);
  const clinicalModels = initClinicalModels(database.sequelize, userModels, catalogModels, patientVisitModels);
  const billingModels = initBillingModels(database.sequelize, userModels, catalogModels, patientVisitModels, clinicalModels);
  const inventoryModels = initInventoryModels(database.sequelize, userModels, patientVisitModels, clinicalModels);

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
  const billingRepo = createBillingRepository({
    sequelize: database.sequelize,
    models: billingModels,
    userModels,
    catalogModels,
    patientVisitModels,
    clinicalModels,
  });
  const inventoryRepo = createInventoryRepository({
    sequelize: database.sequelize,
    models: inventoryModels,
    userModels,
    patientVisitModels,
    clinicalModels,
  });

  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });
  const userService = createUserService({ userRepo });
  const catalogService = createCatalogService({ catalogRepo, userRepo });
  const patientVisitService = createPatientVisitService({ patientVisitRepo, userRepo });
  const clinicalService = createClinicalService({ clinicalRepo, patientVisitRepo, userRepo });
  const billingService = createBillingService({ billingRepo, userRepo });
  const inventoryService = createInventoryService({ inventoryRepo, userRepo });

  const authController = createAuthController({ authService });
  const userController = createUserController({ userService });
  const catalogController = createCatalogController({ catalogService });
  const patientVisitController = createPatientVisitController({ patientVisitService });
  const clinicalController = createClinicalController({ clinicalService });
  const billingController = createBillingController({ billingService });
  const inventoryController = createInventoryController({ inventoryService });

  const authRoutes = createAuthRoutes({ authController, authMiddlewares });
  const userRoutes = createUserRoutes({ userController, authMiddlewares });
  const catalogRoutes = createCatalogRoutes({ catalogController, authMiddlewares });
  const patientRoutes = createPatientRoutes({ patientVisitController, authMiddlewares });
  const visitRoutes = createVisitRoutes({ patientVisitController, authMiddlewares });
  const clinicalRoutes = createClinicalRoutes({ clinicalController, authMiddlewares });
  const billingRoutes = createBillingRoutes({ billingController, authMiddlewares });
  const inventoryRoutes = createInventoryRoutes({ inventoryController, authMiddlewares });

  const app = createApp({
    config: { ...env, logLevel: 'silent' },
    health: { readiness: async () => ({ statusCode: 200, body: {} }) },
    authRoutes,
    userRoutes,
    catalogRoutes,
    patientRoutes,
    visitRoutes,
    clinicalRoutes,
    billingRoutes,
    inventoryRoutes,
  });

  let adminToken = '';
  let warehouseToken = '';
  let doctorToken = '';
  let doctorId = '';
  let branchId = '';
  let testWarehouseId = '';
  let testSupplierId = '';
  let medicineItemId = '';
  let implantItemId = '';
  let lot1Id = '';
  let lot2Id = '';
  let expiredLotId = '';
  let testVisitId = '';
  let testCompletionEventId = '';
  let testSerial1 = '';
  let testSerial2 = '';

  await t.test('Setup: Login Admin, Create Warehouse User, Supplier, Warehouse & Items', async () => {
    // 1. Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin1234@' });
    assert.equal(adminRes.status, 200);
    adminToken = adminRes.body.data.token;
    console.log('ADMIN USER DATA:', adminRes.body.data.user);
    branchId = adminRes.body.data.user.branchId;

    // 2. Create Warehouse User
    const warehouseRoleId = '225C41D3-E4C7-F111-B1C3-C0A5E8AB4284';
    const whUsername = 'wh_' + Math.floor(1000 + Math.random() * 9000);
    const createWh = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: whUsername,
        displayName: 'Thủ kho Nam',
        password: 'Warehouse1234@',
        roleId: warehouseRoleId,
        branchId,
      });
    assert.equal(createWh.status, 201);

    const loginWh = await request(app)
      .post('/api/auth/login')
      .send({ username: whUsername, password: 'Warehouse1234@' });
    assert.equal(loginWh.status, 200);
    warehouseToken = loginWh.body.data.token;

    // 3. Login Doctor
    const docRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'doctor', password: 'Doctor1234@' });
    assert.equal(docRes.status, 200);
    doctorToken = docRes.body.data.token;
    doctorId = docRes.body.data.user.userId;

    // 4. Create Supplier
    const supRes = await request(app)
      .post('/api/inventory/suppliers')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        code: 'SUP-' + Math.floor(1000 + Math.random() * 9000),
        name: 'Công ty Dược phẩm & Thiết bị Y tế Nha khoa Việt Nam',
        phone: '02438889999',
        taxCode: '0101234567',
      });
    assert.equal(supRes.status, 201);
    testSupplierId = supRes.body.data.supplierId;

    // 5. Create Warehouse
    const whRes = await request(app)
      .post('/api/inventory/warehouses')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        branchId,
        code: 'WH-MAIN-' + Math.floor(1000 + Math.random() * 9000),
        name: 'Kho Dược & Vật tư Trung tâm',
      });
    if (whRes.status !== 201) {
      console.log('WH CREATE FAILED:', whRes.status, whRes.body);
    }
    assert.equal(whRes.status, 201);
    testWarehouseId = whRes.body.data.warehouseId;

    // 6. Create Items: Medicine (RequiresLot) & Implant (IsSerialized, RequiresLot)
    const medRes = await request(app)
      .post('/api/inventory/items')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        code: 'MED-LIDO-' + Math.floor(1000 + Math.random() * 9000),
        name: 'Thuốc tê Lidocaine 2% ống 2ml',
        baseUnit: 'ONG',
        requiresLot: true,
        isSerialized: false,
      });
    assert.equal(medRes.status, 201);
    medicineItemId = medRes.body.data.itemId;

    const impRes = await request(app)
      .post('/api/inventory/items')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        code: 'IMP-STRAU-' + Math.floor(1000 + Math.random() * 9000),
        name: 'Trụ Implant Straumann SLA Active 4.1x10mm',
        baseUnit: 'CAI',
        requiresLot: true,
        isSerialized: true,
      });
    assert.equal(impRes.status, 201);
    implantItemId = impRes.body.data.itemId;
  });

  await t.test('Subtest 1: Goods Receipt (Nhập kho) with Lots & Serial Generation', async () => {
    // 1. Nhập kho 2 lô thuốc tê Lidocaine:
    // Lô 1: Hạn dùng 2027-12-31 (còn xa)
    // Lô 2: Hạn dùng 2026-11-15 (cận hạn hơn)
    const receiptMed = await request(app)
      .post('/api/inventory/receipts')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouseId: testWarehouseId,
        supplierId: testSupplierId,
        receiptNo: 'PNK-MED-' + Math.floor(1000 + Math.random() * 9000),
        items: [
          {
            itemId: medicineItemId,
            lotNumber: 'LIDO-L01',
            expiryDate: '2027-12-31',
            quantity: 100,
            unitCost: 15000,
          },
          {
            itemId: medicineItemId,
            lotNumber: 'LIDO-L02',
            expiryDate: '2026-11-15',
            quantity: 50,
            unitCost: 15000,
          },
        ],
      });
    if (receiptMed.status !== 201) {
      console.log('RECEIPT MED ERROR:', receiptMed.status, receiptMed.body);
    }
    assert.equal(receiptMed.status, 201);

    // 2. Nhập kho Implant có quản lý Serial (IsSerialized)
    testSerial1 = 'SN-IMP-' + Math.floor(100000 + Math.random() * 900000);
    testSerial2 = 'SN-IMP-' + Math.floor(100000 + Math.random() * 900000);
    const receiptImp = await request(app)
      .post('/api/inventory/receipts')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouseId: testWarehouseId,
        supplierId: testSupplierId,
        receiptNo: 'PNK-IMP-' + Math.floor(1000 + Math.random() * 9000),
        items: [
          {
            itemId: implantItemId,
            lotNumber: 'LOT-IMP-01',
            expiryDate: '2029-06-30',
            quantity: 2,
            unitCost: 12000000,
            serialNumbers: [testSerial1, testSerial2],
          },
        ],
      });
    assert.equal(receiptImp.status, 201);

    // 3. Kiểm tra kiểm soát Serial count mismatch
    const badSerialCount = await request(app)
      .post('/api/inventory/receipts')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouseId: testWarehouseId,
        supplierId: testSupplierId,
        items: [
          {
            itemId: implantItemId,
            lotNumber: 'LOT-IMP-FAIL',
            expiryDate: '2029-06-30',
            quantity: 2,
            unitCost: 12000000,
            serialNumbers: ['SN-ONLY-ONE'], // 1 serial for quantity 2
          },
        ],
      });
    assert.equal(badSerialCount.status, 400);
    assert.equal(badSerialCount.body.error.code, 'SERIAL_COUNT_MISMATCH');

    // 4. Kiểm tra tồn kho
    const balancesRes = await request(app)
      .get(`/api/inventory/balances?warehouseId=${testWarehouseId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    assert.equal(balancesRes.status, 200);
    assert.ok(balancesRes.body.data.length >= 3);
  });

  await t.test('Subtest 2: AT-07 FEFO Expiry Rule & Expired Lot Dispense Prevention', async () => {
    // 1. Lấy danh sách lô theo FEFO
    const fefoRes = await request(app)
      .get(`/api/inventory/lots/fefo?warehouseId=${testWarehouseId}&itemId=${medicineItemId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    assert.equal(fefoRes.status, 200);
    const lots = fefoRes.body.data;
    assert.equal(lots.length, 2);

    // FEFO: Lô LIDO-L02 (2026-11-15) phải đứng trước LIDO-L01 (2027-12-31)
    assert.equal(lots[0].lotNumber, 'LIDO-L02');
    assert.equal(lots[1].lotNumber, 'LIDO-L01');
    lot2Id = lots[0].stockLotId;
    lot1Id = lots[1].stockLotId;

    // 2. Xuất kho tự động không chỉ định lô: Hệ thống phải tự động bốc từ lô cận hạn nhất (L02)
    const dispense1 = await request(app)
      .post('/api/inventory/dispense')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouseId: testWarehouseId,
        itemId: medicineItemId,
        quantity: 10,
      });
    assert.equal(dispense1.status, 200);
    assert.equal(dispense1.body.data.dispensedLot.lotNumber, 'LIDO-L02');
    assert.equal(dispense1.body.data.remainingOnHand, 40); // 50 - 10

    // 3. Nhập 1 lô giả lập đã hết hạn (2020-01-01) để kiểm thử AT-07
    const expiredReceipt = await request(app)
      .post('/api/inventory/receipts')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouseId: testWarehouseId,
        supplierId: testSupplierId,
        items: [
          {
            itemId: medicineItemId,
            lotNumber: 'LIDO-EXPIRED',
            expiryDate: '2020-01-01',
            quantity: 20,
            unitCost: 10000,
          },
        ],
      });
    assert.equal(expiredReceipt.status, 201);

    const fefoCheck = await request(app)
      .get(`/api/inventory/lots/fefo?warehouseId=${testWarehouseId}&itemId=${medicineItemId}`)
      .set('Authorization', `Bearer ${warehouseToken}`);
    const expLot = fefoCheck.body.data.find((l) => l.lotNumber === 'LIDO-EXPIRED');
    assert.ok(expLot);
    assert.equal(expLot.isExpired, true);
    expiredLotId = expLot.stockLotId;

    // 4. AT-07: Chặn tuyệt đối xuất kho lô đã hết hạn
    const tryDispenseExpired = await request(app)
      .post('/api/inventory/dispense')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouseId: testWarehouseId,
        itemId: medicineItemId,
        quantity: 5,
        specificLotId: expiredLotId,
      });
    assert.equal(tryDispenseExpired.status, 400);
    assert.equal(tryDispenseExpired.body.error.code, 'EXPIRED_LOT_CANNOT_DISPENSE');
  });

  await t.test('Subtest 3: AT-08 Lot Recall, Immediate Dispense Blocking & Patient Tracing', async () => {
    // 1. Tạo 1 bệnh nhân và lượt khám có thực hiện dịch vụ để truy vết
    const uniqueTracePhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
    const patRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Trần Văn Truy Vết Lô Thuốc',
        phone: uniqueTracePhone,
        gender: 'MALE',
        dateOfBirth: '1985-08-20',
      });
    assert.equal(patRes.status, 201, `Failed to create patient: ${JSON.stringify(patRes.body)}`);
    const patientId = patRes.body.data.patientId;

    const visitRes = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId,
        branchId,
        doctorId,
        reason: 'Tiểu phẫu răng khôn cần gây tê',
      });
    assert.equal(visitRes.status, 201, `Failed to create visit: ${JSON.stringify(visitRes.body)}`);
    testVisitId = visitRes.body.data.visitId;

    // Lấy service và add service
    const serviceRes = await request(app)
      .get('/api/catalog/services')
      .set('Authorization', `Bearer ${adminToken}`);
    const servicesList = serviceRes.body.data?.items || serviceRes.body.data?.rows || (Array.isArray(serviceRes.body.data) ? serviceRes.body.data : []);
    const svc = servicesList.find((s) => s.currentPrice);

    const addSvc = await request(app)
      .post(`/api/visits/${testVisitId}/services`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ serviceId: svc.serviceId, quantity: 1, toothCode: '48' });
    const slId = addSvc.body.data.serviceLineId;

    const completeSvc = await request(app)
      .post(`/api/visits/${testVisitId}/services/${slId}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ quantityCompleted: 1 });
    assert.equal(completeSvc.status, 200);
    testCompletionEventId = completeSvc.body.data.event?.serviceCompletionEventId || completeSvc.body.data.serviceCompletionEventId;

    // 2. Xuất 2 ống Lidocaine từ Lô 1 (LIDO-L01) liên kết với ca điều trị này
    const dispenseForPatient = await request(app)
      .post('/api/inventory/dispense')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouseId: testWarehouseId,
        itemId: medicineItemId,
        quantity: 2,
        specificLotId: lot1Id,
        sourceEventId: testCompletionEventId,
      });
    assert.equal(dispenseForPatient.status, 200);

    // 3. Ban hành lệnh THU HỒI LÔ (Lot Recall - AT-08) đối với Lô 1
    const recallRes = await request(app)
      .post(`/api/inventory/lots/${lot1Id}/recall`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        reason: 'Phát hiện tạp chất lạ trong bao bì theo công văn khẩn của Cục Quản lý Dược',
      });
    assert.equal(recallRes.status, 201);
    assert.equal(recallRes.body.data.status, 'OPEN');

    // 4. AT-08: Thử xuất tiếp từ Lô 1 sau khi đã thu hồi -> BỊ CHẶN 409 CONFLICT
    const tryDispenseRecalled = await request(app)
      .post('/api/inventory/dispense')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        warehouseId: testWarehouseId,
        itemId: medicineItemId,
        quantity: 1,
        specificLotId: lot1Id,
      });
    assert.equal(tryDispenseRecalled.status, 409);
    assert.equal(tryDispenseRecalled.body.error.code, 'LOT_RECALLED_CANNOT_DISPENSE');

    // 5. AT-08: Truy vết toàn bộ bệnh nhân đã sử dụng lô thuốc bị thu hồi
    const traceRes = await request(app)
      .get(`/api/inventory/lots/${lot1Id}/trace`)
      .set('Authorization', `Bearer ${doctorToken}`);
    assert.equal(traceRes.status, 200);
    assert.equal(traceRes.body.data.lot.status, 'RECALLED');
    assert.ok(traceRes.body.data.tracedPatients.length >= 1);
    const tracedPatient = traceRes.body.data.tracedPatients[0].patient;
    assert.equal(tracedPatient.fullName, 'Trần Văn Truy Vết Lô Thuốc');
    assert.equal(tracedPatient.phone, uniqueTracePhone);
  });

  await t.test('Subtest 4: AT-12 Serial Implant Management & Anti-Reuse Enforcement', async () => {
    // 1. Bác sĩ cấy ghép trụ Implant testSerial1 cho bệnh nhân
    const implantRes = await request(app)
      .post('/api/inventory/serials/implant')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        serialNumber: testSerial1,
        serviceCompletionEventId: testCompletionEventId,
      });
    assert.equal(implantRes.status, 200);
    assert.equal(implantRes.body.data.serial.status, 'CONSUMED');

    // 2. AT-12: Cố tình cấy ghép lại trụ testSerial1 lần thứ 2 -> BỊ TỪ CHỐI 409 CONFLICT
    const reuseImplantRes = await request(app)
      .post('/api/inventory/serials/implant')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        serialNumber: testSerial1,
        serviceCompletionEventId: testCompletionEventId,
      });
    assert.equal(reuseImplantRes.status, 409);
    assert.equal(reuseImplantRes.body.error.code, 'SERIAL_ALREADY_IMPLANTED');

    // 3. Trụ testSerial2 vẫn còn nguyên trong kho và có thể cấy ghép bình thường
    const secondCompletionEventId = crypto.randomUUID();
    const secondImplantRes = await request(app)
      .post('/api/inventory/serials/implant')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        serialNumber: testSerial2,
        serviceCompletionEventId: secondCompletionEventId,
      });
    assert.equal(secondImplantRes.status, 200);
    assert.equal(secondImplantRes.body.data.serial.status, 'CONSUMED');
  });

  await database.close();
});
