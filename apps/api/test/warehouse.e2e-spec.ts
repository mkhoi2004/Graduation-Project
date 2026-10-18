import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

describe('WarehouseController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let warehouseToken: string;
  let warehouseUserId: number;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    configureApp(app);
    await app.init();

    prisma = app.get(PrismaService);

    // Login as Warehouse manager
    const whLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'warehouse', password: 'Dental@123' })
      .expect(200);

    warehouseToken = whLogin.body.accessToken;
    warehouseUserId = whLogin.body.user.id;
    expect(whLogin.body.user.role).toBe('WAREHOUSE_MANAGEMENT');
    expect(warehouseUserId).toBeGreaterThan(0);
  });

  afterEach(async () => {
    await app.close();
  });

  it('runs complete warehouse lifecycle: overview, new item, receipt MVT, print, post, issue XVT, and reversal', async () => {
    // 1. Overview
    const overviewRes = await request(app.getHttpServer())
      .get('/api/warehouse/overview')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(200);

    expect(overviewRes.body.metrics).toBeDefined();
    expect(overviewRes.body.groups).toHaveLength(3);
    const thuong = overviewRes.body.groups.find((g: any) => g.group === 'THUONG');
    expect(thuong).toBeDefined();
    expect(thuong.groupName).toBe('Vật tư y tế thường');

    // 2. Create supplier
    const supRes = await request(app.getHttpServer())
      .post('/api/warehouse/suppliers')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        name: `Công ty Thiết bị Y tế E2E ${Date.now()}`,
        phone: '0912345678',
        taxCode: '0101234567',
        address: 'Quận 1, TP. HCM',
      })
      .expect(201);

    expect(supRes.body.code).toMatch(/^NCC-\d{3}$/);
    const supplierId = supRes.body.id;

    // 3. Create supply item with auto VT-xxxx
    const itemRes = await request(app.getHttpServer())
      .post('/api/warehouse/items')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        name: `Bút ký phòng khám E2E ${Date.now()}`,
        group: 'VAN_PHONG',
        baseUnit: 'Cây',
        minimumStock: 15,
        expiryWarningDays: 90,
      })
      .expect(201);

    expect(itemRes.body.code).toMatch(/^VT-\d{4}$/);
    const supplyCode = itemRes.body.code;
    const supplyId = itemRes.body.id;

    // 4. Create receipt document (MVT)
    const receiptRes = await request(app.getHttpServer())
      .post('/api/warehouse/documents/receipts')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        supplierId,
        reason: 'Nhập hàng lô mới E2E',
        lines: [
          {
            supplyCode,
            inputQuantity: 10,
            inputUnit: 'Hộp',
            conversionFactor: 5,
            convertedQuantity: 50,
            batchNo: 'LOT-E2E-01',
            expiryDate: '2028-12-31',
            inputUnitPrice: 100000,
            vatRate: 10,
          },
        ],
      })
      .expect(201);

    const docId = receiptRes.body.id;
    expect(receiptRes.body.code).toMatch(/^MVT\d{8}\/\d{4}$/);
    expect(receiptRes.body.status).toBe('DRAFT');
    expect(receiptRes.body.goodsAmount).toBe(1000000);
    expect(receiptRes.body.vatAmount).toBe(100000);
    expect(receiptRes.body.totalAmount).toBe(1100000);
    expect(receiptRes.body.totalAmountInWords).toContain('Một triệu một trăm nghìn đồng');

    // 5. Update draft receipt
    const updateRes = await request(app.getHttpServer())
      .put(`/api/warehouse/documents/${docId}`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        reason: 'Nhập hàng lô mới E2E (Đã chỉnh lý do)',
      })
      .expect(200);

    expect(updateRes.body.reason).toContain('Đã chỉnh lý do');

    // 6. Print receipt
    const printRes = await request(app.getHttpServer())
      .post(`/api/warehouse/documents/${docId}/print`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(201);

    expect(printRes.body.status).toBe('PRINTED');
    expect(printRes.body.printCount).toBe(1);
    expect(printRes.body.isCopy).toBe(false);

    // 7. Post receipt
    const postRes = await request(app.getHttpServer())
      .post(`/api/warehouse/documents/${docId}/post`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ idempotencyKey: `e2e-receipt-${docId}` })
      .expect(201);

    expect(postRes.body.status).toBe('POSTED');
    expect(postRes.body.isLocked).toBe(true);

    // Verify stock incremented
    const supplyAfterReceipt = await prisma.medicalSupply.findUnique({ where: { id: supplyId } });
    expect(supplyAfterReceipt?.inStock).toBe(50);

    // Verify ledger and accounting entries
    const ledgerReceipt = await prisma.stockLedgerEntry.findFirst({
      where: { documentId: docId, direction: 'IN' },
    });
    expect(ledgerReceipt).toBeDefined();
    expect(Number(ledgerReceipt?.quantity)).toBe(50);

    const acctReceipt = await prisma.accountingWarehouseEntry.findFirst({
      where: { documentId: docId },
    });
    expect(acctReceipt?.eventType).toBe('PURCHASE_PAYABLE');
    expect(acctReceipt?.totalAmount).toBe(1100000);

    // 8. Create and Post Issue document (XVT)
    const issueRes = await request(app.getHttpServer())
      .post('/api/warehouse/documents/issues')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        outboundType: 'INTERNAL',
        recipientDepartment: 'Phòng khám tổng quát',
        reason: 'Cấp phát sử dụng hàng tuần',
        lines: [
          {
            supplyCode,
            inputQuantity: 5,
            inputUnit: 'Cuộn',
            conversionFactor: 1,
            convertedQuantity: 5,
          },
        ],
      })
      .expect(201);

    const issueDocId = issueRes.body.id;
    expect(issueRes.body.code).toMatch(/^XVT\d{8}\/\d{4}$/);

    // Print issue
    await request(app.getHttpServer())
      .post(`/api/warehouse/documents/${issueDocId}/print`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(201);

    // Post issue
    await request(app.getHttpServer())
      .post(`/api/warehouse/documents/${issueDocId}/post`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ idempotencyKey: `e2e-issue-${issueDocId}` })
      .expect(201);

    // Verify stock decremented
    const supplyAfterIssue = await prisma.medicalSupply.findUnique({ where: { id: supplyId } });
    expect(supplyAfterIssue?.inStock).toBe(45);

    // 9. Cancel and Reverse Issue document
    const cancelRes = await request(app.getHttpServer())
      .post(`/api/warehouse/documents/${issueDocId}/cancel`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({ reason: 'Phòng khám trả lại do chưa dùng đến' })
      .expect(201);

    expect(cancelRes.body.status).toBe('CANCELLED');

    // Verify stock restored
    const supplyAfterCancel = await prisma.medicalSupply.findUnique({ where: { id: supplyId } });
    expect(supplyAfterCancel?.inStock).toBe(50);

    // 10. Check usage endpoint
    const usageRes = await request(app.getHttpServer())
      .get('/api/warehouse/usage')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(200);

    expect(Array.isArray(usageRes.body)).toBe(true);

    // 11. Dispose damaged/expired batch -> verify transferred to InventoryBatchDeleted
    const batch = await prisma.inventoryBatch.findFirst({
      where: { supplyId, quantity: { gt: 0 } },
    });
    expect(batch).toBeDefined();
    const batchId = batch!.id;

    const disposeRes = await request(app.getHttpServer())
      .post(`/api/warehouse/batches/${batchId}/dispose`)
      .set('Authorization', `Bearer ${warehouseToken}`)
      .send({
        reason: 'Hàng bị hư hỏng do vận chuyển, xuất hủy chuyển bảng Deleted',
        quantity: 10,
      })
      .expect(201);

    expect(disposeRes.body.success).toBe(true);
    expect(disposeRes.body.deletedBatch).toBeDefined();
    expect(disposeRes.body.deletedBatch.originalId).toBe(batchId);
    expect(disposeRes.body.deletedBatch.deleteReason).toContain('hư hỏng');

    // Verify directly in SQL Server table InventoryBatchDeleted
    const deletedInDb = await prisma.inventoryBatchDeleted.findFirst({
      where: { originalId: batchId },
    });
    expect(deletedInDb).toBeDefined();
    expect(Number(deletedInDb?.quantity)).toBe(10);
    expect(deletedInDb?.deletedBy).toBe('warehouse');

    // 12. Query GET /api/warehouse/backup/deleted
    const backupRes = await request(app.getHttpServer())
      .get('/api/warehouse/backup/deleted')
      .set('Authorization', `Bearer ${warehouseToken}`)
      .expect(200);

    expect(backupRes.body.batches.length).toBeGreaterThan(0);
    expect(backupRes.body.batches.some((b: any) => b.originalId === batchId)).toBe(true);
  });
});
