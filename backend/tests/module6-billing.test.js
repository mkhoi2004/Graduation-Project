import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { env } from '../src/config/load-env.js';
import { createDatabase } from '../src/config/db.js';
import { initUserModels } from '../src/models/user-models.js';
import { initCatalogModels } from '../src/models/catalog-models.js';
import { initPatientVisitModels } from '../src/models/patient-visit-models.js';
import { initClinicalModels } from '../src/models/clinical-models.js';
import { initBillingModels } from '../src/models/billing-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createCatalogRepository } from '../src/repositories/catalog-repository.js';
import { createPatientVisitRepository } from '../src/repositories/patient-visit-repository.js';
import { createClinicalRepository } from '../src/repositories/clinical-repository.js';
import { createBillingRepository } from '../src/repositories/billing-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createUserService } from '../src/services/user-service.js';
import { createCatalogService } from '../src/services/catalog-service.js';
import { createPatientVisitService } from '../src/services/patient-visit-service.js';
import { createClinicalService } from '../src/services/clinical-service.js';
import { createBillingService } from '../src/services/billing-service.js';
import { createAuthController } from '../src/controllers/auth-controller.js';
import { createUserController } from '../src/controllers/user-controller.js';
import { createCatalogController } from '../src/controllers/catalog-controller.js';
import { createPatientVisitController } from '../src/controllers/patient-visit-controller.js';
import { createClinicalController } from '../src/controllers/clinical-controller.js';
import { createBillingController } from '../src/controllers/billing-controller.js';
import { createAuthRoutes } from '../src/routes/auth-routes.js';
import { createUserRoutes } from '../src/routes/user-routes.js';
import { createCatalogRoutes } from '../src/routes/catalog-routes.js';
import { createPatientRoutes } from '../src/routes/patient-routes.js';
import { createVisitRoutes } from '../src/routes/visit-routes.js';
import { createClinicalRoutes } from '../src/routes/clinical-routes.js';
import { createBillingRoutes } from '../src/routes/billing-routes.js';
import { createApp } from '../src/app.js';

test('Module 6 - Patient Billing: Invoices (AT-01), Cashier Race Prevention (AT-02), Deposit Applications (AT-15), Monetary Controls & Maker-Checker (AT-20)', async (t) => {
  const database = createDatabase(env.db);
  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);
  const clinicalModels = initClinicalModels(database.sequelize, userModels, catalogModels, patientVisitModels);
  const billingModels = initBillingModels(database.sequelize, userModels, catalogModels, patientVisitModels, clinicalModels);

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

  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });
  const userService = createUserService({ userRepo });
  const catalogService = createCatalogService({ catalogRepo, userRepo });
  const patientVisitService = createPatientVisitService({ patientVisitRepo, userRepo });
  const clinicalService = createClinicalService({ clinicalRepo, patientVisitRepo, userRepo });
  const billingService = createBillingService({ billingRepo, userRepo });

  const authController = createAuthController({ authService });
  const userController = createUserController({ userService });
  const catalogController = createCatalogController({ catalogService });
  const patientVisitController = createPatientVisitController({ patientVisitService });
  const clinicalController = createClinicalController({ clinicalService });
  const billingController = createBillingController({ billingService });

  const authRoutes = createAuthRoutes({ authController, authMiddlewares });
  const userRoutes = createUserRoutes({ userController, authMiddlewares });
  const catalogRoutes = createCatalogRoutes({ catalogController, authMiddlewares });
  const patientRoutes = createPatientRoutes({ patientVisitController, authMiddlewares });
  const visitRoutes = createVisitRoutes({ patientVisitController, authMiddlewares });
  const clinicalRoutes = createClinicalRoutes({ clinicalController, authMiddlewares });
  const billingRoutes = createBillingRoutes({ billingController, authMiddlewares });

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
  });

  let adminToken = '';
  let adminUserId = '';
  let cashier1Token = '';
  let cashier1Id = '';
  let cashier2Token = '';
  let cashier2Id = '';
  let doctorToken = '';
  let doctorId = '';
  let testPatientId = '';
  let testVisitId = '';
  let branchId = '';
  let activePriceVersionId = '';
  let activeServiceId = '';
  let createdShiftId = '';
  let testDepositId = '';
  let testInvoiceId = '';
  let testPaymentTxnId = '';

  await t.test('Setup: Login Admin, Create 2 Cashiers, Patient, Visit, Service & Complete Procedure', async () => {
    // 1. Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin1234@' });
    assert.equal(adminRes.status, 200);
    adminToken = adminRes.body.data.token;
    adminUserId = adminRes.body.data.user.userId;
    branchId = adminRes.body.data.user.branchId;

    // 2. Login Doctor
    const docRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'doctor', password: 'Doctor1234@' });
    assert.equal(docRes.status, 200);
    doctorToken = docRes.body.data.token;
    doctorId = docRes.body.data.user.userId;

    // 3. Create Cashier 1 & Cashier 2
    const receptionistRoleId = '1F5C41D3-E4C7-F111-B1C3-C0A5E8AB4284';
    const c1Username = 'cashier1_' + Math.floor(1000 + Math.random() * 9000);
    const c2Username = 'cashier2_' + Math.floor(1000 + Math.random() * 9000);

    const c1Res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: c1Username,
        displayName: 'Thu Ngân 1',
        password: 'Cashier1234@',
        roleId: receptionistRoleId,
        branchId,
      });
    assert.equal(c1Res.status, 201);
    cashier1Id = c1Res.body.data.userId;

    const c2Res = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: c2Username,
        displayName: 'Thu Ngân 2',
        password: 'Cashier1234@',
        roleId: receptionistRoleId,
        branchId,
      });
    assert.equal(c2Res.status, 201);
    cashier2Id = c2Res.body.data.userId;

    // Login Cashier 1 & Cashier 2
    const loginC1 = await request(app)
      .post('/api/auth/login')
      .send({ username: c1Username, password: 'Cashier1234@' });
    assert.equal(loginC1.status, 200);
    cashier1Token = loginC1.body.data.token;

    const loginC2 = await request(app)
      .post('/api/auth/login')
      .send({ username: c2Username, password: 'Cashier1234@' });
    assert.equal(loginC2.status, 200);
    cashier2Token = loginC2.body.data.token;

    // 4. Create Patient
    const uniquePhone = '09' + Math.floor(10000000 + Math.random() * 90000000);
    const patRes = await request(app)
      .post('/api/patients')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        fullName: 'Nguyễn Văn Thu Ngân',
        phone: uniquePhone,
        gender: 'MALE',
        dateOfBirth: '1992-05-15',
        address: 'Hà Nội',
      });
    assert.equal(patRes.status, 201);
    testPatientId = patRes.body.data.patientId;

    // 5. Create Visit & Assign Doctor
    const visitRes = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: testPatientId,
        branchId,
        doctorId,
        reason: 'Khám trám răng và bọc sứ',
      });
    assert.equal(visitRes.status, 201);
    testVisitId = visitRes.body.data.visitId;

    // 6. Get or create Service with APPROVED price
    const servicesRes = await request(app)
      .get('/api/catalog/services')
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(servicesRes.status, 200);
    const servicesList = servicesRes.body.data?.items || servicesRes.body.data?.rows || (Array.isArray(servicesRes.body.data) ? servicesRes.body.data : []);
    const approvedService = servicesList.find(s => s.currentPrice);

    if (approvedService) {
      activeServiceId = approvedService.serviceId;
    } else {
      const createSvcRes = await request(app)
        .post('/api/catalog/services')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          code: 'SVC-BILL-' + Math.floor(1000 + Math.random() * 9000),
          name: 'Dịch vụ Kiểm thử Billing',
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

    const addServiceRes = await request(app)
      .post(`/api/visits/${testVisitId}/services`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        serviceId: activeServiceId,
        quantity: 2,
        toothCode: '16',
      });
    assert.equal(addServiceRes.status, 201);
    const serviceLineId = addServiceRes.body.data.serviceLineId;

    // 7. Complete procedure (ServiceCompletionEvent - AT-18)
    const completeRes = await request(app)
      .post(`/api/visits/${testVisitId}/services/${serviceLineId}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        quantityCompleted: 2,
        notes: 'Đã hoàn thành trám 2 xoang răng 16',
      });
    assert.equal(completeRes.status, 200);
  });

  await t.test('Subtest 1: Cashier Shift Management (Ca thu ngân)', async () => {
    // 1. Chặn mở ca với số tiền âm
    const negativeRes = await request(app)
      .post('/api/billing/shifts/open')
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ branchId, openingFloat: -100000 });
    assert.equal(negativeRes.status, 400);
    assert.equal(negativeRes.body.error.code, 'INVALID_OPENING_FLOAT');

    // 2. Mở ca hợp lệ với 500.000 đ
    const openRes = await request(app)
      .post('/api/billing/shifts/open')
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ branchId, openingFloat: 500000 });
    assert.equal(openRes.status, 201);
    assert.equal(openRes.body.data.status, 'OPEN');
    createdShiftId = openRes.body.data.cashShiftId;

    // Mở ca cho Cashier 2 để test race conditions
    const openC2 = await request(app)
      .post('/api/billing/shifts/open')
      .set('Authorization', `Bearer ${cashier2Token}`)
      .send({ branchId, openingFloat: 300000 });
    assert.equal(openC2.status, 201);

    // 3. Chặn mở tiếp ca thứ 2 khi ca 1 chưa đóng
    const duplicateRes = await request(app)
      .post('/api/billing/shifts/open')
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ branchId, openingFloat: 200000 });
    assert.equal(duplicateRes.status, 409);
    assert.equal(duplicateRes.body.error.code, 'SHIFT_ALREADY_OPEN');

    // 4. Lấy ca hiện tại
    const currentRes = await request(app)
      .get('/api/billing/shifts/current')
      .set('Authorization', `Bearer ${cashier1Token}`);
    assert.equal(currentRes.status, 200);
    assert.equal(currentRes.body.data.cashShiftId, createdShiftId);
  });

  await t.test('Subtest 2: Deposits & Monetary Validation (AT-20)', async () => {
    // 1. Chặn số tiền âm (AT-20)
    const negativeDep = await request(app)
      .post('/api/billing/deposits')
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({
        patientId: testPatientId,
        amount: -500000,
        method: 'CASH',
        payerName: 'Nguyễn Văn Thu Ngân',
      });
    assert.equal(negativeDep.status, 400);
    assert.equal(negativeDep.body.error.code, 'INVALID_AMOUNT');

    // 2. Chặn số tiền 0
    const zeroDep = await request(app)
      .post('/api/billing/deposits')
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({
        patientId: testPatientId,
        amount: 0,
        method: 'CASH',
      });
    assert.equal(zeroDep.status, 400);

    // 3. Đặt cọc hợp lệ 2.000.000 đ
    const depositRes = await request(app)
      .post('/api/billing/deposits')
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({
        patientId: testPatientId,
        amount: 2000000,
        method: 'CASH',
        payerName: 'Nguyễn Văn Thu Ngân',
      });
    assert.equal(depositRes.status, 201);
    assert.equal(Number(depositRes.body.data.amount), 2000000);
    assert.equal(Number(depositRes.body.data.balance), 2000000);
    assert.equal(depositRes.body.data.status, 'CONFIRMED');
    testDepositId = depositRes.body.data.depositId;

    // 4. Lấy danh sách cọc của bệnh nhân
    const listRes = await request(app)
      .get(`/api/billing/patients/${testPatientId}/deposits`)
      .set('Authorization', `Bearer ${cashier1Token}`);
    assert.equal(listRes.status, 200);
    assert.ok(listRes.body.data.length >= 1);
  });

  let invoiceGross = 0;

  await t.test('Subtest 3: Issue Invoice from Completed Services (AT-01, AT-18, AT-20)', async () => {
    // 1. Chặn giảm giá > Gross (AT-20)
    const overDiscountRes = await request(app)
      .post(`/api/billing/visits/${testVisitId}/invoices`)
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ approvedDiscount: 5000000 });
    assert.equal(overDiscountRes.status, 400);
    assert.equal(overDiscountRes.body.error.code, 'DISCOUNT_EXCEEDS_GROSS');

    // 2. Xuất hóa đơn chuẩn
    const invoiceRes = await request(app)
      .post(`/api/billing/visits/${testVisitId}/invoices`)
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ approvedDiscount: 0, tax: 0 });
    assert.equal(invoiceRes.status, 201);
    invoiceGross = Number(invoiceRes.body.data.gross);
    assert.ok(invoiceGross > 0);
    assert.equal(invoiceRes.body.data.status, 'ISSUED');
    testInvoiceId = invoiceRes.body.data.invoiceId;

    // 3. Xuất lần 2 khi không còn dịch vụ hoàn thành chưa thanh toán
    const duplicateInvoiceRes = await request(app)
      .post(`/api/billing/visits/${testVisitId}/invoices`)
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({});
    assert.equal(duplicateInvoiceRes.status, 400);
    assert.equal(duplicateInvoiceRes.body.error.code, 'NO_COMPLETED_SERVICES_TO_INVOICE');

    // 4. Kiểm tra chi tiết hóa đơn
    const getInvoiceRes = await request(app)
      .get(`/api/billing/invoices/${testInvoiceId}`)
      .set('Authorization', `Bearer ${cashier1Token}`);
    assert.equal(getInvoiceRes.status, 200);
    assert.equal(getInvoiceRes.body.data.lines.length, 1);
    assert.equal(Number(getInvoiceRes.body.data.lines[0].quantity), 2);
  });

  await t.test('Subtest 4: AT-15 Race Condition - Concurrent Deposit Applications Prevention', async () => {
    // Deposit hiện có balance = 2,000,000 đ
    // Tạo 1 lượt khám + dịch vụ (số lượng 10) để hóa đơn có Gross đủ lớn (>= 3,000,000 đ)
    const visit2Res = await request(app)
      .post('/api/visits')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: testPatientId,
        branchId,
        doctorId,
        reason: 'Khám thêm nhiều răng',
      });
    const visit2Id = visit2Res.body.data.visitId;

    const addService2 = await request(app)
      .post(`/api/visits/${visit2Id}/services`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        serviceId: activeServiceId,
        quantity: 10,
        toothCode: '26',
      });
    assert.equal(addService2.status, 201);
    const sl2Id = addService2.body.data.serviceLineId;

    await request(app)
      .post(`/api/visits/${visit2Id}/services/${sl2Id}/complete`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({ quantityCompleted: 10 });

    const invoice2Res = await request(app)
      .post(`/api/billing/visits/${visit2Id}/invoices`)
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({});
    const invoice2Id = invoice2Res.body.data.invoiceId;

    // Bây giờ invoice 2 nợ >= 3.000.000 đ.
    // Thực hiện 2 cấn cọc đồng thời vào testDepositId (2.000.000 đ):
    // Cấn vào invoice 2: 1.500.000 đ (<= invoice2 outstanding)
    // Cấn vào invoice 2: 1.000.000 đ (<= invoice2 outstanding)
    // Tổng yêu cầu = 2.500.000 đ > 2.000.000 đ
    const [applyA, applyB] = await Promise.all([
      request(app)
        .post(`/api/billing/invoices/${invoice2Id}/apply-deposit`)
        .set('Authorization', `Bearer ${cashier1Token}`)
        .send({ depositId: testDepositId, amount: 1500000 }),
      request(app)
        .post(`/api/billing/invoices/${invoice2Id}/apply-deposit`)
        .set('Authorization', `Bearer ${cashier2Token}`)
        .send({ depositId: testDepositId, amount: 1000000 }),
    ]);

    const statuses = [applyA.status, applyB.status];
    assert.ok(statuses.includes(200), 'Phải có 1 giao dịch cấn cọc thành công');
    assert.ok(statuses.includes(409), 'Giao dịch vượt quá số dư phải bị chặn với mã 409 (AT-15)');

    const failedRes = applyA.status === 409 ? applyA : applyB;
    assert.equal(failedRes.body.error.code, 'DEPOSIT_BALANCE_INSUFFICIENT');
  });

  let payEach = 0;

  await t.test('Subtest 5: AT-02 Race Condition - Concurrent Payment Prevention on Invoice Outstanding', async () => {
    // testInvoiceId hiện có netPayable = invoiceGross, chưa thanh toán đồng nào
    // 2 thu ngân cố tình cùng lúc thu payEach = 0.7 * invoiceGross (tổng 1.4 * invoiceGross > invoiceGross)
    payEach = Math.round(invoiceGross * 0.7);
    const [payA, payB] = await Promise.all([
      request(app)
        .post(`/api/billing/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${cashier1Token}`)
        .send({ amount: payEach, method: 'CASH' }),
      request(app)
        .post(`/api/billing/invoices/${testInvoiceId}/pay`)
        .set('Authorization', `Bearer ${cashier2Token}`)
        .send({ amount: payEach, method: 'CASH' }),
    ]);

    const statuses = [payA.status, payB.status];
    assert.ok(statuses.includes(200), 'Phải có 1 giao dịch thanh toán thành công');
    assert.ok(statuses.includes(409), 'Giao dịch thu vượt số nợ phải bị từ chối 409 (AT-02)');

    const failedPay = payA.status === 409 ? payA : payB;
    assert.equal(failedPay.body.error.code, 'PAYMENT_EXCEEDS_OUTSTANDING');

    const successPay = payA.status === 200 ? payA : payB;
    testPaymentTxnId = successPay.body.data.transaction.paymentTransactionId;
    assert.equal(successPay.body.data.invoiceStatus, 'PARTIALLY_PAID');
    assert.equal(successPay.body.data.remainingOutstanding, invoiceGross - payEach);
  });

  await t.test('Subtest 6: Refunds & Maker-Checker Rule (AT-20)', async () => {
    // testPaymentTxnId đã thu payEach
    // 1. Chặn hoàn tiền vượt quá số tiền thực thu (AT-20)
    const overRefund = await request(app)
      .post(`/api/billing/payments/${testPaymentTxnId}/refunds`)
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ amount: payEach + 100000, reason: 'Yêu cầu hoàn vượt số tiền' });
    assert.equal(overRefund.status, 400);
    assert.equal(overRefund.body.error.code, 'REFUND_EXCEEDS_PAYMENT');

    // 2. Thu ngân 1 tạo yêu cầu hoàn tiền hợp lệ
    const refundAmt = Math.min(50000, Math.round(payEach * 0.3));
    const reqRefund = await request(app)
      .post(`/api/billing/payments/${testPaymentTxnId}/refunds`)
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ amount: refundAmt, reason: 'Khách hàng không thực hiện hết các bước' });
    assert.equal(reqRefund.status, 201);
    const refundId = reqRefund.body.data.refundId;

    // 3. Maker-Checker: Thu ngân 1 (người tạo) tự phê duyệt -> BỊ CHẶN 403
    const selfApprove = await request(app)
      .post(`/api/billing/refunds/${refundId}/approve`)
      .set('Authorization', `Bearer ${cashier1Token}`);
    assert.equal(selfApprove.status, 403);

    // 4. Quản trị viên (Admin) phê duyệt -> THÀNH CÔNG
    const adminApprove = await request(app)
      .post(`/api/billing/refunds/${refundId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminApprove.status, 200);
    assert.equal(adminApprove.body.data.status, 'APPROVED');
  });

  await t.test('Subtest 7: Discount Approvals & Maker-Checker Rule (AT-18, AT-20)', async () => {
    // 1. Thu ngân 1 tạo yêu cầu giảm giá 50.000 đ
    const discountReq = await request(app)
      .post(`/api/billing/invoices/${testInvoiceId}/discount-approvals`)
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ amount: 50000, reason: 'Khách hàng thân thiết' });
    assert.equal(discountReq.status, 201);
    const approvalId = discountReq.body.data.discountApprovalId;

    // 2. Thu ngân 1 tự phê duyệt giảm giá do mình tạo -> BỊ CHẶN 403 (Maker-Checker)
    const selfApproveDiscount = await request(app)
      .post(`/api/billing/discount-approvals/${approvalId}/approve`)
      .set('Authorization', `Bearer ${cashier1Token}`);
    assert.equal(selfApproveDiscount.status, 403);
    assert.equal(selfApproveDiscount.body.error.code, 'APPROVER_ROLE_REQUIRED');

    // 3. Admin phê duyệt -> THÀNH CÔNG
    const adminApproveDiscount = await request(app)
      .post(`/api/billing/discount-approvals/${approvalId}/approve`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.equal(adminApproveDiscount.status, 200);
    assert.equal(adminApproveDiscount.body.data.status, 'APPROVED');
  });

  await t.test('Subtest 8: Close Cashier Shift & Cash Reconciliation', async () => {
    // Thu ngân 1 đóng ca
    const closeRes = await request(app)
      .post(`/api/billing/shifts/${createdShiftId}/close`)
      .set('Authorization', `Bearer ${cashier1Token}`)
      .send({ actualCash: 1300000 }); // 500.000 opening + 800.000 collected
    assert.equal(closeRes.status, 200);
    assert.equal(closeRes.body.data.status, 'CLOSED');
    assert.ok(closeRes.body.data.expectedCash >= 500000);
  });

  await database.close();
});
