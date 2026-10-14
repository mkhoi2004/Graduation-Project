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
import { initInsuranceModels } from '../src/models/insurance-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { createCatalogRepository } from '../src/repositories/catalog-repository.js';
import { createPatientVisitRepository } from '../src/repositories/patient-visit-repository.js';
import { createClinicalRepository } from '../src/repositories/clinical-repository.js';
import { createBillingRepository } from '../src/repositories/billing-repository.js';
import { InsuranceRepository } from '../src/repositories/insurance-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createInsuranceService } from '../src/services/insurance-service.js';
import { createInsuranceController } from '../src/controllers/insurance-controller.js';
import { createInsuranceRoutes } from '../src/routes/insurance-routes.js';
import { createApp } from '../src/app.js';

test('Module 9 - Commercial Health Insurance (BHTM): AT-03, AT-04, AT-14', async (t) => {
  const database = createDatabase(env.db);

  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);
  const clinicalModels = initClinicalModels(database.sequelize, userModels, catalogModels, patientVisitModels);
  const billingModels = initBillingModels(database.sequelize, userModels, catalogModels, patientVisitModels, clinicalModels);
  const insuranceModels = initInsuranceModels(database.sequelize, {
    patientVisitModels,
    billingModels,
  });

  const userRepo = createUserRepository({ sequelize: database.sequelize, models: userModels });
  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });

  const insuranceRepo = new InsuranceRepository(database.sequelize, {
    ...insuranceModels,
    Receivable: billingModels.Receivable,
    Invoice: billingModels.Invoice,
    InvoiceLine: billingModels.InvoiceLine,
  });
  const insuranceService = createInsuranceService({ insuranceRepo });
  const insuranceController = createInsuranceController({ insuranceService });
  const insuranceRoutes = createInsuranceRoutes({ insuranceController, authMiddlewares });

  const app = createApp({
    config: env,
    health: { isReady: () => true, checkDatabase: () => true },
    insuranceRoutes,
  });

  // Login tokens
  let approverToken = '';
  let accountantToken = '';
  let receptionistToken = '';

  const randSuffix = crypto.randomBytes(3).toString('hex');
  let contractId = '';
  let patientId = '';
  let visitId = '';
  let invoiceId = '';
  let invoiceLineId1 = '';
  let invoiceLineId2 = '';

  t.before(async () => {
    // 1. Get tokens
    const appRes = await authService.login({ username: 'approver', password: 'Approver1234@' });
    approverToken = appRes.token;

    const accRes = await authService.login({ username: 'accountant', password: 'Accountant1234@' });
    accountantToken = accRes.token;

    const recRes = await authService.login({ username: 'receptionist', password: 'Receptionist1234@' });
    receptionistToken = recRes.token;

    // 2. Prepare mock patient, visit, and invoice
    const branch = await database.sequelize.query(
      `SELECT TOP 1 BranchId FROM dbo.Branches WHERE Code='LOCAL'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    const branchId = branch[0].BranchId;

    const patResult = await database.sequelize.query(
      `INSERT INTO dbo.Patients (PatientCode, FullName, BirthYear, Phone, CreatedBy)
       OUTPUT INSERTED.PatientId
       VALUES ('BN-${randSuffix}', N'Bệnh nhân BHTM ${randSuffix}', 1990, '098${Math.floor(1000000 + Math.random() * 9000000)}', 'test-insurance')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    patientId = patResult[0][0].PatientId;

    const doctor = await database.sequelize.query(
      `SELECT TOP 1 UserId FROM dbo.Users u JOIN dbo.Roles r ON u.RoleId = r.RoleId WHERE r.Code='DOCTOR'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    const doctorId = doctor[0].UserId;

    const visitResult = await database.sequelize.query(
      `INSERT INTO dbo.Visits (VisitCode, PatientId, BranchId, DoctorId, VisitType, PaymentType, Status, CreatedBy)
       OUTPUT INSERTED.VisitId
       VALUES ('VS-${randSuffix}', '${patientId}', '${branchId}', '${doctorId}', 'EXAMINATION', 'BHTM_GUARANTEE', 'IN_PROGRESS', 'test-insurance')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    visitId = visitResult[0][0].VisitId;

    // 3. Prepare Invoice with valid ServiceLine and ServiceCompletionEvent
    const priceVer = await database.sequelize.query(
      `SELECT TOP 1 PriceVersionId, ServiceId FROM dbo.ServicePriceVersions WHERE Status='APPROVED'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    const priceVersionId = priceVer[0].PriceVersionId;
    const serviceId = priceVer[0].ServiceId;

    // ServiceLine 1
    const sLine1 = await database.sequelize.query(
      `INSERT INTO dbo.ServiceLines (VisitId, ServiceId, PriceVersionId, Quantity, ApprovedUnitPrice, Status, CreatedBy)
       OUTPUT INSERTED.ServiceLineId
       VALUES ('${visitId}', '${serviceId}', '${priceVersionId}', 1, 1000000, 'COMPLETED', 'test-insurance')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    const serviceLineId1 = sLine1[0][0].ServiceLineId;

    // ServiceCompletionEvent 1
    const comp1 = await database.sequelize.query(
      `INSERT INTO dbo.ServiceCompletionEvents (ServiceLineId, CompletionVersion, QuantityCompleted, CompletedBy, CompletedAt, CreatedBy)
       OUTPUT INSERTED.ServiceCompletionEventId
       VALUES ('${serviceLineId1}', 1, 1, '${doctorId}', SYSUTCDATETIME(), 'test-insurance')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    const completionEventId1 = comp1[0][0].ServiceCompletionEventId;

    // ServiceLine 2
    const sLine2 = await database.sequelize.query(
      `INSERT INTO dbo.ServiceLines (VisitId, ServiceId, PriceVersionId, Quantity, ApprovedUnitPrice, Status, CreatedBy)
       OUTPUT INSERTED.ServiceLineId
       VALUES ('${visitId}', '${serviceId}', '${priceVersionId}', 1, 2000000, 'COMPLETED', 'test-insurance')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    const serviceLineId2 = sLine2[0][0].ServiceLineId;

    // ServiceCompletionEvent 2
    const comp2 = await database.sequelize.query(
      `INSERT INTO dbo.ServiceCompletionEvents (ServiceLineId, CompletionVersion, QuantityCompleted, CompletedBy, CompletedAt, CreatedBy)
       OUTPUT INSERTED.ServiceCompletionEventId
       VALUES ('${serviceLineId2}', 1, 1, '${doctorId}', SYSUTCDATETIME(), 'test-insurance')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    const completionEventId2 = comp2[0][0].ServiceCompletionEventId;

    // Create Invoice
    const invNo = `INV-BHTM-${randSuffix}`;
    const invResult = await database.sequelize.query(
      `INSERT INTO dbo.Invoices (InvoiceNo, VisitId, PatientId, Gross, ApprovedDiscount, Tax, RoundingAdjustment, Status, CreatedBy)
       OUTPUT INSERTED.InvoiceId
       VALUES ('${invNo}', '${visitId}', '${patientId}', 3000000, 0, 0, 0, 'ISSUED', 'test-insurance')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    invoiceId = invResult[0][0].InvoiceId;

    // Create 2 InvoiceLines
    const line1Result = await database.sequelize.query(
      `INSERT INTO dbo.InvoiceLines (InvoiceId, ServiceCompletionEventId, PriceVersionId, Description, Quantity, UnitPrice, DiscountAmount, TaxAmount, CreatedBy)
       OUTPUT INSERTED.InvoiceLineId
       VALUES ('${invoiceId}', '${completionEventId1}', '${priceVersionId}', N'Điều trị tủy răng hàm', 1, 1000000, 0, 0, 'test-insurance')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    invoiceLineId1 = line1Result[0][0].InvoiceLineId;

    const line2Result = await database.sequelize.query(
      `INSERT INTO dbo.InvoiceLines (InvoiceId, ServiceCompletionEventId, PriceVersionId, Description, Quantity, UnitPrice, DiscountAmount, TaxAmount, CreatedBy)
       OUTPUT INSERTED.InvoiceLineId
       VALUES ('${invoiceId}', '${completionEventId2}', '${priceVersionId}', N'Bọc răng sứ Zirconia', 1, 2000000, 0, 0, 'test-insurance')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    invoiceLineId2 = line2Result[0][0].InvoiceLineId;
  });

  // TEST 1: Tạo hợp đồng bảo hiểm thương mại với quy tắc bồi thường
  await t.test('1. Tạo Hợp đồng bảo lãnh BHTM với CoverageRulesJson (allowPatientRecovery = false)', async () => {
    const res = await request(app)
      .post('/api/insurance/contracts')
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        contractNo: `HD-BHTM-${randSuffix}`,
        payerName: 'Bảo hiểm Bảo Việt Dental Care',
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-12-31',
        limitAmount: 50000000,
        coverageRulesJson: {
          allowPatientRecovery: false, // AT-04 quy tắc: không thu lại bệnh nhân nếu BHTM duyệt thiếu
          coveragePercent: 80,
          notes: 'Phòng khám chịu rủi ro bồi thường nếu BHTM từ chối',
        },
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.insuranceContractId);
    contractId = res.body.data.insuranceContractId;
  });

  // TEST 2: AT-14 - Chống gửi lặp hồ sơ BHTM (Anti-replay submission)
  let claim1Id = '';
  await t.test('2. [AT-14] Lập hồ sơ bồi thường và Chống gửi lặp hồ sơ (Anti-replay / Duplicate Prevention)', async () => {
    // 2.1 Lập claim cho InvoiceLine1 (1.000.000 đ)
    const createRes = await request(app)
      .post('/api/insurance/claims')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        visitId,
        patientId,
        insuranceContractId: contractId,
        lines: [
          {
            invoiceLineId: invoiceLineId1,
            requestedAmount: 1000000,
          },
        ],
      });

    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.success, true);
    claim1Id = createRes.body.data.insuranceClaimId;
    assert.equal(createRes.body.data.status, 'VALIDATED');
    assert.equal(parseFloat(createRes.body.data.requestedAmount), 1000000);

    // 2.2 Gửi hồ sơ lần 1
    const submit1Res = await request(app)
      .post(`/api/insurance/claims/${claim1Id}/submit`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        versionNo: 1,
        destination: 'BAO_VIET_GATEWAY',
        payload: { claimNo: createRes.body.data.claimNo, total: 1000000 },
      });

    assert.equal(submit1Res.status, 200);
    assert.equal(submit1Res.body.success, true);
    assert.equal(submit1Res.body.data.claim.status, 'ACKNOWLEDGED');

    // 2.3 Gửi lặp lại cùng hồ sơ và cùng version/destination -> Bị chặn với lỗi DUPLICATE_CLAIM_SUBMISSION (AT-14)
    const submitDuplicateRes = await request(app)
      .post(`/api/insurance/claims/${claim1Id}/submit`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        versionNo: 1,
        destination: 'BAO_VIET_GATEWAY',
        payload: { claimNo: createRes.body.data.claimNo, total: 1000000 },
      });

    assert.equal(submitDuplicateRes.status, 409);
    assert.equal(submitDuplicateRes.body.error.code, 'DUPLICATE_CLAIM_SUBMISSION');
  });

  // TEST 3: AT-03 - BHTM duyệt 1 triệu nhưng chưa chuyển tiền
  await t.test('3. [AT-03] BHTM duyệt 1 triệu nhưng chưa chuyển tiền (Phải thu BHTM ghi nhận, tiền bank chưa tăng, CHƯA SETTLED)', async () => {
    const adjRes = await request(app)
      .post(`/api/insurance/claims/${claim1Id}/adjudicate`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        approvedAmount: 1000000,
        invoiceId,
        lineApprovals: [
          {
            insuranceClaimLineId: (await insuranceRepo.getClaimById(claim1Id)).lines[0].insuranceClaimLineId,
            approvedAmount: 1000000,
          },
        ],
      });

    assert.equal(adjRes.status, 200);
    const claimData = adjRes.body.data.claim;

    // Trạng thái hồ sơ chuyển sang APPROVED
    assert.equal(claimData.status, 'APPROVED');
    assert.equal(parseFloat(claimData.approvedAmount), 1000000);
    // SettledAmount vẫn là 0
    assert.equal(parseFloat(claimData.settledAmount), 0);
    // Tuyệt đối CHƯA SETTLED
    assert.notEqual(claimData.status, 'SETTLED');

    // Kiểm tra công nợ Receivables: Phải thu BHTM còn 1.000.000 đ
    const receivables = await database.sequelize.query(
      `SELECT * FROM dbo.Receivables WHERE InvoiceId='${invoiceId}' AND DebtorType='BHTM'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(receivables.length, 1);
    assert.equal(parseFloat(receivables[0].AllocationAmount), 1000000);
    assert.equal(parseFloat(receivables[0].ConfirmedPayment), 0);
    assert.equal(parseFloat(receivables[0].Outstanding), 1000000);
    assert.equal(receivables[0].Status, 'OPEN');
  });

  // TEST 4: AT-04 - BHTM duyệt thiếu, hợp đồng không cho thu lại bệnh nhân
  let claim2Id = '';
  await t.test('4. [AT-04] BHTM duyệt thiếu, hợp đồng không cho thu lại bệnh nhân (Không tự chuyển nợ; tạo quyết định xử lý phần thiếu)', async () => {
    // 4.1 Lập claim 2 cho InvoiceLine2 (2.000.000 đ)
    const createRes = await request(app)
      .post('/api/insurance/claims')
      .set('Authorization', `Bearer ${receptionistToken}`)
      .send({
        visitId,
        patientId,
        insuranceContractId: contractId,
        lines: [
          {
            invoiceLineId: invoiceLineId2,
            requestedAmount: 2000000,
          },
        ],
      });

    assert.equal(createRes.status, 201);
    claim2Id = createRes.body.data.insuranceClaimId;

    // Submit claim
    await request(app)
      .post(`/api/insurance/claims/${claim2Id}/submit`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({ versionNo: 1, destination: 'BAO_VIET_GATEWAY' });

    // 4.2 BHTM duyệt thiếu: Chỉ duyệt 1.500.000 đ (thiếu 500.000 đ)
    const adjRes = await request(app)
      .post(`/api/insurance/claims/${claim2Id}/adjudicate`)
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        approvedAmount: 1500000,
        invoiceId,
      });

    assert.equal(adjRes.status, 200);
    const claimData = adjRes.body.data.claim;
    assert.equal(claimData.status, 'PARTIALLY_APPROVED');
    assert.equal(parseFloat(claimData.approvedAmount), 1500000);

    // Kiểm tra: Hệ thống KHÔNG tự động chuyển 500k nợ sang bệnh nhân
    const patReceivables = await database.sequelize.query(
      `SELECT * FROM dbo.Receivables WHERE InvoiceId='${invoiceId}' AND DebtorType='PATIENT'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    // Bệnh nhân không bị tạo thêm nợ 500k
    const patDebt = patReceivables.reduce((acc, r) => acc + parseFloat(r.Outstanding), 0);
    assert.equal(patDebt, 0);

    // Kiểm tra: Tự động tạo quyết định xử lý phần thiếu (ClaimDisputes)
    const disputes = await database.sequelize.query(
      `SELECT * FROM dbo.ClaimDisputes WHERE InsuranceClaimId='${claim2Id}'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(disputes.length, 1);
    assert.equal(parseFloat(disputes[0].DisputedAmount), 500000);
    assert.equal(disputes[0].Status, 'OPEN');
    assert.ok(disputes[0].Reason.includes('Hợp đồng không cho phép thu lại bệnh nhân'));
  });

  // TEST 5: AT-14 - Nhận tiền thiếu từ BHTM, đối soát chênh lệch, không ghi tăng doanh thu
  let dispute2Id = '';
  await t.test('5. [AT-14] Nhận tiền thiếu từ BHTM (Ghi chênh lệch, không tăng doanh thu, hồ sơ chưa SETTLED)', async () => {
    // Claim 2 đã duyệt 1.500.000 đ. BHTM chuyển khoản nhưng chuyển thiếu chỉ có 1.200.000 đ.
    const payRef = `BANK-TRX-${randSuffix}-001`;

    const payRes = await request(app)
      .post('/api/insurance/payments')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        insuranceClaimId: claim2Id,
        externalReference: payRef,
        amount: 1200000,
        invoiceId,
      });

    assert.equal(payRes.status, 200);
    assert.equal(payRes.body.data.paymentRecord.status, 'MISMATCH');
    assert.equal(parseFloat(payRes.body.data.claim.settledAmount), 1200000);

    // Hồ sơ CHƯA SETTLED vì còn thiếu tiền duyệt
    assert.equal(payRes.body.data.claim.status, 'PARTIALLY_APPROVED');

    // Chống trùng mã giao dịch ngân hàng
    const duplicatePay = await request(app)
      .post('/api/insurance/payments')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        insuranceClaimId: claim2Id,
        externalReference: payRef,
        amount: 1200000,
        invoiceId,
      });
    assert.equal(duplicatePay.status, 409);
    assert.equal(duplicatePay.body.error.code, 'DUPLICATE_PAYMENT_REFERENCE');

    // Tự động tạo thêm dispute cho khoản tiền chuyển thiếu 300.000 đ
    const allDisputes = await database.sequelize.query(
      `SELECT * FROM dbo.ClaimDisputes WHERE InsuranceClaimId='${claim2Id}' ORDER BY CreatedAt DESC`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(allDisputes.length, 2);
    const shortDispute = allDisputes.find(d => parseFloat(d.DisputedAmount) === 300000);
    assert.ok(shortDispute);
    assert.equal(shortDispute.Status, 'OPEN');
    dispute2Id = shortDispute.ClaimDisputeId;
  });

  // TEST 6: Thanh toán nốt số tiền còn lại và Giải quyết tranh chấp để đóng hồ sơ
  await t.test('6. Thanh toán phần còn lại, Kế toán trưởng duyệt xử lý tranh chấp và đóng Claim -> CLOSED', async () => {
    // 6.1 Nhận nốt 300.000 đ còn thiếu
    const payRes = await request(app)
      .post('/api/insurance/payments')
      .set('Authorization', `Bearer ${accountantToken}`)
      .send({
        insuranceClaimId: claim2Id,
        externalReference: `BANK-TRX-${randSuffix}-002`,
        amount: 300000,
        invoiceId,
      });

    assert.equal(payRes.status, 200);
    assert.equal(parseFloat(payRes.body.data.claim.settledAmount), 1500000); // Đã nhận đủ số duyệt

    // 6.2 Giải quyết dispute khoản tiền thiếu
    await request(app)
      .post(`/api/insurance/disputes/${dispute2Id}/resolve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        resolution: 'BHTM đã chuyển bổ sung 300,000 VND qua giao dịch BANK-TRX-002; Khớp đối soát.',
        status: 'RESOLVED',
      });

    // 6.3 Giải quyết dispute khoản 500k do BHTM từ chối (cơ sở chịu chi phí)
    const disputes = await database.sequelize.query(
      `SELECT ClaimDisputeId FROM dbo.ClaimDisputes WHERE InsuranceClaimId='${claim2Id}' AND DisputedAmount=500000`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    const resolveRes = await request(app)
      .post(`/api/insurance/disputes/${disputes[0].ClaimDisputeId}/resolve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        resolution: 'Kế toán trưởng và BGĐ phê duyệt cơ sở phòng khám chịu chi phí 500,000 VND do BHTM từ chối (AT-04).',
        status: 'RESOLVED',
      });

    assert.equal(resolveRes.status, 200);
    // Toàn bộ tranh chấp đã RESOLVED và tiền đã nhận đủ -> Claim chuyển sang CLOSED
    assert.equal(resolveRes.body.data.claim.status, 'CLOSED');
  });

  t.after(async () => {
    await database.close();
  });
});
