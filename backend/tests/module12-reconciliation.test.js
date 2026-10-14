import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import request from 'supertest';
import Decimal from 'decimal.js';
import { env } from '../src/config/load-env.js';
import { createDatabase } from '../src/config/db.js';
import { initUserModels } from '../src/models/user-models.js';
import { initCatalogModels } from '../src/models/catalog-models.js';
import { initPatientVisitModels } from '../src/models/patient-visit-models.js';
import { initOperationsModels } from '../src/models/operations-models.js';
import { initReconciliationModels } from '../src/models/reconciliation-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createReconciliationRepository } from '../src/repositories/reconciliation-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createReconciliationService } from '../src/services/reconciliation-service.js';
import { createReconciliationController } from '../src/controllers/reconciliation-controller.js';
import { createReconciliationRoutes } from '../src/routes/reconciliation-routes.js';
import { createApp } from '../src/app.js';

test('Module 12 - Assets Maintenance, Daily Reconciliation, AT-11 Post-Closing Refund & AT-19 Integrity', async (t) => {
  const database = createDatabase(env.db);

  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);
  const operationsModels = initOperationsModels(database.sequelize, {
    userModels,
    patientVisitModels,
  });
  const reconciliationModels = initReconciliationModels(database.sequelize, {
    userModels,
    patientVisitModels,
    operationsModels,
  });

  const userRepo = createUserRepository({ sequelize: database.sequelize, models: userModels });
  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });

  const reconciliationRepo = createReconciliationRepository({
    sequelize: database.sequelize,
    models: reconciliationModels,
  });
  const reconciliationService = createReconciliationService({ reconciliationRepo });
  const reconciliationController = createReconciliationController({ reconciliationService });
  const reconciliationRoutes = createReconciliationRoutes({ reconciliationController, authMiddlewares });

  const app = createApp({
    config: env,
    health: { isReady: () => true, checkDatabase: () => true },
    reconciliationRoutes,
  });

  let adminToken = '';
  let accountantToken = '';
  let approverToken = '';
  let warehouseToken = '';

  const randSuffix = crypto.randomBytes(3).toString('hex');
  let branchId = '';
  let assetId = '';
  let openPeriodId = '';
  let paymentTxnId = '';
  let reconciliationItemId = '';
  let testVisitId = '';

  t.before(async () => {
    // 1. Login users
    const adm = await authService.login({ username: 'admin', password: 'Admin1234@' });
    adminToken = adm.token;

    const acc = await authService.login({ username: 'accountant', password: 'Accountant1234@' });
    accountantToken = acc.token;

    const appv = await authService.login({ username: 'approver', password: 'Approver1234@' });
    approverToken = appv.token;

    const wh = await authService.login({ username: 'warehouse', password: 'WarehouseManager1234@' });
    warehouseToken = wh.token;

    // 2. Fetch seed branch
    const [branches] = await database.sequelize.query('SELECT TOP 1 BranchId FROM dbo.Branches');
    branchId = branches[0].BranchId;

    // 3. Create test Asset
    const [assetRows] = await database.sequelize.query(`
      INSERT INTO dbo.Assets (AssetId, BranchId, AssetCode, Name, AssetType, Status, CreatedBy)
      OUTPUT INSERTED.AssetId
      VALUES (NEWID(), '${branchId}', 'CHAIR-${randSuffix}', N'Ghế nha khoa Sirona Intego ${randSuffix}', 'DENTAL_CHAIR', 'ACTIVE', 'admin')
    `);
    assetId = assetRows[0].AssetId;

    // 4. Ensure an OPEN accounting period exists
    const [periodRows] = await database.sequelize.query(`
      SELECT TOP 1 AccountingPeriodId FROM dbo.AccountingPeriods WHERE Status = 'OPEN'
    `);
    if (periodRows.length > 0) {
      openPeriodId = periodRows[0].AccountingPeriodId;
    } else {
      const [newPeriod] = await database.sequelize.query(`
        INSERT INTO dbo.AccountingPeriods (AccountingPeriodId, BranchId, Code, StartsOn, EndsOn, Status, CreatedBy)
        OUTPUT INSERTED.AccountingPeriodId
        VALUES (NEWID(), '${branchId}', 'PER-REC-${randSuffix}', '2026-10-01', '2026-10-31', 'OPEN', 'admin')
      `);
      openPeriodId = newPeriod[0].AccountingPeriodId;
    }

    // 5. Create a test invoice & payment transaction for AT-11 refund test
    const [patientRows] = await database.sequelize.query('SELECT TOP 1 PatientId FROM dbo.Patients');
    const patientId = patientRows[0].PatientId;

    const [visitRows] = await database.sequelize.query(`
      SELECT TOP 1 VisitId FROM dbo.Visits WHERE PatientId = '${patientId}'
    `);
    if (visitRows.length > 0) {
      testVisitId = visitRows[0].VisitId;
    } else {
      const [newVisit] = await database.sequelize.query(`
        INSERT INTO dbo.Visits (VisitId, PatientId, BranchId, CheckInAt, Status, CreatedBy)
        OUTPUT INSERTED.VisitId
        VALUES (NEWID(), '${patientId}', '${branchId}', SYSUTCDATETIME(), 'IN_PROGRESS', 'admin')
      `);
      testVisitId = newVisit[0].VisitId;
    }

    const [invRows] = await database.sequelize.query(`
      INSERT INTO dbo.Invoices (InvoiceId, InvoiceNo, VisitId, PatientId, Gross, ApprovedDiscount, Tax, RoundingAdjustment, Status, IssuedAt, CreatedBy)
      OUTPUT INSERTED.InvoiceId
      VALUES (NEWID(), 'INV-REC-${randSuffix}', '${testVisitId}', '${patientId}', 1000000.00, 0, 0, 0, 'PAID', SYSUTCDATETIME(), 'admin')
    `);
    const invoiceId = invRows[0].InvoiceId;

    const [pmtRows] = await database.sequelize.query(`
      INSERT INTO dbo.PaymentTransactions (PaymentTransactionId, InvoiceId, PatientId, Amount, Method, Status, ConfirmedAt, CreatedBy)
      OUTPUT INSERTED.PaymentTransactionId
      VALUES (NEWID(), '${invoiceId}', '${patientId}', 1000000.00, 'BANK_TRANSFER', 'CONFIRMED', SYSUTCDATETIME(), 'admin')
    `);
    paymentTxnId = pmtRows[0].PaymentTransactionId;
  });

  t.after(async () => {
    await database.close();
  });

  // SUBTEST 1: Bảo trì thiết bị y tế (MaintenanceLogs)
  await t.test('1. Ghi nhật ký bảo trì thiết bị PASS và FAIL (tự động chuyển trạng thái & cảnh báo)', async () => {
    // 1.1 Bảo trì định kỳ PASS
    const passRes = await request(app)
      .post('/api/reconciliation/maintenance-logs')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        assetId,
        maintenanceType: 'PERIODIC_INSPECTION',
        performedAt: '2026-10-15T08:00:00Z',
        result: 'PASS',
        nextDueAt: '2027-04-15T08:00:00Z',
        details: 'Kiểm tra đường cấp nước và hơi ghế nha khoa hoạt động tốt',
        performedBy: 'Kỹ sư thiết bị y tế Nguyễn Văn Kỹ',
      });

    assert.equal(passRes.status, 201);
    assert.equal(passRes.body.result, 'PASS');

    // 1.2 Kiểm định hiệu chuẩn FAIL
    const failRes = await request(app)
      .post('/api/reconciliation/maintenance-logs')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        assetId,
        maintenanceType: 'CALIBRATION',
        performedAt: '2026-10-15T09:00:00Z',
        result: 'FAIL',
        details: 'Van áp lực ghế bị rò rỉ khí nén, không đạt chuẩn vận hành',
        performedBy: 'Trung tâm kiểm định Vinacontrol',
      });

    assert.equal(failRes.status, 201);
    assert.equal(failRes.body.result, 'FAIL');

    // Kiểm tra Asset chuyển sang trạng thái MAINTENANCE
    const [updatedAsset] = await database.sequelize.query(`
      SELECT Status FROM dbo.Assets WHERE AssetId = '${assetId}'
    `);
    assert.equal(updatedAsset[0].Status, 'MAINTENANCE');
  });

  // SUBTEST 2: Quy trình đối soát cuối ngày tự động
  await t.test('2. Chạy quy trình đối soát cuối ngày quét toàn diện và tự động phát hiện sai lệch (ReconciliationItems)', async () => {
    // 2.1 Tạo 1 chu kỳ tiệt trùng và 1 gói tiệt trùng cách ly
    let cycleId;
    const [cycleRows] = await database.sequelize.query('SELECT TOP 1 SterilizationCycleId FROM dbo.SterilizationCycles');
    if (cycleRows.length > 0) {
      cycleId = cycleRows[0].SterilizationCycleId;
    } else {
      const [newCycle] = await database.sequelize.query(`
        INSERT INTO dbo.SterilizationCycles (SterilizationCycleId, AssetId, CycleNo, StartedAt, Status, CreatedBy)
        OUTPUT INSERTED.SterilizationCycleId
        VALUES (NEWID(), '${assetId}', 'CYC-${randSuffix}', SYSUTCDATETIME(), 'COMPLETED', 'admin')
      `);
      cycleId = newCycle[0].SterilizationCycleId;
    }

    await database.sequelize.query(`
      INSERT INTO dbo.InstrumentPacks (InstrumentPackId, PackCode, SterilizationCycleId, PackType, Status, SterileFrom, ExpiresAt, CreatedBy)
      VALUES (NEWID(), 'PACK-ANOMALY-${randSuffix}', '${cycleId}', 'SURGICAL', 'QUARANTINED', DATEADD(day, -10, SYSUTCDATETIME()), DATEADD(day, -1, SYSUTCDATETIME()), 'admin')
    `);

    // 2.2 Tạo 1 đơn Labo quá hạn
    const [supplierRows] = await database.sequelize.query('SELECT TOP 1 SupplierId FROM dbo.Suppliers');
    const supplierId = supplierRows[0].SupplierId;
    const [docRows] = await database.sequelize.query(`
      SELECT TOP 1 u.UserId FROM dbo.Users u
      JOIN dbo.Roles r ON u.RoleId = r.RoleId
      WHERE r.Code = 'DOCTOR'
    `);
    const doctorUserId = docRows[0].UserId;

    await database.sequelize.query(`
      INSERT INTO dbo.LabOrders (LabOrderId, VisitId, DoctorId, SupplierId, Instructions, DueAt, Status, CreatedBy)
      VALUES (NEWID(), '${testVisitId}', '${doctorUserId}', '${supplierId}', N'Gia công mão sứ Cercon quá hạn', '2026-10-01T00:00:00Z', 'SENT', 'admin')
    `);

    // Kế toán chạy quy trình đối soát cuối ngày
    const res = await request(app)
      .post('/api/reconciliation/run')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        branchId,
        date: '2026-10-15',
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.newAnomaliesCount >= 2);
    assert.ok(Array.isArray(res.body.items));

    // Lấy danh sách items để kiểm tra
    const itemsRes = await request(app)
      .get(`/api/reconciliation/items?branchId=${branchId}&status=OPEN`)
      .set('Authorization', `Bearer ${accountantToken}`);

    assert.equal(itemsRes.status, 200);
    assert.ok(itemsRes.body.length > 0);
    reconciliationItemId = itemsRes.body[0].reconciliationItemId;
  });

  // SUBTEST 3: Xử lý giải quyết sai lệch đối soát
  await t.test('3. Phân xử giải quyết sai lệch đối soát (OPEN -> RESOLVED)', async () => {
    const res = await request(app)
      .post(`/api/reconciliation/items/${reconciliationItemId}/resolve`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        status: 'RESOLVED',
        resolution: 'Đã lập biên bản kỹ thuật và chuyển nhà cung cấp bảo hành thay mới van áp suất',
      });

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'RESOLVED');
    assert.ok(res.body.resolution.includes('Đã lập biên bản kỹ thuật'));
  });

  // SUBTEST 4: Tiêu chí AT-11 - Hoàn tiền sau khi khóa sổ
  await t.test('4. [AT-11] Hoàn tiền sau khi khóa sổ: Chặn sửa kỳ cũ; ghi điều chỉnh ở kỳ mở liên kết chứng từ gốc', async () => {
    // 4.1 Cố tình hoàn vượt số tiền đã thu -> Bị chặn 400
    const overRefund = await request(app)
      .post('/api/reconciliation/post-closing-refund')
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        paymentTransactionId: paymentTxnId,
        refundAmount: '2000000.00', // Đã thu 1tr, hoàn 2tr -> Vượt
        reason: 'Thử hoàn vượt thực thu',
        currentOpenPeriodId: openPeriodId,
      });

    assert.equal(overRefund.status, 400);
    assert.equal(overRefund.body.error.code, 'REFUND_EXCEEDS_PAYMENT');

    // 4.2 Nhân viên thường không có quyền duyệt hoàn sau khóa sổ -> 403
    const forbiddenRefund = await request(app)
      .post('/api/reconciliation/post-closing-refund')
      .set('Authorization', `Bearer ${accountantToken}`) // accountant không có isApprover
      .send({
        paymentTransactionId: paymentTxnId,
        refundAmount: '300000.00',
        reason: 'Hoàn tiền không đủ thẩm quyền',
        currentOpenPeriodId: openPeriodId,
      });

    assert.equal(forbiddenRefund.status, 403);
    assert.equal(forbiddenRefund.body.error.code, 'APPROVER_ROLE_REQUIRED');

    // 4.3 Kế toán trưởng phê duyệt hoàn tiền sau khóa sổ hợp lệ (300,000đ)
    const validRefund = await request(app)
      .post('/api/reconciliation/post-closing-refund')
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        paymentTransactionId: paymentTxnId,
        refundAmount: '300000.00',
        reason: 'Bệnh nhân điều chỉnh kế hoạch điều trị sau khi kỳ kế toán trước đã đóng',
        currentOpenPeriodId: openPeriodId,
      });

    assert.equal(validRefund.status, 201);
    assert.ok(validRefund.body.refundId);
    assert.equal(new Decimal(validRefund.body.refundAmount).toFixed(2), '300000.00');
    assert.equal(validRefund.body.originalPaymentTransactionId, paymentTxnId);

    // Kiểm tra trong CSDL: bản ghi Refunds có PaymentTransactionId liên kết chính xác paymentTransactionId
    const [refundRows] = await database.sequelize.query(`
      SELECT RefundId, PaymentTransactionId, Status, Amount FROM dbo.Refunds WHERE RefundId = '${validRefund.body.refundId}'
    `);
    assert.equal(refundRows[0].PaymentTransactionId, paymentTxnId);
    assert.equal(refundRows[0].Status, 'APPROVED');
  });

  // SUBTEST 5: Tiêu chí AT-19 - Kiểm tra toàn vẹn CSDL và chữ ký số EMR
  await t.test('5. [AT-19] Kiểm tra toàn vẹn cơ sở dữ liệu: Xác thực mã băm chữ ký số EMR & khóa ngoại', async () => {
    const res = await request(app)
      .get('/api/reconciliation/integrity-check')
      .set('Authorization', `Bearer ${accountantToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'INTEGRITY_VERIFIED');
    assert.equal(res.body.emrSignatures.valid, true);
    assert.equal(res.body.foreignKeyIntegrity.valid, true);
  });

  // SUBTEST 6: Báo cáo đối soát tổng hợp cuối ngày
  await t.test('6. Xuất Báo cáo Đối soát Tổng hợp Cuối ngày đầy đủ chỉ số nghiệp vụ chuẩn v14', async () => {
    const res = await request(app)
      .get(`/api/reconciliation/daily-report?branchId=${branchId}&date=2026-10-15`)
      .set('Authorization', `Bearer ${accountantToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.metadata);
    assert.equal(res.body.metadata.ruleVersion, 'v14.0.0-COMPLIANT');
    assert.ok(res.body.cashAndBilling);
    assert.ok(res.body.operationsAndSterilization);
    assert.ok(res.body.reconciliationSummary);
  });
});
