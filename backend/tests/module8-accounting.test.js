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
import { initAccountingModels } from '../src/models/accounting-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createCatalogRepository } from '../src/repositories/catalog-repository.js';
import { createPatientVisitRepository } from '../src/repositories/patient-visit-repository.js';
import { createClinicalRepository } from '../src/repositories/clinical-repository.js';
import { createBillingRepository } from '../src/repositories/billing-repository.js';
import { createInventoryRepository } from '../src/repositories/inventory-repository.js';
import { createAccountingRepository } from '../src/repositories/accounting-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createUserService } from '../src/services/user-service.js';
import { createCatalogService } from '../src/services/catalog-service.js';
import { createPatientVisitService } from '../src/services/patient-visit-service.js';
import { createClinicalService } from '../src/services/clinical-service.js';
import { createBillingService } from '../src/services/billing-service.js';
import { createInventoryService } from '../src/services/inventory-service.js';
import { createAccountingService } from '../src/services/accounting-service.js';
import { createAuthController } from '../src/controllers/auth-controller.js';
import { createUserController } from '../src/controllers/user-controller.js';
import { createCatalogController } from '../src/controllers/catalog-controller.js';
import { createPatientVisitController } from '../src/controllers/patient-visit-controller.js';
import { createClinicalController } from '../src/controllers/clinical-controller.js';
import { createBillingController } from '../src/controllers/billing-controller.js';
import { createInventoryController } from '../src/controllers/inventory-controller.js';
import { createAccountingController } from '../src/controllers/accounting-controller.js';
import { createAuthRoutes } from '../src/routes/auth-routes.js';
import { createUserRoutes } from '../src/routes/user-routes.js';
import { createCatalogRoutes } from '../src/routes/catalog-routes.js';
import { createPatientRoutes } from '../src/routes/patient-routes.js';
import { createVisitRoutes } from '../src/routes/visit-routes.js';
import { createClinicalRoutes } from '../src/routes/clinical-routes.js';
import { createBillingRoutes } from '../src/routes/billing-routes.js';
import { createInventoryRoutes } from '../src/routes/inventory-routes.js';
import { createAccountingRoutes } from '../src/routes/accounting-routes.js';
import { createApp } from '../src/app.js';

test('Module 8 - Accounting: Cash Shift Discrepancies (AT-09), Accounting Period Closing (AT-10), Double-Entry Bookkeeping', async (t) => {
  const database = createDatabase(env.db);

  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);
  const clinicalModels = initClinicalModels(database.sequelize, userModels, catalogModels, patientVisitModels);
  const billingModels = initBillingModels(database.sequelize, userModels, catalogModels, patientVisitModels, clinicalModels);
  const inventoryModels = initInventoryModels(database.sequelize, userModels, patientVisitModels, clinicalModels);
  const accountingModels = initAccountingModels(database.sequelize, {
    userModels,
    billingModels,
    catalogModels,
    branchModels: patientVisitModels,
  });

  const userRepo = createUserRepository({ sequelize: database.sequelize, models: userModels });
  const catalogRepo = createCatalogRepository({ sequelize: database.sequelize, models: catalogModels });
  const patientVisitRepo = createPatientVisitRepository({ sequelize: database.sequelize, models: patientVisitModels, userModels, catalogModels });
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
  const accountingRepo = createAccountingRepository({
    sequelize: database.sequelize,
    models: accountingModels,
    billingModels,
    userModels,
    catalogModels,
  });

  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });
  const userService = createUserService({ userRepo });
  const catalogService = createCatalogService({ catalogRepo, userRepo });
  const patientVisitService = createPatientVisitService({ patientVisitRepo, userRepo });
  const clinicalService = createClinicalService({ clinicalRepo, patientVisitRepo, userRepo });
  const billingService = createBillingService({ billingRepo, userRepo });
  const inventoryService = createInventoryService({ inventoryRepo, userRepo });
  const accountingService = createAccountingService({ accountingRepo, userRepo });

  const authController = createAuthController({ authService });
  const userController = createUserController({ userService });
  const catalogController = createCatalogController({ catalogService });
  const patientVisitController = createPatientVisitController({ patientVisitService });
  const clinicalController = createClinicalController({ clinicalService });
  const billingController = createBillingController({ billingService });
  const inventoryController = createInventoryController({ inventoryService });
  const accountingController = createAccountingController({ accountingService });

  const authRoutes = createAuthRoutes({ authController, authMiddlewares });
  const userRoutes = createUserRoutes({ userController, authMiddlewares });
  const catalogRoutes = createCatalogRoutes({ catalogController, authMiddlewares });
  const patientRoutes = createPatientRoutes({ patientVisitController, authMiddlewares });
  const visitRoutes = createVisitRoutes({ patientVisitController, authMiddlewares });
  const clinicalRoutes = createClinicalRoutes({ clinicalController, authMiddlewares });
  const billingRoutes = createBillingRoutes({ billingController, authMiddlewares });
  const inventoryRoutes = createInventoryRoutes({ inventoryController, authMiddlewares });
  const accountingRoutes = createAccountingRoutes({ accountingController, authMiddlewares });

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
    accountingRoutes,
  });

  let adminToken = '';
  let accountantToken = '';
  let cashierToken = '';
  let approverToken = '';
  let branchId = '';
  let testShiftId = '';
  let activePeriodId = '';
  let closedPeriodId = '';
  let ruleVersionId = '';
  let accountCashId = '';
  let accountRevId = '';

  await t.test('Setup: Login Admin, Create Accountant, Cashier & Approver, Open Cash Shift', async () => {
    // 1. Login Admin
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Admin1234@' });
    if (adminRes.status !== 200) {
      console.log('LOGIN ERROR:', adminRes.status, adminRes.body);
    }
    assert.equal(adminRes.status, 200);
    adminToken = adminRes.body.data.token;
    branchId = adminRes.body.data.user.branchId;

    // 2. Create Accountant (IsApprover = false)
    const accountantRoleId = '215C41D3-E4C7-F111-B1C3-C0A5E8AB4284';
    const accUsername = 'acc_' + Math.floor(1000 + Math.random() * 9000);
    const accRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: accUsername,
        displayName: 'Kế toán viên Minh',
        password: 'Accountant1234@',
        roleId: accountantRoleId,
        branchId,
        isApprover: false,
      });
    assert.equal(accRes.status, 201);

    const loginAcc = await request(app)
      .post('/api/auth/login')
      .send({ username: accUsername, password: 'Accountant1234@' });
    assert.equal(loginAcc.status, 200);
    accountantToken = loginAcc.body.data.token;

    // 3. Create Cashier (Receptionist Role)
    const cashierRoleId = '1F5C41D3-E4C7-F111-B1C3-C0A5E8AB4284';
    const cashUsername = 'csh_' + Math.floor(1000 + Math.random() * 9000);
    const cashRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: cashUsername,
        displayName: 'Thu ngân Lan',
        password: 'Cashier1234@',
        roleId: cashierRoleId,
        branchId,
        isApprover: false,
      });
    assert.equal(cashRes.status, 201);

    const loginCash = await request(app)
      .post('/api/auth/login')
      .send({ username: cashUsername, password: 'Cashier1234@' });
    assert.equal(loginCash.status, 200);
    cashierToken = loginCash.body.data.token;

    // 4. Create Approver (Kế toán trưởng / IsApprover = true)
    const appUsername = 'chief_' + Math.floor(1000 + Math.random() * 9000);
    const appRes = await request(app)
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: appUsername,
        displayName: 'Kế toán trưởng Hùng',
        password: 'Approver1234@',
        roleId: accountantRoleId,
        branchId,
        isApprover: true,
      });
    assert.equal(appRes.status, 201);

    const loginApp = await request(app)
      .post('/api/auth/login')
      .send({ username: appUsername, password: 'Approver1234@' });
    assert.equal(loginApp.status, 200);
    approverToken = loginApp.body.data.token;

    // 5. Open Cash Shift with 500,000 VND
    const shiftRes = await request(app)
      .post('/api/billing/shifts/open')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        branchId,
        openingFloat: 500000,
      });
    assert.equal(shiftRes.status, 201);
    testShiftId = shiftRes.body.data.cashShiftId;

    // 6. Get or create Chart of Accounts (TK 111 & TK 511)
    const accListRes = await request(app)
      .get('/api/accounting/accounts')
      .set('Authorization', `Bearer ${accountantToken}`);
    const accounts = accListRes.body.data || [];

    let a111 = accounts.find((a) => a.code === '111');
    if (!a111) {
      const create111 = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          code: '111',
          name: 'Tiền mặt',
          accountType: 'ASSET',
        });
      a111 = create111.body.data;
    }
    accountCashId = a111.accountId;

    let a511 = accounts.find((a) => a.code === '511');
    if (!a511) {
      const create511 = await request(app)
        .post('/api/accounting/accounts')
        .set('Authorization', `Bearer ${approverToken}`)
        .send({
          code: '511',
          name: 'Doanh thu bán hàng và cung cấp dịch vụ',
          accountType: 'REVENUE',
        });
      a511 = create511.body.data;
    }
    accountRevId = a511.accountId;

    // 7. Find or create an AccountingRuleVersion
    const { AccountingRuleVersion } = accountingModels;
    let rule = await AccountingRuleVersion.findOne();
    if (!rule) {
      rule = await AccountingRuleVersion.create({
        eventType: 'SERVICE_PAYMENT',
        versionNo: 1,
        ruleJson: JSON.stringify({ debit: '111', credit: '511' }),
        effectiveFrom: new Date('2026-01-01'),
        effectiveTo: new Date('2030-12-31'),
        status: 'APPROVED',
        createdBy: 'admin',
      });
    }
    ruleVersionId = rule.accountingRuleVersionId;
  });

  await t.test('Subtest 1: AT-09 Cash Shift Discrepancies, Reconciliation & Maker-Checker Resolution', async () => {
    // 1. Kiểm đếm thực tế tiền mặt cuối ca:
    // Dự kiến trong ca: 500.000 đ
    // Thực tế đếm được: 450.000 đ (Thiếu 50.000 đ)
    // 1 tờ 200k, 2 tờ 100k, 1 tờ 50k = 450.000 đ
    const counts = [
      { denomination: 200000, quantity: 1 },
      { denomination: 100000, quantity: 2 },
      { denomination: 50000, quantity: 1 },
    ];

    // AT-09: Khi phát hiện chênh lệch, cố tình KHÔNG nhập lý do giải trình -> BỊ TỪ CHỐI 400
    const rejectNoReason = await request(app)
      .post(`/api/accounting/shifts/${testShiftId}/reconcile`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        counts,
        reason: '',
      });
    assert.equal(rejectNoReason.status, 400);
    assert.equal(rejectNoReason.body.error.code, 'DISCREPANCY_REASON_REQUIRED');

    // AT-09: Nhập đầy đủ lý do giải trình chênh lệch -> Thành công ghi nhận PENDING
    const reconcileRes = await request(app)
      .post(`/api/accounting/shifts/${testShiftId}/reconcile`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        counts,
        reason: 'Thối nhầm tiền thừa 50.000 đ cho bệnh nhân nhổ răng',
      });
    assert.equal(reconcileRes.status, 200);
    assert.equal(reconcileRes.body.data.hasDiscrepancy, true);
    assert.equal(reconcileRes.body.data.discrepancyAmount, -50000);
    assert.ok(reconcileRes.body.data.discrepancy);
    assert.equal(reconcileRes.body.data.discrepancy.status, 'PENDING');

    const discrepancyId = reconcileRes.body.data.discrepancy.cashDiscrepancyId;

    // Maker-Checker AT-09: Thu ngân Lan (người tạo biên bản chênh lệch) tự phê duyệt -> BỊ CHẶN 403
    const selfApprove = await request(app)
      .post(`/api/accounting/discrepancies/${discrepancyId}/resolve`)
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({ status: 'APPROVED' });
    assert.equal(selfApprove.status, 403);

    // Kế toán viên thường (isApprover = false) duyệt -> BỊ CHẶN 403 (yêu cầu Kế toán trưởng)
    const regularAccApprove = await request(app)
      .post(`/api/accounting/discrepancies/${discrepancyId}/resolve`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({ status: 'APPROVED' });
    assert.equal(regularAccApprove.status, 403);
    assert.equal(regularAccApprove.body.error.code, 'APPROVER_ROLE_REQUIRED');

    // Kế toán trưởng Hùng (isApprover = true) phê duyệt biên bản chênh lệch -> THÀNH CÔNG 200 OK
    const chiefApprove = await request(app)
      .post(`/api/accounting/discrepancies/${discrepancyId}/resolve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        status: 'APPROVED',
        resolutionNote: 'Đồng ý duyệt trừ vào quỹ rủi ro ca trực theo quy chế nội bộ',
      });
    assert.equal(chiefApprove.status, 200);
    assert.equal(chiefApprove.body.data.status, 'APPROVED');
    assert.ok(chiefApprove.body.data.resolvedAt);
  });

  await t.test('Subtest 2: AT-10 Accounting Period Closing & Backdated Posting Prohibition', async () => {
    // 1. Tạo kỳ kế toán MỞ cho tháng hiện tại (Tháng 10/2026)
    const openPeriodCode = 'PER-OPEN-' + Math.floor(1000 + Math.random() * 9000);
    const openPeriodRes = await request(app)
      .post('/api/accounting/periods')
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        code: openPeriodCode,
        startsOn: '2026-10-01',
        endsOn: '2026-10-31',
      });
    assert.equal(openPeriodRes.status, 201);
    assert.equal(openPeriodRes.body.data.status, 'OPEN');
    activePeriodId = openPeriodRes.body.data.accountingPeriodId;

    // 2. Tạo kỳ kế toán tháng trước (Tháng 09/2026)
    const closedPeriodCode = 'PER-SEP-' + Math.floor(1000 + Math.random() * 9000);
    const prevPeriodRes = await request(app)
      .post('/api/accounting/periods')
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        code: closedPeriodCode,
        startsOn: '2026-09-01',
        endsOn: '2026-09-30',
      });
    assert.equal(prevPeriodRes.status, 201);
    closedPeriodId = prevPeriodRes.body.data.accountingPeriodId;

    // 3. Khóa sổ kỳ kế toán tháng 9 (AT-10)
    const closeRes = await request(app)
      .post(`/api/accounting/periods/${closedPeriodId}/close`)
      .set('Authorization', `Bearer ${approverToken}`);
    assert.equal(closeRes.status, 200);
    assert.equal(closeRes.body.data.status, 'CLOSED');
    assert.ok(closeRes.body.data.closedAt);

    // 4. AT-10: Cố tình lập bút toán ghi lùi ngày vào kỳ đã khóa sổ (2026-09-15) -> BỊ TỪ CHỐI 400
    const backdatedPostRes = await request(app)
      .post('/api/accounting/journal-entries')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        entryNo: 'PKT-BACKDATED-' + Math.floor(1000 + Math.random() * 9000),
        accountingRuleVersionId: ruleVersionId,
        accountingPeriodId: closedPeriodId,
        branchId,
        documentDate: '2026-09-15',
        postingDate: '2026-09-15',
        lines: [
          { accountId: accountCashId, debit: 500000, credit: 0 },
          { accountId: accountRevId, debit: 0, credit: 500000 },
        ],
      });
    assert.equal(backdatedPostRes.status, 400);
    assert.equal(backdatedPostRes.body.error.code, 'PERIOD_ALREADY_CLOSED_CANNOT_POST');

    // 5. Lập bút toán vào kỳ đang MỞ (2026-10-15) -> THÀNH CÔNG 201 CREATED
    const validPostRes = await request(app)
      .post('/api/accounting/journal-entries')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        entryNo: 'PKT-VALID-' + Math.floor(1000 + Math.random() * 9000),
        accountingRuleVersionId: ruleVersionId,
        accountingPeriodId: activePeriodId,
        branchId,
        documentDate: '2026-10-15',
        postingDate: '2026-10-15',
        lines: [
          { accountId: accountCashId, debit: 1000000, credit: 0, description: 'Thu tiền mặt khám chữa răng' },
          { accountId: accountRevId, debit: 0, credit: 1000000, description: 'Doanh thu dịch vụ khám chữa răng' },
        ],
      });
    assert.equal(validPostRes.status, 201);
    assert.equal(validPostRes.body.data.entry.status, 'DRAFT');
  });

  await t.test('Subtest 3: Double-Entry Balanced Enforcement & Maker-Checker on Journal Posting', async () => {
    // 1. Lập bút toán KHÔNG CÂN BẰNG (Tổng Nợ 1.000.000 đ, Tổng Có 800.000 đ)
    const unbalancedRes = await request(app)
      .post('/api/accounting/journal-entries')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        entryNo: 'PKT-UNBAL-' + Math.floor(1000 + Math.random() * 9000),
        accountingRuleVersionId: ruleVersionId,
        accountingPeriodId: activePeriodId,
        branchId,
        documentDate: '2026-10-16',
        postingDate: '2026-10-16',
        lines: [
          { accountId: accountCashId, debit: 1000000, credit: 0 },
          { accountId: accountRevId, debit: 0, credit: 800000 },
        ],
      });
    assert.equal(unbalancedRes.status, 201);
    const unbalancedEntryId = unbalancedRes.body.data.entry.journalEntryId;

    // Kế toán trưởng thử duyệt ghi sổ bút toán không cân bằng -> BỊ CHẶN BỞI TRIGGER TR_JournalEntries_PostBalanced
    const tryPostUnbalanced = await request(app)
      .post(`/api/accounting/journal-entries/${unbalancedEntryId}/post`)
      .set('Authorization', `Bearer ${approverToken}`);
    // Database trigger ném lỗi 51201 hoặc 500 do SQL Server rollback
    assert.equal(tryPostUnbalanced.status >= 400, true);

    // 2. Lập bút toán CÂN BẰNG hoàn toàn (Nợ 2.000.000 đ = Có 2.000.000 đ) do Kế toán viên lập
    const balancedRes = await request(app)
      .post('/api/accounting/journal-entries')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        entryNo: 'PKT-BALANCED-' + Math.floor(1000 + Math.random() * 9000),
        accountingRuleVersionId: ruleVersionId,
        accountingPeriodId: activePeriodId,
        branchId,
        documentDate: '2026-10-16',
        postingDate: '2026-10-16',
        lines: [
          { accountId: accountCashId, debit: 2000000, credit: 0, description: 'Thu tiền mặt điều trị tủy' },
          { accountId: accountRevId, debit: 0, credit: 2000000, description: 'Ghi nhận doanh thu điều trị tủy' },
        ],
      });
    assert.equal(balancedRes.status, 201);
    const balancedEntryId = balancedRes.body.data.entry.journalEntryId;

    // Maker-Checker: Kế toán viên (người lập) tự duyệt ghi sổ bút toán của mình -> BỊ TỪ CHỐI 403
    const selfPostRes = await request(app)
      .post(`/api/accounting/journal-entries/${balancedEntryId}/post`)
      .set('Authorization', `Bearer ${accountantToken}`);
    assert.equal(selfPostRes.status, 403);
    assert.equal(selfPostRes.body.error.code, 'APPROVER_ROLE_REQUIRED');

    // Kế toán trưởng Hùng phê duyệt ghi sổ -> THÀNH CÔNG 200 OK
    const postRes = await request(app)
      .post(`/api/accounting/journal-entries/${balancedEntryId}/post`)
      .set('Authorization', `Bearer ${approverToken}`);
    assert.equal(postRes.status, 200);
    assert.equal(postRes.body.data.status, 'POSTED');
    assert.ok(postRes.body.data.postedAt);
  });

  await database.close();
});
