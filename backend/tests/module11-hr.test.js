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
import { initClinicalModels } from '../src/models/clinical-models.js';
import { initHrModels } from '../src/models/hr-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createHrRepository } from '../src/repositories/hr-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createHrService } from '../src/services/hr-service.js';
import { createHrController } from '../src/controllers/hr-controller.js';
import { createHrRoutes } from '../src/routes/hr-routes.js';
import { createApp } from '../src/app.js';

test('Module 11 - HR, Commissions & Payroll: Anti-Double Commission, Adjustments & Locked Payroll', async (t) => {
  const database = createDatabase(env.db);

  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);
  const clinicalModels = initClinicalModels(database.sequelize, userModels, catalogModels, patientVisitModels);
  const hrModels = initHrModels(database.sequelize, {
    userModels,
    catalogModels,
    clinicalModels,
  });

  const userRepo = createUserRepository({ sequelize: database.sequelize, models: userModels });
  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });

  const hrRepo = createHrRepository({ sequelize: database.sequelize, models: hrModels });
  const hrService = createHrService({ hrRepo });
  const hrController = createHrController({ hrService });
  const hrRoutes = createHrRoutes({ hrController, authMiddlewares });

  const app = createApp({
    config: env,
    health: { isReady: () => true, checkDatabase: () => true },
    hrRoutes,
  });

  let adminToken = '';
  let accountantToken = '';
  let approverToken = '';
  let doctorToken = '';

  const randSuffix = crypto.randomBytes(3).toString('hex');
  let doctorUser = null;
  let doctorEmployeeId = '';
  let otherEmployeeId = '';
  let branchId = '';
  let patientId = '';
  let visitId = '';
  let serviceId = '';
  let priceVersionId = '';
  let unitPrice = '500000.00';
  let serviceCompletionEventId = '';
  let commissionRuleId = '';
  let payrollPeriodId = '';
  let commissionId = '';

  t.before(async () => {
    // 1. Login users
    const adm = await authService.login({ username: 'admin', password: 'Admin1234@' });
    adminToken = adm.token;

    const acc = await authService.login({ username: 'accountant', password: 'Accountant1234@' });
    accountantToken = acc.token;

    const appv = await authService.login({ username: 'approver', password: 'Approver1234@' });
    approverToken = appv.token;

    const doc = await authService.login({ username: 'doctor', password: 'Doctor1234@' });
    doctorToken = doc.token;
    doctorUser = doc.user;

    // 2. Fetch seed branch, patient, visit, service for completion event
    const [branches] = await database.sequelize.query('SELECT TOP 1 BranchId FROM dbo.Branches');
    branchId = branches[0].BranchId;

    const [patients] = await database.sequelize.query('SELECT TOP 1 PatientId FROM dbo.Patients');
    patientId = patients[0].PatientId;

    // Create dedicated Service for this test to avoid rule overlap conflicts
    const [svcRows] = await database.sequelize.query(`
      INSERT INTO dbo.Services (ServiceId, Code, Name, CreatedBy)
      OUTPUT INSERTED.ServiceId
      VALUES (NEWID(), 'SVC-HR-${randSuffix}', N'Dịch vụ kiểm thử hoa hồng ${randSuffix}', 'admin')
    `);
    serviceId = svcRows[0].ServiceId;

    const [priceRows] = await database.sequelize.query(`
      INSERT INTO dbo.ServicePriceVersions (PriceVersionId, ServiceId, VersionNo, UnitPrice, EffectiveFrom, Status, CreatedBy)
      OUTPUT INSERTED.PriceVersionId
      VALUES (NEWID(), '${serviceId}', 1, 500000.00, SYSUTCDATETIME(), 'APPROVED', 'admin')
    `);
    priceVersionId = priceRows[0].PriceVersionId;
    unitPrice = '500000.00';

    // Create a visit
    const [visitRows] = await database.sequelize.query(`
      INSERT INTO dbo.Visits (VisitCode, PatientId, BranchId, DoctorId, VisitType, PaymentType, Status, CreatedBy)
      OUTPUT INSERTED.VisitId
      VALUES ('VS-HR-${randSuffix}', '${patientId}', '${branchId}', '${doctorUser.userId}', 'TREATMENT', 'SELF_PAY', 'IN_PROGRESS', 'admin')
    `);
    visitId = visitRows[0].VisitId;

    // Create ServiceLine and ServiceCompletionEvent
    const [lineRows] = await database.sequelize.query(`
      INSERT INTO dbo.ServiceLines (ServiceLineId, VisitId, ServiceId, PriceVersionId, Quantity, ApprovedUnitPrice, Status, CreatedBy)
      OUTPUT INSERTED.ServiceLineId
      VALUES (NEWID(), '${visitId}', '${serviceId}', '${priceVersionId}', 1.0, ${unitPrice}, 'COMPLETED', 'doctor')
    `);
    const serviceLineId = lineRows[0].ServiceLineId;

    const [eventRows] = await database.sequelize.query(`
      INSERT INTO dbo.ServiceCompletionEvents (ServiceCompletionEventId, ServiceLineId, CompletionVersion, QuantityCompleted, CompletedBy, CompletedAt, EventType, CreatedBy)
      OUTPUT INSERTED.ServiceCompletionEventId
      VALUES (NEWID(), '${serviceLineId}', 1, 1.0, '${doctorUser.userId}', SYSUTCDATETIME(), 'COMPLETION', 'doctor')
    `);
    serviceCompletionEventId = eventRows[0].ServiceCompletionEventId;

    // 3. Setup Employees: Ensure doctor and another employee exist
    const [existingEmp] = await database.sequelize.query(`
      SELECT EmployeeId FROM dbo.Employees WHERE UserId = '${doctorUser.userId}'
    `);
    if (existingEmp.length > 0) {
      doctorEmployeeId = existingEmp[0].EmployeeId;
    } else {
      const [newEmp] = await database.sequelize.query(`
        INSERT INTO dbo.Employees (EmployeeId, UserId, EmployeeCode, BaseSalary, Status, CreatedBy)
        OUTPUT INSERTED.EmployeeId
        VALUES (NEWID(), '${doctorUser.userId}', 'DOC-${randSuffix}', 15000000.00, 'ACTIVE', 'admin')
      `);
      doctorEmployeeId = newEmp[0].EmployeeId;
    }

    // Create a second employee for permission test
    const [users] = await database.sequelize.query(`
      SELECT TOP 1 UserId FROM dbo.Users WHERE RoleId = (SELECT RoleId FROM dbo.Roles WHERE Code = 'RECEPTIONIST')
    `);
    const receptionistUserId = users[0].UserId;

    const [recEmp] = await database.sequelize.query(`
      SELECT EmployeeId FROM dbo.Employees WHERE UserId = '${receptionistUserId}'
    `);
    if (recEmp.length > 0) {
      otherEmployeeId = recEmp[0].EmployeeId;
    } else {
      const [newRecEmp] = await database.sequelize.query(`
        INSERT INTO dbo.Employees (EmployeeId, UserId, EmployeeCode, BaseSalary, Status, CreatedBy)
        OUTPUT INSERTED.EmployeeId
        VALUES (NEWID(), '${receptionistUserId}', 'REC-${randSuffix}', 8000000.00, 'ACTIVE', 'admin')
      `);
      otherEmployeeId = newRecEmp[0].EmployeeId;
    }
  });

  t.after(async () => {
    await database.close();
  });

  // SUBTEST 1: Tạo quy tắc hoa hồng và Maker-Checker
  await t.test('1. Tạo quy tắc hoa hồng và kiểm tra Maker-Checker khi phê duyệt', async () => {
    // Kế toán tạo quy tắc hoa hồng 10%
    const res = await request(app)
      .post('/api/hr/commission-rules')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        serviceId,
        basis: 'COMPLETION',
        ratePercent: 10.0,
        effectiveFrom: '2026-01-01T00:00:00Z',
        effectiveTo: '2026-12-31T23:59:59Z',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'DRAFT');
    commissionRuleId = res.body.commissionRuleVersionId;

    // Maker-Checker: Kế toán tạo không được tự duyệt
    const selfApprove = await request(app)
      .post(`/api/hr/commission-rules/${commissionRuleId}/approve`)
      .set('Authorization', `Bearer ${accountantToken}`);

    // Bị chặn vì accountant không có quyền approver hoặc tự duyệt
    assert.equal(selfApprove.status, 403);

    // Kế toán trưởng (Approver) phê duyệt thành công
    const approverApprove = await request(app)
      .post(`/api/hr/commission-rules/${commissionRuleId}/approve`)
      .set('Authorization', `Bearer ${approverToken}`);

    assert.equal(approverApprove.status, 200);
    assert.equal(approverApprove.body.status, 'APPROVED');
  });

  // SUBTEST 2: Chặn chồng chéo thời gian hiệu lực quy tắc hoa hồng
  await t.test('2. Chặn chồng chéo phiên bản quy tắc hoa hồng cùng phạm vi (COMMISSION_RULE_OVERLAP)', async () => {
    // Tạo quy tắc thứ hai trùng phạm vi (cùng serviceId, basis = COMPLETION) và trùng khoảng thời gian 2026
    const res2 = await request(app)
      .post('/api/hr/commission-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        serviceId,
        basis: 'COMPLETION',
        ratePercent: 15.0,
        effectiveFrom: '2026-06-01T00:00:00Z',
        effectiveTo: '2026-08-31T23:59:59Z',
      });

    assert.equal(res2.status, 201);
    const rule2Id = res2.body.commissionRuleVersionId;

    // Approver thử duyệt quy tắc chồng chéo -> Phải bị từ chối 409 Conflict
    const approveOverlap = await request(app)
      .post(`/api/hr/commission-rules/${rule2Id}/approve`)
      .set('Authorization', `Bearer ${approverToken}`);

    assert.equal(approveOverlap.status, 409);
    assert.equal(approveOverlap.body.error.code, 'COMMISSION_RULE_OVERLAP');
  });

  // SUBTEST 3: Tạo kỳ lương PayrollPeriod
  await t.test('3. Tạo kỳ lương mới ở trạng thái OPEN', async () => {
    const periodCode = `PR-2026-${randSuffix}`;
    const res = await request(app)
      .post('/api/hr/payroll-periods')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        code: periodCode,
        startsOn: '2026-10-01',
        endsOn: '2026-10-31',
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'OPEN');
    payrollPeriodId = res.body.payrollPeriodId;
  });

  // SUBTEST 4 & 5: Tính hoa hồng và Chặn tính lặp 2 lần cho cùng một dòng tiền
  await t.test('4. Tính hoa hồng cho Bác sĩ theo sự kiện hoàn thành thủ thuật', async () => {
    const basisAmount = '2500000.00'; // 2.5 triệu
    const res = await request(app)
      .post('/api/hr/commissions/calculate')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        employeeId: doctorEmployeeId,
        serviceCompletionEventId,
        commissionRuleVersionId: commissionRuleId,
        payrollPeriodId,
        basisAmount,
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'CALCULATED');
    // 10% của 2,500,000 là 250,000
    assert.equal(new Decimal(res.body.commissionAmount).toFixed(2), '250000.00');
    commissionId = res.body.commissionId;
  });

  await t.test('5. [Quy tắc cốt lõi] Chặn tính hoa hồng lần 2 cho cùng dòng tiền/sự kiện (Anti-Double Commission)', async () => {
    const res = await request(app)
      .post('/api/hr/commissions/calculate')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        employeeId: doctorEmployeeId,
        serviceCompletionEventId,
        commissionRuleVersionId: commissionRuleId,
        payrollPeriodId,
        basisAmount: '2500000.00',
      });

    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'COMMISSION_ALREADY_CALCULATED');
  });

  // SUBTEST 6: Điều chỉnh hoa hồng số âm khi hoàn tiền / hủy dịch vụ
  await t.test('6. [Quy tắc cốt lõi] Hoàn tiền thủ thuật tạo điều chỉnh số âm liên kết bản gốc (CommissionAdjustments)', async () => {
    const adjAmount = '-50000.00'; // Giảm trừ 50,000đ hoa hồng do hoàn tiền một phần
    const res = await request(app)
      .post(`/api/hr/commissions/${commissionId}/adjust`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        payrollPeriodId,
        amount: adjAmount,
        reason: 'Khách hàng hoàn tiền một phần thủ thuật điều trị nha chu',
      });

    assert.equal(res.status, 201);
    assert.equal(new Decimal(res.body.amount).toFixed(2), '-50000.00');
    assert.equal(res.body.commissionId, commissionId);

    // Kiểm tra bản ghi hoa hồng gốc vẫn tồn tại nguyên vẹn, không bị xóa đè
    const listRes = await request(app)
      .get(`/api/hr/commissions?payrollPeriodId=${payrollPeriodId}`)
      .set('Authorization', `Bearer ${accountantToken}`);

    assert.equal(listRes.status, 200);
    const comm = listRes.body.find((c) => c.commissionId === commissionId);
    assert.ok(comm);
    assert.equal(new Decimal(comm.commissionAmount).toFixed(2), '250000.00');
    assert.equal(comm.adjustments.length, 1);
    assert.equal(new Decimal(comm.adjustments[0].amount).toFixed(2), '-50000.00');
  });

  // SUBTEST 7: Tổng hợp bảng lương kỳ
  await t.test('7. Tổng hợp bảng lương kỳ tính đúng Net Pay = BaseSalary + Commissions + Adjustments', async () => {
    const res = await request(app)
      .get(`/api/hr/payroll-periods/${payrollPeriodId}/summary`)
      .set('Authorization', `Bearer ${accountantToken}`);

    assert.equal(res.status, 200);
    assert.ok(res.body.summary);

    const docSummary = res.body.summary.find((s) => s.employeeId === doctorEmployeeId);
    assert.ok(docSummary);

    // Base salary: 15,000,000. Commission: +250,000. Adjustment: -50,000 -> Net: 15,200,000
    assert.equal(new Decimal(docSummary.baseSalary).toFixed(2), '15000000.00');
    assert.equal(new Decimal(docSummary.totalCommissions).toFixed(2), '250000.00');
    assert.equal(new Decimal(docSummary.totalAdjustments).toFixed(2), '-50000.00');
    assert.equal(new Decimal(docSummary.netPay).toFixed(2), '15200000.00');
  });

  // SUBTEST 8: Khóa kỳ lương và Chặn sửa đổi vào kỳ đã khóa
  await t.test('8. [Quy tắc cốt lõi] Khóa kỳ lương (LOCKED) và Chặn tính thêm hoặc điều chỉnh vào kỳ đã khóa', async () => {
    // Khóa kỳ lương
    const lockRes = await request(app)
      .post(`/api/hr/payroll-periods/${payrollPeriodId}/lock`)
      .set('Authorization', `Bearer ${approverToken}`);

    assert.equal(lockRes.status, 200);
    assert.equal(lockRes.body.status, 'LOCKED');
    assert.ok(lockRes.body.lockedAt);

    // Thử tạo một sự kiện hoàn thành mới và tính hoa hồng vào kỳ đã khóa
    const [line2] = await database.sequelize.query(`
      INSERT INTO dbo.ServiceLines (ServiceLineId, VisitId, ServiceId, PriceVersionId, Quantity, ApprovedUnitPrice, Status, CreatedBy)
      OUTPUT INSERTED.ServiceLineId
      VALUES (NEWID(), '${visitId}', '${serviceId}', '${priceVersionId}', 1.0, ${unitPrice}, 'COMPLETED', 'doctor')
    `);
    const [event2] = await database.sequelize.query(`
      INSERT INTO dbo.ServiceCompletionEvents (ServiceCompletionEventId, ServiceLineId, CompletionVersion, QuantityCompleted, CompletedBy, CompletedAt, EventType, CreatedBy)
      OUTPUT INSERTED.ServiceCompletionEventId
      VALUES (NEWID(), '${line2[0].ServiceLineId}', 1, 1.0, '${doctorUser.userId}', SYSUTCDATETIME(), 'COMPLETION', 'doctor')
    `);

    const calcBlocked = await request(app)
      .post('/api/hr/commissions/calculate')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        employeeId: doctorEmployeeId,
        serviceCompletionEventId: event2[0].ServiceCompletionEventId,
        commissionRuleVersionId: commissionRuleId,
        payrollPeriodId, // Kỳ đã locked
        basisAmount: '1000000.00',
      });

    assert.equal(calcBlocked.status, 400);
    assert.equal(calcBlocked.body.error.code, 'PERIOD_ALREADY_LOCKED');

    // Thử tạo điều chỉnh vào kỳ đã khóa -> Bị từ chối
    const adjBlocked = await request(app)
      .post(`/api/hr/commissions/${commissionId}/adjust`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        payrollPeriodId, // Kỳ đã locked
        amount: '-10000.00',
        reason: 'Thử điều chỉnh kỳ đã khóa',
      });

    assert.equal(adjBlocked.status, 400);
    assert.equal(adjBlocked.body.error.code, 'PERIOD_ALREADY_LOCKED');
  });

  // SUBTEST 9: Phân quyền Bác sĩ chỉ xem hoa hồng của mình
  await t.test('9. Phân quyền: Bác sĩ xem hoa hồng của mình; bị chặn xem hoa hồng nhân viên khác', async () => {
    // Bác sĩ gọi danh sách hoa hồng -> Trả về đúng hoa hồng của bác sĩ
    const docList = await request(app)
      .get('/api/hr/commissions')
      .set('Authorization', `Bearer ${doctorToken}`);

    assert.equal(docList.status, 200);
    assert.ok(Array.isArray(docList.body));
    assert.ok(docList.body.every((c) => c.employeeId === doctorEmployeeId));

    // Bác sĩ cố tình gửi query employeeId của nhân viên khác -> Bị 403 Forbidden
    const forbiddenList = await request(app)
      .get(`/api/hr/commissions?employeeId=${otherEmployeeId}`)
      .set('Authorization', `Bearer ${doctorToken}`);

    assert.equal(forbiddenList.status, 403);
    assert.equal(forbiddenList.body.error.code, 'FORBIDDEN_EMPLOYEE_COMMISSION_ACCESS');
  });
});
