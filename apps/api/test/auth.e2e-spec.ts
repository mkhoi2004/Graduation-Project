import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { vi } from 'vitest';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

describe('Authentication & Authorization (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    vi.spyOn(ThrottlerGuard.prototype, 'canActivate').mockResolvedValue(true);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. POST /api/auth/login - Xác thực thông tin đăng nhập', () => {
    it('cho phép đăng nhập thành công với tài khoản Quản trị viên (admin)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: 'Dental@123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.expiresIn).toBe(28800);
      expect(res.body.user).toMatchObject({
        username: 'admin',
        role: 'ADMIN',
        roleName: 'Quản trị viên',
      });
    });

    it('cho phép đăng nhập thành công với tài khoản Quầy tiếp nhận (reception)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'reception', password: 'Dental@123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user).toMatchObject({
        username: 'reception',
        role: 'RECEPTION_STAFF',
        roleName: 'Nhân viên tiếp nhận',
      });
    });

    it('cho phép đăng nhập thành công với tài khoản Bác sĩ (doctor / doctor-minh)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'doctor-minh', password: 'Dental@123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user).toMatchObject({
        username: 'doctor-minh',
        role: 'DOCTOR',
      });
    });

    it('cho phép đăng nhập thành công với tài khoản Quản lý kho (warehouse)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'warehouse', password: 'Dental@123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user).toMatchObject({
        username: 'warehouse',
        role: 'WAREHOUSE_MANAGEMENT',
        roleName: 'Quản lý kho',
      });
    });

    it('cho phép đăng nhập thành công với tài khoản Kế toán (accounting)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'accounting', password: 'Dental@123' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.tokenType).toBe('Bearer');
      expect(res.body.user).toMatchObject({
        username: 'accounting',
        role: 'ACCOUNTING_STAFF',
        roleName: 'Nhân viên kế toán',
      });
    });

    it('từ chối 401 khi sai mật khẩu', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'reception', password: 'WrongPassword@999' })
        .expect(401);

      expect(res.body.message).toBe('Tên đăng nhập hoặc mật khẩu không đúng');
    });

    it('từ chối 401 khi tài khoản không tồn tại trong CSDL', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'non_existent_user_xyz', password: 'Dental@123' })
        .expect(401);

      expect(res.body.message).toBe('Tên đăng nhập hoặc mật khẩu không đúng');
    });

    it('từ chối 400 Bad Request khi thiếu trường username hoặc password không đủ 8 ký tự', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ password: 'Dental@123' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ username: 'admin', password: '123' })
        .expect(400);
    });
  });

  describe('2. Token Verification & Guards - Kiểm soát truy cập và Phân quyền Role', () => {
    let receptionToken: string;
    let doctorToken: string;
    let warehouseToken: string;
    let adminToken: string;

    beforeAll(async () => {
      const [recRes, docRes, whRes, admRes] = await Promise.all([
        request(app.getHttpServer()).post('/api/auth/login').send({ username: 'reception', password: 'Dental@123' }),
        request(app.getHttpServer()).post('/api/auth/login').send({ username: 'doctor-minh', password: 'Dental@123' }),
        request(app.getHttpServer()).post('/api/auth/login').send({ username: 'warehouse', password: 'Dental@123' }),
        request(app.getHttpServer()).post('/api/auth/login').send({ username: 'admin', password: 'Dental@123' }),
      ]);

      receptionToken = recRes.body.accessToken;
      doctorToken = docRes.body.accessToken;
      warehouseToken = whRes.body.accessToken;
      adminToken = admRes.body.accessToken;
    });

    it('từ chối 401 Unauthorized khi truy cập endpoint bảo vệ mà không có Bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reception/master-data')
        .expect(401);

      expect(res.body.message).toContain('Thiếu phiên đăng nhập hợp lệ');
    });

    it('từ chối 401 Unauthorized khi Bearer token giả mạo hoặc sai chữ ký JWT', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/doctor/queue')
        .set('Authorization', 'Bearer invalid.fake.token.xyz')
        .expect(401);

      expect(res.body.message).toContain('Phiên đăng nhập không hợp lệ hoặc đã hết hạn');
    });

    it('ReceptionAccessGuard: chỉ cho phép RECEPTION_STAFF và ADMIN truy cập /api/reception/*', async () => {
      // 1. RECEPTION_STAFF truy cập -> 200 OK
      await request(app.getHttpServer())
        .get('/api/reception/master-data')
        .set('Authorization', `Bearer ${receptionToken}`)
        .expect(200);

      // 2. ADMIN truy cập -> 200 OK
      await request(app.getHttpServer())
        .get('/api/reception/master-data')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 3. DOCTOR truy cập -> 403 Forbidden
      const docDeny = await request(app.getHttpServer())
        .get('/api/reception/master-data')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
      expect(docDeny.body.message).toBe('Bạn không có quyền truy cập module tiếp nhận.');

      // 4. WAREHOUSE truy cập -> 403 Forbidden
      const whDeny = await request(app.getHttpServer())
        .get('/api/reception/master-data')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(403);
      expect(whDeny.body.message).toBe('Bạn không có quyền truy cập module tiếp nhận.');
    });

    it('DoctorAccessGuard: chỉ cho phép DOCTOR và ADMIN truy cập /api/doctor/*', async () => {
      // 1. DOCTOR truy cập -> 200 OK
      await request(app.getHttpServer())
        .get('/api/doctor/queue')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(200);

      // 2. ADMIN truy cập -> 200 OK
      await request(app.getHttpServer())
        .get('/api/doctor/queue')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 3. RECEPTION_STAFF truy cập -> 403 Forbidden
      const recDeny = await request(app.getHttpServer())
        .get('/api/doctor/queue')
        .set('Authorization', `Bearer ${receptionToken}`)
        .expect(403);
      expect(recDeny.body.message).toBe('Bạn không có quyền truy cập phân hệ Bác sĩ.');

      // 4. WAREHOUSE truy cập -> 403 Forbidden
      const whDeny = await request(app.getHttpServer())
        .get('/api/doctor/queue')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(403);
      expect(whDeny.body.message).toBe('Bạn không có quyền truy cập phân hệ Bác sĩ.');
    });

    it('WarehouseAccessGuard: chỉ cho phép WAREHOUSE_MANAGEMENT và ADMIN truy cập /api/warehouse/*', async () => {
      // 1. WAREHOUSE_MANAGEMENT truy cập -> 200 OK
      await request(app.getHttpServer())
        .get('/api/warehouse/overview')
        .set('Authorization', `Bearer ${warehouseToken}`)
        .expect(200);

      // 2. ADMIN truy cập -> 200 OK
      await request(app.getHttpServer())
        .get('/api/warehouse/overview')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 3. RECEPTION_STAFF truy cập -> 403 Forbidden
      const recDeny = await request(app.getHttpServer())
        .get('/api/warehouse/overview')
        .set('Authorization', `Bearer ${receptionToken}`)
        .expect(403);
      expect(recDeny.body.message).toBe('Bạn không có quyền truy cập phân hệ Quản lý kho.');

      // 4. DOCTOR truy cập -> 403 Forbidden
      const docDeny = await request(app.getHttpServer())
        .get('/api/warehouse/overview')
        .set('Authorization', `Bearer ${doctorToken}`)
        .expect(403);
      expect(docDeny.body.message).toBe('Bạn không có quyền truy cập phân hệ Quản lý kho.');
    });
  });
});
