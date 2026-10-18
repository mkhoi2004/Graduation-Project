import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WarehouseService } from './warehouse.service.js';

describe('WarehouseService', () => {
  let service: WarehouseService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      medicalSupply: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      inventoryBatch: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      supplier: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
      },
      stockDocument: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        count: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      stockDocumentLine: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      stockAllocation: {
        create: vi.fn(),
      },
      stockLedgerEntry: {
        create: vi.fn(),
      },
      accountingWarehouseEntry: {
        create: vi.fn(),
      },
      warehouseAuditLog: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      warehousePrintLog: {
        deleteMany: vi.fn(),
      },
      inventoryBatchDeleted: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      medicalSupplyDeleted: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      stockDocumentDeleted: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      stockDocumentLineDeleted: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      stockAllocationDeleted: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      stockLedgerEntryDeleted: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      examinationSupply: {
        findMany: vi.fn(),
      },
      patient: { findMany: vi.fn() },
      user: { findMany: vi.fn(), findUnique: vi.fn() },
      clinicRoom: { findMany: vi.fn() },
      intake: { findMany: vi.fn() },
      $transaction: vi.fn((callback) => callback(prisma)),
    };

    service = new WarehouseService(prisma);
  });

  describe('overview', () => {
    it('aggregates inventory value, quantities, and group structures', async () => {
      prisma.medicalSupply.findMany.mockResolvedValue([
        { id: 1, code: 'VT-0001', name: 'Găng tay', group: 'THUONG', baseUnit: 'Cái', minimumStock: 10, expiryWarningDays: 90, isActive: true },
        { id: 2, code: 'VT-0002', name: 'Kim tiêm', group: 'VO_CAM', baseUnit: 'Kim', minimumStock: 5, expiryWarningDays: 90, isActive: true },
      ]);
      prisma.inventoryBatch.findMany.mockResolvedValue([
        { id: 101, supplyId: 1, quantity: 100, unitCost: 1000, expiryDate: new Date('2027-01-01'), supply: { minimumStock: 10, expiryWarningDays: 90 } },
        { id: 102, supplyId: 2, quantity: 2, unitCost: 5000, expiryDate: new Date('2026-09-01'), supply: { minimumStock: 5, expiryWarningDays: 90 } }, // Expired
      ]);
      prisma.stockDocument.findMany.mockResolvedValue([]);

      const result = await service.overview();
      expect(result.metrics.itemCount).toBe(2);
      expect(result.metrics.inventoryValue).toBe(100 * 1000 + 2 * 5000);
      expect(result.metrics.lowStockCount).toBe(1); // Supply 2 has 2 <= 5
      expect(result.metrics.expiredCount).toBe(1);

      const thuongGroup = result.groups.find((g) => g.group === 'THUONG');
      expect(thuongGroup?.quantity).toBe(100);
      expect(thuongGroup?.inventoryValue).toBe(100000);
    });
  });

  describe('createReceipt', () => {
    it('rejects VO_CAM supplies without batchNo or expiryDate', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 1, name: 'NCC Demo' });
      prisma.medicalSupply.findMany.mockResolvedValue([
        { id: 1, code: 'VO_CAM_1', name: 'Thuốc tê', group: 'VO_CAM', baseUnit: 'Ống', inStock: 0, isActive: true },
      ]);

      await expect(
        service.createReceipt({
          supplierId: 1,
          lines: [
            { supplyCode: 'VO_CAM_1', inputQuantity: 10, inputUnit: 'Hộp', convertedQuantity: 100, inputUnitPrice: 50000, vatRate: 8 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates draft receipt with correct amounts and auto-generates MVT code', async () => {
      prisma.supplier.findUnique.mockResolvedValue({ id: 1, name: 'NCC Demo' });
      prisma.medicalSupply.findMany.mockResolvedValue([
        { id: 1, code: 'THUONG_1', name: 'Găng tay', group: 'THUONG', baseUnit: 'Cái', inStock: 0, isActive: true },
      ]);
      prisma.stockDocument.findMany.mockResolvedValue([]);
      prisma.stockDocument.create.mockImplementation(({ data }) => ({
        id: 99,
        ...data,
        supplier: { id: 1, name: 'NCC Demo' },
        lines: data.lines.create,
        printLogs: [],
        auditLogs: [],
      }));

      const result = await service.createReceipt({
        supplierId: 1,
        reason: 'Nhập đầu kỳ',
        lines: [
          {
            supplyCode: 'THUONG_1',
            inputQuantity: 2,
            inputUnit: 'Hộp',
            convertedQuantity: 200,
            expiryDate: '2027-12-31',
            inputUnitPrice: 100000,
            vatRate: 10,
          },
        ],
      });

      expect(result.code).toMatch(/^MVT\d{8}\/0001$/);
      expect(result.goodsAmount).toBe(200000);
      expect(result.vatAmount).toBe(20000);
      expect(result.totalAmount).toBe(220000);
      expect(result.totalAmountInWords).toContain('Hai trăm hai mươi nghìn đồng');
    });
  });

  describe('createIssue', () => {
    it('rejects issue when requested quantity exceeds available stock', async () => {
      prisma.medicalSupply.findMany.mockResolvedValue([
        { id: 1, code: 'VT_1', name: 'Găng tay', baseUnit: 'Cái', inStock: 50, isActive: true },
      ]);

      await expect(
        service.createIssue({
          outboundType: 'INTERNAL',
          recipientDepartment: 'Phòng khám 01',
          lines: [{ supplyCode: 'VT_1', inputQuantity: 100, inputUnit: 'Cái', convertedQuantity: 100 }],
        }),
      ).rejects.toThrow('Không đủ tồn kho để xuất Găng tay');
    });

    it('creates patient issue with XVT prefix', async () => {
      prisma.medicalSupply.findMany.mockResolvedValue([
        { id: 1, code: 'VT_1', name: 'Kim tiêm', baseUnit: 'Kim', inStock: 500, isActive: true },
      ]);
      prisma.stockDocument.findMany.mockResolvedValue([{ code: 'XVT20261018/0002' }]);
      prisma.stockDocument.create.mockImplementation(({ data }) => ({
        id: 100,
        ...data,
        lines: data.lines.create,
        printLogs: [],
        auditLogs: [],
      }));

      const result = await service.createIssue({
        outboundType: 'PATIENT_USE',
        patientId: 1,
        doctorId: 2,
        lines: [{ supplyCode: 'VT_1', inputQuantity: 2, inputUnit: 'Kim', convertedQuantity: 2 }],
      });

      expect(result.code).toMatch(/^XVT\d{8}\/0003$/);
      expect(result.outboundType).toBe('PATIENT_USE');
    });
  });

  describe('print and post lifecycle', () => {
    it('sets status to PRINTED on print and rejects post if content was modified', async () => {
      const mockDoc = {
        id: 10,
        code: 'MVT20261018/0001',
        type: 'IN',
        status: 'DRAFT',
        printCount: 0,
        supplierId: 1,
        totalAmount: 100000,
        lines: [{ supplyId: 1, convertedQuantity: 10, goodsAmount: 100000, totalAmount: 100000 }],
      };
      prisma.stockDocument.findUnique.mockResolvedValue(mockDoc);
      prisma.stockDocument.update.mockImplementation(({ data }) => ({
        ...mockDoc,
        ...data,
        printCount: (mockDoc.printCount || 0) + 1,
        isCopy: false,
      }));

      const printed = await service.print(10, 1);
      expect(printed.status).toBe('PRINTED');
      expect(printed.printCount).toBe(1);

      // Now attempt post with tampered contentHash
      prisma.stockDocument.findUnique.mockResolvedValue({
        ...mockDoc,
        status: 'PRINTED',
        contentHash: 'stale-or-tampered-hash',
      });

      await expect(service.post(10, 1)).rejects.toThrow('Nội dung phiếu đã bị sửa đổi sau khi in');
    });
  });

  describe('cancel and reversal', () => {
    it('reverses stock and creates reversal ledger when cancelling a POSTED issue', async () => {
      const mockDoc = {
        id: 20,
        code: 'XVT20261018/0001',
        type: 'OUT',
        outboundType: 'INTERNAL',
        status: 'POSTED',
        goodsAmount: 50000,
        vatAmount: 0,
        totalAmount: 50000,
        lines: [
          {
            id: 1,
            supplyId: 10,
            convertedQuantity: 5,
            goodsAmount: 50000,
            supply: { id: 10, name: 'Vật tư A', inStock: 95 },
            allocations: [{ id: 1, batchId: 101, quantity: 5 }],
          },
        ],
      };
      prisma.stockDocument.findUnique.mockResolvedValue(mockDoc);
      prisma.stockDocument.update.mockImplementation(({ data }) => ({ ...mockDoc, ...data }));

      const result = await service.cancel(20, 1, 'Nhập nhầm phòng ban');
      expect(result.status).toBe('CANCELLED');
      expect(prisma.medicalSupply.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10 },
          data: { inStock: { increment: 5 } },
        }),
      );
      expect(prisma.stockLedgerEntry.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ direction: 'IN_REVERSAL', quantity: 5 }),
        }),
      );
    });
  });

  describe('disposeBatch (hủy sản phẩm hư hỏng hoặc hết hạn)', () => {
    it('disposes expired/damaged batch, decrements stock, records to InventoryBatchDeleted', async () => {
      const mockBatch = {
        id: 105,
        supplyId: 1,
        batchNo: 'EXP-999',
        quantity: 10,
        unitCost: 2000,
        originalReceiptCode: 'MVT20261018/0001',
        receivedAt: new Date('2026-01-01'),
        expiryDate: new Date('2026-05-01'),
        supply: { id: 1, name: 'Thuốc tê Lidocaine', baseUnit: 'Ống', inStock: 50 },
      };
      prisma.inventoryBatch.findUnique.mockResolvedValue(mockBatch);
      prisma.user.findUnique.mockResolvedValue({ id: 1, username: 'warehouse-manager' });
      prisma.inventoryBatch.update.mockResolvedValue({ ...mockBatch, quantity: 0 });
      prisma.medicalSupply.update.mockResolvedValue({ id: 1, inStock: 40 });
      prisma.stockDocument.findMany.mockResolvedValue([]);
      prisma.stockDocument.create.mockResolvedValue({
        id: 88,
        code: 'XVT20261018/0001',
        lines: [{ id: 1, convertedQuantity: 10 }],
      });
      prisma.inventoryBatchDeleted.create.mockResolvedValue({
        id: 1,
        originalId: 105,
        batchNo: 'EXP-999',
        quantity: 10,
        deleteReason: 'Hàng hết hạn sử dụng',
      });

      const result = await service.disposeBatch(105, { reason: 'Hàng hết hạn sử dụng' }, 1);

      expect(result.success).toBe(true);
      expect(prisma.inventoryBatch.update).toHaveBeenCalledWith({
        where: { id: 105 },
        data: { quantity: { decrement: 10 } },
      });
      expect(prisma.medicalSupply.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { inStock: { decrement: 10 } },
      });
      expect(prisma.inventoryBatchDeleted.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          originalId: 105,
          batchNo: 'EXP-999',
          quantity: 10,
          deletedBy: 'warehouse-manager',
          deleteReason: 'Hàng hết hạn sử dụng',
        }),
      });
    });

    it('rejects disposal without reason or when batch is empty', async () => {
      await expect(service.disposeBatch(105, { reason: '' })).rejects.toThrow(BadRequestException);

      prisma.inventoryBatch.findUnique.mockResolvedValue({
        id: 105,
        quantity: 0,
        supply: { name: 'Vật tư', baseUnit: 'Cái' },
      });
      await expect(service.disposeBatch(105, { reason: 'Hết hạn' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteSupplyItem (chuyển sang MedicalSupplyDeleted và InventoryBatchDeleted)', () => {
    it('backs up supply and batches to *Deleted tables then sets inactive', async () => {
      const mockSupply = {
        id: 2,
        code: 'VT-0002',
        name: 'Vật tư hỏng',
        group: 'THUONG',
        baseUnit: 'Cái',
        costPrice: 5000,
        inStock: 15,
        inventoryBatches: [
          {
            id: 201,
            supplyId: 2,
            batchNo: 'B-01',
            quantity: 15,
            unitCost: 5000,
            originalReceiptCode: 'MVT001',
            receivedAt: new Date(),
            expiryDate: new Date(),
          },
        ],
      };
      prisma.medicalSupply.findUnique.mockResolvedValue(mockSupply);
      prisma.user.findUnique.mockResolvedValue({ id: 1, username: 'admin' });
      prisma.inventoryBatchDeleted.create.mockResolvedValue({ id: 1 });
      prisma.medicalSupplyDeleted.create.mockResolvedValue({ id: 1, code: 'VT-0002' });

      const result = await service.deleteSupplyItem(2, 'Hàng bị lỗi nhà sản xuất, tiêu hủy toàn bộ', 1);

      expect(result.success).toBe(true);
      expect(prisma.inventoryBatchDeleted.create).toHaveBeenCalled();
      expect(prisma.medicalSupplyDeleted.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          code: 'VT-0002',
          deleteReason: 'Hàng bị lỗi nhà sản xuất, tiêu hủy toàn bộ',
          deletedBy: 'admin',
        }),
      });
      expect(prisma.medicalSupply.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { isActive: false, inStock: 0 },
      });
    });
  });

  describe('getDeletedBackups', () => {
    it('returns records from *Deleted tables', async () => {
      prisma.inventoryBatchDeleted.findMany.mockResolvedValue([{ id: 1, batchNo: 'EXP-1' }]);
      prisma.medicalSupplyDeleted.findMany.mockResolvedValue([{ id: 1, code: 'VT-01' }]);
      prisma.stockDocumentDeleted.findMany.mockResolvedValue([]);
      prisma.stockDocumentLineDeleted.findMany.mockResolvedValue([]);
      prisma.stockAllocationDeleted.findMany.mockResolvedValue([]);
      prisma.stockLedgerEntryDeleted.findMany.mockResolvedValue([]);

      const result = await service.getDeletedBackups();
      expect(result.batches.length).toBe(1);
      expect(result.supplies.length).toBe(1);
    });
  });
});
