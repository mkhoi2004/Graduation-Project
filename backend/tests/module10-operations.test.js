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
import { initInventoryModels } from '../src/models/inventory-models.js';
import { initOperationsModels } from '../src/models/operations-models.js';
import { createUserRepository } from '../src/repositories/user-repository.js';
import { OperationsRepository } from '../src/repositories/operations-repository.js';
import { createAuthMiddlewares } from '../src/middlewares/auth.js';
import { createAuthService } from '../src/services/auth-service.js';
import { createOperationsService } from '../src/services/operations-service.js';
import { createOperationsController } from '../src/controllers/operations-controller.js';
import { createOperationsRoutes } from '../src/routes/operations-routes.js';
import { createApp } from '../src/app.js';

test('Module 10 - Sterilization, Operations, Lab & Warranty: AT-22', async (t) => {
  const database = createDatabase(env.db);

  const userModels = initUserModels(database.sequelize);
  const catalogModels = initCatalogModels(database.sequelize, userModels);
  const patientVisitModels = initPatientVisitModels(database.sequelize, userModels, catalogModels);
  const clinicalModels = initClinicalModels(database.sequelize, userModels, catalogModels, patientVisitModels);
  const inventoryModels = initInventoryModels(database.sequelize, userModels, patientVisitModels, clinicalModels);
  const operationsModels = initOperationsModels(database.sequelize, {
    userModels,
    patientVisitModels,
    clinicalModels,
    inventoryModels,
  });

  const userRepo = createUserRepository({ sequelize: database.sequelize, models: userModels });
  const authMiddlewares = createAuthMiddlewares({ jwtSecret: env.jwtSecret, userRepo });
  const authService = createAuthService({ userRepo, jwtSecret: env.jwtSecret, jwtExpiresIn: env.jwtExpiresIn });

  const operationsRepo = new OperationsRepository(database.sequelize, operationsModels);
  const operationsService = createOperationsService({ operationsRepo });
  const operationsController = createOperationsController({ operationsService });
  const operationsRoutes = createOperationsRoutes({ operationsController, authMiddlewares });

  const app = createApp({
    config: env,
    health: { isReady: () => true, checkDatabase: () => true },
    operationsRoutes,
  });

  // Login tokens
  let adminToken = '';
  let doctorToken = '';
  let warehouseToken = '';
  let approverToken = '';

  const randSuffix = crypto.randomBytes(3).toString('hex');
  let branchId = '';
  let doctorId = '';
  let patientId = '';
  let visitId = '';

  t.before(async () => {
    // 1. Get tokens
    const admRes = await authService.login({ username: 'admin', password: 'Admin1234@' });
    adminToken = admRes.token;

    const docRes = await authService.login({ username: 'doctor', password: 'Doctor1234@' });
    doctorToken = docRes.token;

    const whRes = await authService.login({ username: 'warehouse', password: 'WarehouseManager1234@' });
    warehouseToken = whRes.token;

    const appRes = await authService.login({ username: 'approver', password: 'Approver1234@' });
    approverToken = appRes.token;

    // 2. Query branch & doctor
    const branch = await database.sequelize.query(
      `SELECT TOP 1 BranchId FROM dbo.Branches WHERE Code='LOCAL'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    branchId = branch[0].BranchId;

    const doc = await database.sequelize.query(
      `SELECT TOP 1 UserId FROM dbo.Users u JOIN dbo.Roles r ON u.RoleId = r.RoleId WHERE r.Code='DOCTOR'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    doctorId = doc[0].UserId;

    // 3. Prepare patient and visit
    const patResult = await database.sequelize.query(
      `INSERT INTO dbo.Patients (PatientCode, FullName, BirthYear, Phone, CreatedBy)
       OUTPUT INSERTED.PatientId
       VALUES ('BN-OP-${randSuffix}', N'Bệnh nhân Phẫu thuật ${randSuffix}', 1992, '097${Math.floor(1000000 + Math.random() * 9000000)}', 'test-operations')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    patientId = patResult[0][0].PatientId;

    const visitResult = await database.sequelize.query(
      `INSERT INTO dbo.Visits (VisitCode, PatientId, BranchId, DoctorId, VisitType, PaymentType, Status, CreatedBy)
       OUTPUT INSERTED.VisitId
       VALUES ('VS-OP-${randSuffix}', '${patientId}', '${branchId}', '${doctorId}', 'TREATMENT', 'SELF_PAY', 'IN_PROGRESS', 'test-operations')`,
      { type: database.sequelize.QueryTypes.INSERT }
    );
    visitId = visitResult[0][0].VisitId;
  });

  // TEST 1: AT-22 - Thiết bị không đủ điều kiện (Asset not qualified / Out of service / Calibration expired)
  let unqualifiedAssetId = '';
  await t.test('1. [AT-22] Chặn khởi chạy chu trình tiệt trùng trên thiết bị không đủ điều kiện & Tự động tạo sự cố', async () => {
    // 1.1 Tạo thiết bị nồi hấp đang bảo trì (MAINTENANCE)
    const createAssetRes = await request(app)
      .post('/api/operations/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId,
        assetCode: `AUTOCLAVE-MAINT-${randSuffix}`,
        name: 'Nồi hấp tiệt trùng hơi nước Mocom Classic 17L',
        assetType: 'AUTOCLAVE',
        status: 'MAINTENANCE', // Đang bảo trì
      });

    assert.equal(createAssetRes.status, 201);
    unqualifiedAssetId = createAssetRes.body.data.assetId;

    // 1.2 Cố tình chạy chu trình trên thiết bị đang bảo trì -> Bị chặn 400
    const startCycleRes = await request(app)
      .post('/api/operations/sterilization-cycles')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        assetId: unqualifiedAssetId,
        cycleNo: `CYC-FAIL-${randSuffix}`,
      });

    assert.equal(startCycleRes.status, 400);
    assert.equal(startCycleRes.body.error.code, 'ASSET_NOT_QUALIFIED');

    // Kiểm tra: Hệ thống tự động ghi nhận báo cáo sự cố y khoa (Incidents)
    const incidents = await database.sequelize.query(
      `SELECT * FROM dbo.Incidents WHERE ObjectId='${unqualifiedAssetId}'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(incidents.length, 1);
    assert.equal(incidents[0].Severity, 'HIGH');
    assert.equal(incidents[0].IncidentType, 'UNQUALIFIED_EQUIPMENT_USAGE_ATTEMPT');

    // 1.3 Thử nghiệm thiết bị quá hạn hiệu chuẩn (Calibration Expired)
    const expiredCalibAssetRes = await request(app)
      .post('/api/operations/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId,
        assetCode: `AUTOCLAVE-EXP-CAL-${randSuffix}`,
        name: 'Nồi hấp sấy khô Melag Euroklav 23 VS+',
        assetType: 'AUTOCLAVE',
        status: 'ACTIVE',
        calibrationExpiresAt: '2025-01-01', // Đã hết hạn hiệu chuẩn
      });
    assert.equal(expiredCalibAssetRes.status, 201);

    const startExpiredCalibRes = await request(app)
      .post('/api/operations/sterilization-cycles')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        assetId: expiredCalibAssetRes.body.data.assetId,
      });

    assert.equal(startExpiredCalibRes.status, 400);
    assert.equal(startExpiredCalibRes.body.error.code, 'ASSET_CALIBRATION_EXPIRED');
  });

  // TEST 2: AT-22 - Chu trình tiệt trùng lỗi & Tự động cách ly gói dụng cụ
  let qualifiedAssetId = '';
  let failedCycleId = '';
  let quarantinedPackId = '';
  await t.test('2. [AT-22] Chu trình tiệt trùng lỗi (FAIL) tự động cách ly toàn bộ gói dụng cụ & Chặn giải phóng', async () => {
    // 2.1 Tạo thiết bị đạt chuẩn ACTIVE
    const assetRes = await request(app)
      .post('/api/operations/assets')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        branchId,
        assetCode: `AUTOCLAVE-OK-${randSuffix}`,
        name: 'Nồi hấp tiệt trùng chuẩn Class B Tuttnauer 2840EL',
        assetType: 'AUTOCLAVE',
        status: 'ACTIVE',
        calibrationExpiresAt: '2027-12-31',
      });
    assert.equal(assetRes.status, 201);
    qualifiedAssetId = assetRes.body.data.assetId;

    // 2.2 Khởi chạy chu trình
    const cycleRes = await request(app)
      .post('/api/operations/sterilization-cycles')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        assetId: qualifiedAssetId,
        cycleNo: `CYC-TEST-FAIL-${randSuffix}`,
      });
    assert.equal(cycleRes.status, 201);
    failedCycleId = cycleRes.body.data.sterilizationCycleId;

    // 2.3 Đóng gói dụng cụ vào chu trình này
    const packRes = await request(app)
      .post('/api/operations/packs')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        sterilizationCycleId: failedCycleId,
        packCode: `PACK-SURGICAL-01-${randSuffix}`,
        packType: 'SURGICAL_EXTRACTION_KIT',
      });
    assert.equal(packRes.status, 201);
    quarantinedPackId = packRes.body.data.instrumentPackId;

    // 2.4 Kết thúc chu trình với kết quả chỉ thị vi sinh bị HỎNG (FAIL)
    const completeRes = await request(app)
      .post(`/api/operations/sterilization-cycles/${failedCycleId}/complete`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        indicatorResult: 'FAIL',
      });
    assert.equal(completeRes.status, 200);
    assert.equal(completeRes.body.data.status, 'FAILED');

    // Kiểm tra: Gói dụng cụ tự động bị cách ly QUARANTINED
    const packsInDb = await database.sequelize.query(
      `SELECT Status FROM dbo.InstrumentPacks WHERE InstrumentPackId='${quarantinedPackId}'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(packsInDb[0].Status, 'QUARANTINED');

    // 2.5 Cố tình giải phóng gói thuộc chu trình FAIL -> Bị chặn 400
    const releaseRes = await request(app)
      .post(`/api/operations/packs/${quarantinedPackId}/release`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({});
    assert.equal(releaseRes.status, 400);
    assert.equal(releaseRes.body.error.code, 'CANNOT_RELEASE_FAILED_CYCLE');
  });

  // TEST 3: AT-22 - Gói tiệt trùng quá hạn bị chặn sử dụng & Tự động tạo sự cố y khoa
  let passedCycleId = '';
  let expiredPackId = '';
  await t.test('3. [AT-22] Chặn sử dụng gói dụng cụ quá hạn tiệt trùng trong ca khám & Tự động tạo sự cố y khoa', async () => {
    // 3.1 Chạy chu trình đạt chuẩn PASS
    const cycleRes = await request(app)
      .post('/api/operations/sterilization-cycles')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        assetId: qualifiedAssetId,
        cycleNo: `CYC-PASS-${randSuffix}`,
      });
    passedCycleId = cycleRes.body.data.sterilizationCycleId;

    await request(app)
      .post(`/api/operations/sterilization-cycles/${passedCycleId}/complete`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ indicatorResult: 'PASS' });

    // 3.2 Tạo gói dụng cụ và giải phóng với hạn dùng trong quá khứ (đã hết hạn)
    const packRes = await request(app)
      .post('/api/operations/packs')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        sterilizationCycleId: passedCycleId,
        packCode: `PACK-EXPIRED-${randSuffix}`,
        packType: 'IMPLANT_SURGERY_KIT',
      });
    expiredPackId = packRes.body.data.instrumentPackId;

    await request(app)
      .post(`/api/operations/packs/${expiredPackId}/release`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        sterileFrom: '2026-01-01',
        expiresAt: '2026-02-01', // Đã hết hạn tiệt trùng
      });

    // 3.3 Bác sĩ cố tình sử dụng gói quá hạn cho ca khám -> Bị chặn 400 (AT-22)
    const useRes = await request(app)
      .post('/api/operations/packs/use')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        instrumentPackId: expiredPackId,
        visitId,
        patientId,
        isEmergency: false,
      });

    assert.equal(useRes.status, 400);
    assert.equal(useRes.body.error.code, 'PACK_EXPIRED_CANNOT_USE');

    // Kiểm tra: Trạng thái gói cập nhật EXPIRED và tự động tạo Incident
    const packInDb = await database.sequelize.query(
      `SELECT Status FROM dbo.InstrumentPacks WHERE InstrumentPackId='${expiredPackId}'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(packInDb[0].Status, 'EXPIRED');

    const incidents = await database.sequelize.query(
      `SELECT * FROM dbo.Incidents WHERE ObjectId='${expiredPackId}' AND IncidentType='EXPIRED_STERILE_PACK_USAGE_ATTEMPT'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(incidents.length, 1);
    assert.equal(incidents[0].Severity, 'HIGH');
  });

  // TEST 4: AT-22 - Ngoại lệ cấp cứu ("Cấp cứu vẫn ghi được diễn biến")
  await t.test('4. [AT-22] Ngoại lệ cấp cứu cho phép ghi nhận diễn biến thủ thuật kèm biên bản sự cố khẩn cấp (CRITICAL)', async () => {
    // Tạo thêm 1 gói hết hạn cho tình huống cấp cứu
    const packRes = await request(app)
      .post('/api/operations/packs')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        sterilizationCycleId: passedCycleId,
        packCode: `PACK-EMERGENCY-${randSuffix}`,
        packType: 'TRAUMA_SURGICAL_KIT',
      });
    const emergencyPackId = packRes.body.data.instrumentPackId;

    await request(app)
      .post(`/api/operations/packs/${emergencyPackId}/release`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        sterileFrom: '2026-01-01',
        expiresAt: '2026-02-01',
      });

    // Bác sĩ kích hoạt ngoại lệ cấp cứu ghi nhận diễn biến
    const emergencyUseRes = await request(app)
      .post('/api/operations/packs/use')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        instrumentPackId: emergencyPackId,
        visitId,
        patientId,
        isEmergency: true,
        emergencyReason: 'Bệnh nhân chấn thương hàm mặt xuất huyết cấp tính đe dọa tính mạng; Bắt buộc can thiệp cầm máu khẩn cấp ngay tại chỗ.',
      });

    assert.equal(emergencyUseRes.status, 201);
    assert.equal(emergencyUseRes.body.data.emergencyOverride, true);

    // Kiểm tra: Bản ghi PackUsages đã được ghi nhận diễn biến
    const usages = await database.sequelize.query(
      `SELECT * FROM dbo.PackUsages WHERE InstrumentPackId='${emergencyPackId}'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(usages.length, 1);

    // Kiểm tra: Tự động ghi nhận biên bản sự cố CRITICAL để hội đồng thẩm định
    const criticalIncidents = await database.sequelize.query(
      `SELECT * FROM dbo.Incidents WHERE ObjectId='${emergencyPackId}' AND IncidentType='EMERGENCY_OVERRIDE'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(criticalIncidents.length, 1);
    assert.equal(criticalIncidents[0].Severity, 'CRITICAL');
    assert.ok(criticalIncidents[0].Description.includes('Bệnh nhân chấn thương hàm mặt xuất huyết'));
  });

  // TEST 5: Sử dụng gói dụng cụ đạt chuẩn & Chống tái sử dụng (One-time usage per pack)
  let validPackId = '';
  await t.test('5. Sử dụng gói dụng cụ đạt chuẩn an toàn & Chống tái sử dụng (Mỗi gói chỉ dùng 1 lần duy nhất)', async () => {
    // 5.1 Tạo gói đạt chuẩn còn hạn 30 ngày
    const packRes = await request(app)
      .post('/api/operations/packs')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        sterilizationCycleId: passedCycleId,
        packCode: `PACK-VALID-OK-${randSuffix}`,
        packType: 'STANDARD_EXAM_KIT',
      });
    validPackId = packRes.body.data.instrumentPackId;

    await request(app)
      .post(`/api/operations/packs/${validPackId}/release`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        sterileFrom: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Còn hạn 30 ngày
      });

    // 5.2 Bác sĩ dùng gói hợp lệ -> Thành công 201
    const useRes = await request(app)
      .post('/api/operations/packs/use')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        instrumentPackId: validPackId,
        visitId,
        patientId,
      });
    assert.equal(useRes.status, 201);
    assert.equal(useRes.body.data.emergencyOverride, false);

    // 5.3 Cố tình dùng lại gói này lần thứ 2 -> Bị chặn ngay với 409 Conflict
    const reuseRes = await request(app)
      .post('/api/operations/packs/use')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        instrumentPackId: validPackId,
        visitId,
        patientId,
      });
    assert.equal(reuseRes.status, 409);
    assert.equal(reuseRes.body.error.code, 'PACK_ALREADY_USED');
  });

  // TEST 6: Đơn hàng Labo & Yêu cầu làm lại (LabReworks - không sửa đè đơn hàng)
  let labOrderId = '';
  let reworkId = '';
  await t.test('6. Quản lý Đơn hàng Labo & Yêu cầu làm lại (LabReworks: không sửa đè, duyệt phân bổ chi phí)', async () => {
    // 6.1 Bác sĩ lập đơn hàng Labo răng sứ
    const orderRes = await request(app)
      .post('/api/operations/lab-orders')
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        visitId,
        doctorId,
        specimen: 'Mẫu dấu hàm thạch cao răng 21, 22',
        instructions: 'Chế tác 2 răng sứ Cercon HT màu A2, độ trong 45%',
        dueAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        cost: 1600000,
      });
    assert.equal(orderRes.status, 201);
    labOrderId = orderRes.body.data.labOrderId;

    // 6.2 Nhận hàng và phát hiện lỗi không vừa khít -> Bác sĩ yêu cầu làm lại Labo
    const reworkRes = await request(app)
      .post(`/api/operations/lab-orders/${labOrderId}/rework`)
      .set('Authorization', `Bearer ${doctorToken}`)
      .send({
        reason: 'Răng sứ bị cộm khớp cắn 0.5mm và lệch viền nướu mặt trong; Yêu cầu xưởng đúc lại.',
        costBearer: 'LAB', // Xưởng chế tác chịu chi phí làm lại do lỗi kỹ thuật đúc
        cost: 800000,
      });

    assert.equal(reworkRes.status, 201);
    assert.equal(reworkRes.body.data.reworkNo, 1);
    assert.equal(reworkRes.body.data.status, 'REQUESTED');
    reworkId = reworkRes.body.data.labReworkId;

    // Kiểm tra: Đơn hàng labo gốc không bị xóa/sửa đè mà chuyển qcResult='FAIL'
    const orderInDb = await database.sequelize.query(
      `SELECT Status, QcResult FROM dbo.LabOrders WHERE LabOrderId='${labOrderId}'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    assert.equal(orderInDb[0].QcResult, 'FAIL');

    // 6.3 Kế toán trưởng phê duyệt làm lại Labo
    const approveReworkRes = await request(app)
      .post(`/api/operations/lab-reworks/${reworkId}/approve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ status: 'APPROVED' });
    assert.equal(approveReworkRes.status, 200);
    assert.equal(approveReworkRes.body.data.status, 'APPROVED');
  });

  // TEST 7: Bảo hành & Xử lý sự cố y khoa (Incidents)
  await t.test('7. Cấp thẻ bảo hành, kích hoạt bảo hành và Kế toán trưởng giải quyết sự cố y khoa', async () => {
    // 7.1 Lấy ServiceLineId
    const sLine = await database.sequelize.query(
      `SELECT TOP 1 ServiceLineId FROM dbo.ServiceLines WHERE VisitId='${visitId}'`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    const serviceLineId = sLine[0]?.ServiceLineId;

    if (serviceLineId) {
      // Cấp thẻ bảo hành 5 năm
      const warRes = await request(app)
        .post('/api/operations/warranties')
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({
          serviceLineId,
          patientId,
          startsAt: '2026-01-01',
          expiresAt: '2031-01-01',
          termsJson: { coverage: 'Bảo hành 100% chi phí thay thế nếu răng sứ nứt vỡ trong 5 năm' },
        });
      assert.equal(warRes.status, 201);
      const warrantyId = warRes.body.data.warrantyId;

      // Kích hoạt bảo hành
      const claimRes = await request(app)
        .post(`/api/operations/warranties/${warrantyId}/claim`)
        .set('Authorization', `Bearer ${doctorToken}`)
        .send({ claimReason: 'Bệnh nhân ăn nhai bị mẻ cạnh cắn' });
      assert.equal(claimRes.status, 200);
      assert.equal(claimRes.body.data.status, 'CLAIMED');
    }

    // 7.2 Kế toán trưởng duyệt xử lý sự cố y khoa đã ghi nhận
    const incidents = await database.sequelize.query(
      `SELECT TOP 1 IncidentId FROM dbo.Incidents WHERE Status='OPEN' ORDER BY CreatedAt DESC`,
      { type: database.sequelize.QueryTypes.SELECT }
    );
    const targetIncidentId = incidents[0].IncidentId;

    const resolveRes = await request(app)
      .post(`/api/operations/incidents/${targetIncidentId}/resolve`)
      .set('Authorization', `Bearer ${approverToken}`)
      .send({
        resolution: 'Hội đồng chuyên môn đã họp kiểm thảo; Xác nhận quy trình an toàn và lưu hồ sơ cảnh báo.',
        status: 'RESOLVED',
      });
    assert.equal(resolveRes.status, 200);
    assert.equal(resolveRes.body.data.status, 'RESOLVED');
  });

  t.after(async () => {
    await database.close();
  });
});
