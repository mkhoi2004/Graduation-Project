import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { configureApp } from './../src/app.setup.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  it('/api/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/health')
      .expect(200)
      .expect({ service: 'dental-erp-api', status: 'ok' });
  });

  it('/api/openapi.json (GET)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/openapi.json')
      .expect(200);

    expect(response.body.info.title).toBe('Dental ERP API');
    expect(response.body.paths).toHaveProperty('/api/health');
    expect(response.body.paths).toHaveProperty('/api/auth/login');
    expect(
      response.body.paths['/api/auth/login'].post.responses['200'].content[
        'application/json'
      ].schema.$ref,
    ).toBe('#/components/schemas/LoginResponseDto');
  });

  it('/api/payments/momo (POST) requires authentication', () => {
    return request(app.getHttpServer())
      .post('/api/payments/momo')
      .send({ intakeCode: 'TNK1', amount: 400000 })
      .expect(401);
  });

  it('runs complete reception workflow against SQL Server database', async () => {
    // 1. Login as reception staff
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'reception', password: 'Dental@123' })
      .expect(200);

    const token = loginRes.body.accessToken;
    expect(token).toBeDefined();

    // 2. Fetch master data
    const masterRes = await request(app.getHttpServer())
      .get('/api/reception/master-data')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(masterRes.body.rooms.length).toBeGreaterThan(0);
    expect(masterRes.body.services.length).toBeGreaterThan(0);
    expect(masterRes.body.doctors.length).toBeGreaterThan(0);

    // 3. Create a new patient
    const uniquePhone = `099${Date.now().toString().slice(-7)}`;
    const patientRes = await request(app.getHttpServer())
      .post('/api/reception/patients')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fullName: 'Bệnh Nhân E2E Test',
        dateOfBirth: '1995-12-10',
        gender: 'Nữ',
        phone: uniquePhone,
        citizenId: '001195829304',
        address: 'Hà Nội',
        note: 'Kiểm tra lưu CSDL',
      })
      .expect(201);

    const patientCode = patientRes.body.id;
    expect(patientCode).toMatch(/^MBN\d{8}\/\d{4}$/);

    // 4. Create intake
    const intakeRes = await request(app.getHttpServer())
      .post('/api/reception/intakes')
      .set('Authorization', `Bearer ${token}`)
      .send({
        patientCode,
        symptoms: 'Đau răng hàm e2e',
        priority: 'Ưu tiên',
        priorityReason: 'Người cao tuổi',
      })
      .expect(201);

    const intakeCode = intakeRes.body.id;
    expect(intakeCode).toMatch(/^TNK\d{8}\/\d{4}$/);
    expect(intakeRes.body.status).toBe('DRAFT');

    // 5. Update services, room, and doctor
    const updateRes = await request(app.getHttpServer())
      .put(`/api/reception/intakes/${encodeURIComponent(intakeCode)}/services`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        roomCode: masterRes.body.rooms[0].id,
        doctorUsername: masterRes.body.doctors[0].id,
        priority: 'Ưu tiên',
        priorityReason: 'Người cao tuổi',
        roomOverrideReason: 'Kiểm thử E2E ngoài ca trực',
        services: [{ serviceCode: masterRes.body.services[0].id, quantity: 2 }],
      })
      .expect(200);

    expect(updateRes.body.status).toBe('READY');
    expect(updateRes.body.roomId).toBe(masterRes.body.rooms[0].id);

    // 6. Pay cash
    const payRes = await request(app.getHttpServer())
      .post(`/api/reception/intakes/${encodeURIComponent(intakeCode)}/pay-cash`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(payRes.body.status).toBe('PAID');
    expect(payRes.body.payment.method).toBe('CASH');

    // 7. Transfer to doctor
    const transferRes = await request(app.getHttpServer())
      .post(`/api/reception/intakes/${encodeURIComponent(intakeCode)}/transfer`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(transferRes.body.status).toBe('TRANSFERRED');
    expect(transferRes.body.transferredAt).toBeDefined();

    // 8. Test saving large report to local Report/PhieuKham (500KB+ payload)
    const largeContent = Buffer.alloc(500 * 1024, 'PDF-DENTAL-DATA').toString('base64');
    const reportFileName = `phieu-kham-test-${Date.now()}.pdf`;
    const saveReportRes = await request(app.getHttpServer())
      .post('/api/reports/save')
      .send({
        folder: 'PhieuKham',
        fileName: reportFileName,
        fileBase64: largeContent,
        contentType: 'application/pdf',
      })
      .expect(201);

    expect(saveReportRes.body.success).toBe(true);
    expect(saveReportRes.body.folder).toBe('PhieuKham');
    expect(saveReportRes.body.relativePath).toContain('Report/PhieuKham');

    // Verify file can be read back
    await request(app.getHttpServer())
      .get(`/api/reports/PhieuKham/${encodeURIComponent(reportFileName)}`)
      .expect(200);
  });

  afterEach(async () => {
    await app.close();
  });
});
