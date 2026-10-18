import { describe, expect, it } from 'vitest';
import {
  allocateStock,
  calculateReceiptLine,
  classifyBatch,
  computeDocumentHash,
  readVietnameseCurrency,
} from './warehouse-domain.js';

describe('warehouse domain', () => {
  it('calculates converted quantity, conversion factor, and VAT from the entered unit and converted qty', () => {
    const result = calculateReceiptLine({
      inputQuantity: 2,
      convertedQuantity: 200,
      inputUnitPrice: 150_000,
      vatRate: 8,
    });
    expect(result).toEqual({
      conversionFactor: 100,
      convertedQuantity: 200,
      goodsAmount: 300_000,
      vatAmount: 24_000,
      totalAmount: 324_000,
      unitCost: 1500,
    });
  });

  it('allocates expiring batches by FEFO then batches without expiry by FIFO', () => {
    const now = new Date('2026-10-18T00:00:00.000Z');
    expect(
      allocateStock(
        [
          { id: 1, quantity: 5, receivedAt: new Date('2026-01-01'), expiryDate: null },
          { id: 2, quantity: 4, receivedAt: new Date('2026-09-01'), expiryDate: new Date('2027-06-01') },
          { id: 3, quantity: 3, receivedAt: new Date('2026-10-01'), expiryDate: new Date('2027-01-01') },
        ],
        6,
        now,
        false,
      ),
    ).toEqual([
      { batchId: 3, quantity: 3 },
      { batchId: 2, quantity: 3 },
    ]);
  });

  it('allows manual batch allocation if batch is valid and has sufficient stock', () => {
    const now = new Date('2026-10-18T00:00:00.000Z');
    const batches = [
      { id: 10, quantity: 20, receivedAt: new Date('2026-01-01'), expiryDate: new Date('2027-01-01'), batchNo: 'B-10' },
      { id: 20, quantity: 30, receivedAt: new Date('2026-02-01'), expiryDate: new Date('2027-05-01'), batchNo: 'B-20' },
    ];
    expect(allocateStock(batches, 5, now, false, 20)).toEqual([{ batchId: 20, quantity: 5 }]);
  });

  it('rejects manual batch allocation when selected batch has insufficient stock', () => {
    const now = new Date('2026-10-18T00:00:00.000Z');
    const batches = [
      { id: 10, quantity: 2, receivedAt: new Date('2026-01-01'), expiryDate: new Date('2027-01-01'), batchNo: 'B-10' },
    ];
    expect(() => allocateStock(batches, 5, now, false, 10)).toThrow('chỉ còn 2, không đủ xuất 5');
  });

  it('does not allocate an expired batch for a regular issue', () => {
    expect(() =>
      allocateStock(
        [{ id: 1, quantity: 10, receivedAt: new Date('2026-01-01'), expiryDate: new Date('2026-10-18') }],
        1,
        new Date('2026-10-18T12:00:00.000Z'),
        false,
      ),
    ).toThrow('Không đủ tồn kho khả dụng');
  });

  it('allows an expired batch for disposal', () => {
    expect(
      allocateStock(
        [{ id: 7, quantity: 2, receivedAt: new Date('2026-01-01'), expiryDate: new Date('2026-02-01') }],
        2,
        new Date('2026-10-18'),
        true,
      ),
    ).toEqual([{ batchId: 7, quantity: 2 }]);
  });

  it('classifies low stock and near-expiry batches', () => {
    expect(
      classifyBatch(
        { quantity: 4, minimumStock: 5, expiryDate: new Date('2026-11-01') },
        new Date('2026-10-18'),
        30,
      ),
    ).toMatchObject({
      isLowStock: true,
      expiryStatus: 'EXPIRING_SOON',
    });
  });

  it('classifies expired batches', () => {
    expect(
      classifyBatch(
        { quantity: 10, minimumStock: 5, expiryDate: new Date('2026-09-01') },
        new Date('2026-10-18'),
        90,
      ),
    ).toMatchObject({
      isLowStock: false,
      expiryStatus: 'EXPIRED',
    });
  });

  it('computes deterministic content hash for documents', () => {
    const hash1 = computeDocumentHash({
      code: 'MVT20261018/0001',
      type: 'IN',
      supplierId: 1,
      lines: [{ supplyId: 10, convertedQuantity: 50, goodsAmount: 500000, totalAmount: 540000 }],
      totalAmount: 540000,
    });
    const hash2 = computeDocumentHash({
      code: 'MVT20261018/0001',
      type: 'IN',
      supplierId: 1,
      lines: [{ supplyId: 10, convertedQuantity: 50, goodsAmount: 500000, totalAmount: 540000 }],
      totalAmount: 540000,
    });
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('reads Vietnamese currency in words correctly', () => {
    expect(readVietnameseCurrency(0)).toBe('Không đồng');
    expect(readVietnameseCurrency(842400)).toBe('Tám trăm bốn mươi hai nghìn bốn trăm đồng');
    expect(readVietnameseCurrency(1500000)).toBe('Một triệu năm trăm nghìn đồng');
    expect(readVietnameseCurrency(10500)).toBe('Mười nghìn năm trăm đồng');
  });
});
