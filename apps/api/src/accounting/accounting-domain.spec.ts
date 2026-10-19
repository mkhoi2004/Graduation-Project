import { describe, expect, it } from 'vitest';
import {
  ageDebt,
  calculateSettlement,
  calculateTax,
  isPeriodLocked,
  summarizeCash,
} from './accounting-domain.js';

describe('accounting domain', () => {
  describe('calculateTax', () => {
    it('rounds percentage tax to the nearest VND on each line', () => {
      expect(calculateTax({ preTaxAmount: 333_333, taxRate: 8 })).toEqual({
        preTaxAmount: 333_333,
        taxRate: 8,
        taxAmount: 26_667,
        totalAmount: 360_000,
      });
    });

    it('derives the displayed rate when tax amount is entered', () => {
      expect(calculateTax({ preTaxAmount: 400_000, taxAmount: 32_000 })).toEqual({
        preTaxAmount: 400_000,
        taxRate: 8,
        taxAmount: 32_000,
        totalAmount: 432_000,
      });
    });

    it('rejects invalid amounts and rates', () => {
      expect(() => calculateTax({ preTaxAmount: -1, taxRate: 0 })).toThrow('Số tiền chưa thuế không hợp lệ');
      expect(() => calculateTax({ preTaxAmount: 100, taxRate: 101 })).toThrow('Thuế suất phải từ 0 đến 100');
      expect(() => calculateTax({ preTaxAmount: 100, taxAmount: -1 })).toThrow('Tiền thuế không hợp lệ');
    });
  });

  describe('calculateSettlement', () => {
    it('creates a receivable when advances are below gross due', () => {
      expect(calculateSettlement({ recognizedRevenue: 1_000_000, taxAmount: 80_000, advances: 600_000 })).toEqual({
        grossDue: 1_080_000,
        appliedAdvance: 600_000,
        receivable: 480_000,
        surplusAdvance: 0,
      });
    });

    it('closes when advances equal gross due', () => {
      expect(calculateSettlement({ recognizedRevenue: 500_000, taxAmount: 0, advances: 500_000 })).toEqual({
        grossDue: 500_000,
        appliedAdvance: 500_000,
        receivable: 0,
        surplusAdvance: 0,
      });
    });

    it('retains the surplus when advances exceed gross due', () => {
      expect(calculateSettlement({ recognizedRevenue: 300_000, taxAmount: 0, advances: 500_000 })).toEqual({
        grossDue: 300_000,
        appliedAdvance: 300_000,
        receivable: 0,
        surplusAdvance: 200_000,
      });
    });

    it('recognizes no patient due for a cancelled examination', () => {
      expect(calculateSettlement({ recognizedRevenue: 900_000, taxAmount: 72_000, advances: 500_000, cancelled: true })).toEqual({
        grossDue: 0,
        appliedAdvance: 0,
        receivable: 0,
        surplusAdvance: 500_000,
      });
    });
  });

  it.each([
    ['2026-10-19', '0-30'],
    ['2026-09-18', '31-60'],
    ['2026-08-18', '61-90'],
    ['2026-07-18', '>90'],
  ] as const)('classifies due date %s into %s', (dueDate, bucket) => {
    expect(ageDebt({ dueDate: new Date(`${dueDate}T00:00:00Z`), asOf: new Date('2026-10-19T00:00:00Z') })).toBe(bucket);
  });

  it('summarizes only active cash movements and unique source documents', () => {
    expect(summarizeCash([
      { direction: 'IN', amount: 1_000_000, affectsCash: true, sourceCode: 'TNK-1', status: 'POSTED' },
      { direction: 'IN', amount: 200_000, affectsCash: true, sourceCode: 'TNK-1', status: 'POSTED' },
      { direction: 'OUT', amount: 300_000, affectsCash: true, sourceCode: 'MVT-1', status: 'POSTED' },
      { direction: 'OUT', amount: 999_000, affectsCash: false, sourceCode: 'XVT-1', status: 'POSTED' },
      { direction: 'IN', amount: 500_000, affectsCash: true, sourceCode: 'TNK-2', status: 'CANCELLED' },
    ])).toEqual({ moneyIn: 1_200_000, moneyOut: 300_000, netCash: 900_000, documentCount: 2 });
  });

  it('detects a locked accounting month', () => {
    const locks = [{ year: 2026, month: 9 }, { year: 2026, month: 10 }];
    expect(isPeriodLocked(new Date('2026-10-19T12:00:00Z'), locks)).toBe(true);
    expect(isPeriodLocked(new Date('2026-11-01T00:00:00Z'), locks)).toBe(false);
  });
});
