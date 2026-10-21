import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('DoctorController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs complete doctor workflow against real SQL Server database', async () => {
    // 1. Login as Reception staff to set up a patient
    const recLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'reception', password: 'Dental@123' })
      .expect(200);
    const recToken = recLogin.body.accessToken;

    // 2. Login as Doctor (BS. Hoàng Minh)
    const docLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'doctor-minh', password: 'Dental@123' })
      .expect(200);
    const docToken = docLogin.body.accessToken;
    expect(docLogin.body.user.role).toBe('DOCTOR');

    // Clean up any lingering in-progress examinations for doctor-minh
    await prisma.doctorExamination.updateMany({
      where: { doctorId: docLogin.body.user.id, status: 'IN_PROGRESS' },
      data: { status: 'CANCELLED', cancelReason: 'Cleanup E2E test' },
    });

    // 3. Create patient & intake assigned to doctor-minh and room-01
    const uniquePhone = `098${Date.now().toString().slice(-7)}`;
    const patientRes = await request(app.getHttpServer())
      .post('/api/reception/patients')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        fullName: 'Bệnh Nhân Khám Bác Sĩ E2E',
        dateOfBirth: '1990-05-15',
        gender: 'Nam',
        phone: uniquePhone,
        address: 'Quận 1, TP.HCM',
      })
      .expect(201);
    const patientCode = patientRes.body.id;

    const intakeRes = await request(app.getHttpServer())
      .post('/api/reception/intakes')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        patientCode,
        symptoms: 'Răng hàm 46 đau buốt khi nhai',
        priority: 'Ưu tiên',
        priorityReason: 'Người cao tuổi',
      })
      .expect(201);
    const intakeCode = intakeRes.body.id;

    await request(app.getHttpServer())
      .put(`/api/reception/intakes/${encodeURIComponent(intakeCode)}/services`)
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        roomCode: 'room-01',
        doctorUsername: 'doctor-minh',
        priority: 'Ưu tiên',
        priorityReason: 'Người cao tuổi',
        roomOverrideReason: 'Kiểm thử E2E ngoài ca trực',
        services: [{ serviceCode: 'cleaning', quantity: 1 }],
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/reception/intakes/${encodeURIComponent(intakeCode)}/pay-cash`)
      .set('Authorization', `Bearer ${recToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/reception/intakes/${encodeURIComponent(intakeCode)}/transfer`)
      .set('Authorization', `Bearer ${recToken}`)
      .expect(201);

    // 4. As Doctor: Verify rooms and queue
    const roomsRes = await request(app.getHttpServer())
      .get('/api/doctor/rooms')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);
    expect(roomsRes.body.length).toBeGreaterThan(0);

    const queueRes = await request(app.getHttpServer())
      .get('/api/doctor/queue')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);
    expect(queueRes.body.queue.length).toBeGreaterThan(0);
    const queuedPatient = queueRes.body.queue.find((p: any) => p.id === intakeCode);
    expect(queuedPatient).toBeDefined();
    expect(queuedPatient.priority).toBe('Ưu tiên');
    expect(queuedPatient.priorityReason).toBe('Người cao tuổi');

    // 5. As Doctor: Call Next Patient (Step 1)
    const callRes = await request(app.getHttpServer())
      .post('/api/doctor/call-next')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(201);

    const examinationId = callRes.body.nextExamination.id;
    expect(callRes.body.nextExamination.code).toMatch(/^PKB\d{8}\/\d{6}$/);
    expect(callRes.body.nextExamination.status).toBe('IN_PROGRESS');
    expect(callRes.body.nextExamination.isLocked).toBe(false);

    // Verify blocking: calling next again while IN_PROGRESS must fail with 400
    await request(app.getHttpServer())
      .post('/api/doctor/call-next')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(400);

    // 6. As Doctor: Check Supplies Catalog (Step 2 - No cost price returned)
    const suppliesRes = await request(app.getHttpServer())
      .get('/api/doctor/supplies')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);
    expect(suppliesRes.body.length).toBe(10);
    expect(suppliesRes.body[0]).toHaveProperty('id');
    expect(suppliesRes.body[0]).toHaveProperty('name');
    expect(suppliesRes.body[0]).toHaveProperty('inStock');
    expect(suppliesRes.body[0].costPrice).toBeUndefined(); // CONFIDENTIAL

    // 7. As Doctor: Update Supplies Used (Step 2)
    const intakeServiceId = callRes.body.nextExamination.intake.services[0].intakeServiceId;
    const updateSuppliesRes = await request(app.getHttpServer())
      .put(`/api/doctor/examinations/${examinationId}/supplies`)
      .set('Authorization', `Bearer ${docToken}`)
      .send({
        supplies: [
          { intakeServiceId, supplyCode: 'needle-septoject', quantityInBaseUnit: 2, conversionUnitUsed: 'Kim' },
          { intakeServiceId, supplyCode: 'composite-3m', quantityInBaseUnit: 1 },
        ],
      });
    if (updateSuppliesRes.status !== 200) {
      console.error('UPDATE SUPPLIES ERROR:', updateSuppliesRes.status, updateSuppliesRes.body);
    }
    expect(updateSuppliesRes.status).toBe(200);
    expect(updateSuppliesRes.body.supplies.length).toBe(2);

    // 8. As Doctor: Update Clinical Result (Step 3)
    await request(app.getHttpServer())
      .put(`/api/doctor/examinations/${examinationId}/result`)
      .set('Authorization', `Bearer ${docToken}`)
      .send({
        summary: 'Răng 46 sâu ngà sâu, tủy còn sống; nướu hơi viêm nhẹ',
        treatmentMethod: 'Làm sạch xoang sâu, trám composite quang trùng hợp 3M',
        treatmentOrientation: 'Vệ sinh răng miệng đúng cách, tránh nhai đồ cứng 24h đầu',
        nextAppointmentDate: '2026-10-25',
      })
      .expect(200);

    // 9. As Doctor: Record Print History (Step 3)
    const printRes = await request(app.getHttpServer())
      .post(`/api/doctor/examinations/${examinationId}/print`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(201);
    expect(printRes.body.success).toBe(true);
    expect(printRes.body.printedAt).toBeDefined();

    // 10. As Doctor: Complete Examination (Step 4 - Ghi sổ)
    const completeRes = await request(app.getHttpServer())
      .post(`/api/doctor/examinations/${examinationId}/complete`)
      .set('Authorization', `Bearer ${docToken}`)
      .expect(201);

    expect(completeRes.body.status).toBe('COMPLETED');
    expect(completeRes.body.isLocked).toBe(true);

    // Verify in SQL Server Database
    const dbExam = await prisma.doctorExamination.findUnique({
      where: { id: examinationId },
      include: {
        supplies: true,
        reservations: true,
        accountingOutbox: true,
      },
    });
    expect(dbExam?.status).toBe('COMPLETED');
    expect(dbExam?.isLocked).toBe(true);
    expect(dbExam?.reservations.every((r) => r.status === 'DEDUCTED')).toBe(true);
    expect(dbExam?.accountingOutbox).toBeDefined();
    expect(dbExam?.accountingOutbox?.serviceRevenue).toBeGreaterThan(0);
    expect(dbExam?.accountingOutbox?.supplyCost).toBeGreaterThan(0);

    // 11. Test Admin Unlock Functionality
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'Dental@123' })
      .expect(200);
    const adminToken = adminLogin.body.accessToken;

    const unlockRes = await request(app.getHttpServer())
      .post(`/api/doctor/examinations/${examinationId}/unlock`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ reason: 'Hội đồng chuyên môn yêu cầu bổ sung thông tin tóm tắt điều trị' })
      .expect(201);

    expect(unlockRes.body.success).toBe(true);
    const dbExamAfterUnlock = await prisma.doctorExamination.findUnique({
      where: { id: examinationId },
    });
    expect(dbExamAfterUnlock?.isLocked).toBe(false);

    const auditLogs = await prisma.examinationAuditLog.findMany({
      where: { examinationId },
    });
    expect(auditLogs.length).toBeGreaterThan(0);
    expect(auditLogs[0].action).toBe('UNLOCK');

    // 12. Test Deleted Backup Query Endpoint
    const deletedRes = await request(app.getHttpServer())
      .get('/api/doctor/backup/deleted')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(200);
    expect(deletedRes.body).toHaveProperty('examinations');
    expect(deletedRes.body).toHaveProperty('supplies');
    expect(deletedRes.body).toHaveProperty('outboxes');
  });

  it('handles universal cancel / refusal examination correctly', async () => {
    // 1. Logins
    const recLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'reception', password: 'Dental@123' })
      .expect(200);
    const recToken = recLogin.body.accessToken;

    const docLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'doctor-lan', password: 'Dental@123' })
      .expect(200);
    const docToken = docLogin.body.accessToken;

    // Clean up
    await prisma.doctorExamination.updateMany({
      where: { doctorId: docLogin.body.user.id, status: 'IN_PROGRESS' },
      data: { status: 'CANCELLED', cancelReason: 'Cleanup E2E test' },
    });

    // 2. Setup patient & intake assigned to doctor-lan
    const uniquePhone = `097${Date.now().toString().slice(-7)}`;
    const patientRes = await request(app.getHttpServer())
      .post('/api/reception/patients')
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        fullName: 'Bệnh Nhân Từ Chối Khám E2E',
        dateOfBirth: '1988-08-08',
        gender: 'Nữ',
        phone: uniquePhone,
      })
      .expect(201);

    const intakeRes = await request(app.getHttpServer())
      .post('/api/reception/intakes')
      .set('Authorization', `Bearer ${recToken}`)
      .send({ patientCode: patientRes.body.id, symptoms: 'Đau răng khôn' })
      .expect(201);

    await request(app.getHttpServer())
      .put(`/api/reception/intakes/${encodeURIComponent(intakeRes.body.id)}/services`)
      .set('Authorization', `Bearer ${recToken}`)
      .send({
        roomCode: 'room-02',
        doctorUsername: 'doctor-lan',
        priority: 'Thường',
        roomOverrideReason: 'Kiểm thử E2E ngoài ca trực',
        services: [{ serviceCode: 'cleaning', quantity: 1 }],
      })
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/reception/intakes/${encodeURIComponent(intakeRes.body.id)}/pay-cash`)
      .set('Authorization', `Bearer ${recToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/reception/intakes/${encodeURIComponent(intakeRes.body.id)}/transfer`)
      .set('Authorization', `Bearer ${recToken}`)
      .expect(201);

    // 3. Call patient
    const callRes = await request(app.getHttpServer())
      .post('/api/doctor/call-next')
      .set('Authorization', `Bearer ${docToken}`)
      .expect(201);
    const examinationId = callRes.body.nextExamination.id;

    // 4. Cancel requires reason: blank reason must fail with 400
    await request(app.getHttpServer())
      .post(`/api/doctor/examinations/${examinationId}/cancel`)
      .set('Authorization', `Bearer ${docToken}`)
      .send({ reason: '' })
      .expect(400);

    // 5. Cancel with valid reason
    const cancelReason = 'Bệnh nhân có huyết áp 180/100, chống chỉ định nhổ răng, đã chuyển khoa cấp cứu.';
    const cancelRes = await request(app.getHttpServer())
      .post(`/api/doctor/examinations/${examinationId}/cancel`)
      .set('Authorization', `Bearer ${docToken}`)
      .send({ reason: cancelReason })
      .expect(201);

    expect(cancelRes.body.status).toBe('CANCELLED');
    expect(cancelRes.body.cancelReason).toBe(cancelReason);
    expect(cancelRes.body.isLocked).toBe(true);

    // Verify in SQL Server Database: Outbox service revenue must be 0
    const dbExam = await prisma.doctorExamination.findUnique({
      where: { id: examinationId },
      include: { accountingOutbox: true },
    });
    expect(dbExam?.status).toBe('CANCELLED');
    expect(dbExam?.isLocked).toBe(true);
    expect(dbExam?.accountingOutbox).toBeDefined();
    expect(dbExam?.accountingOutbox?.serviceRevenue).toBe(0); // REVENUE IS 0
  });
});
