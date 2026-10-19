import { describe, expect, it, vi } from 'vitest';
import { AccountingController } from './accounting.controller.js';

describe('AccountingController boundary', () => {
  it('normalizes overview query dates before calling the service', async () => {
    const service = { getOverview: vi.fn().mockResolvedValue({ cash: {}, performance: {}, debt: {} }) };
    const controller = new AccountingController(service as any);

    await controller.overview('2026-10-01', '2026-10-19', '5', 'TREATMENT', 'THUONG');

    expect(service.getOverview).toHaveBeenCalledWith({
      startDate: new Date('2026-10-01T00:00:00.000Z'),
      endDate: new Date('2026-10-19T23:59:59.999Z'),
      roomId: 5,
      serviceType: 'TREATMENT',
      supplyType: 'THUONG',
    });
  });

  it('uses the authenticated actor for debt payment instead of accepting an actor from the body', async () => {
    const service = { createDebtPayment: vi.fn().mockResolvedValue({ status: 'PARTIAL' }) };
    const controller = new AccountingController(service as any);
    const request = { user: { sub: 9, role: 'ACCOUNTING_STAFF', username: 'accounting' } } as any;

    await controller.payDebt(70, {
      amount: 300_000,
      method: 'TRANSFER',
      transactionCode: 'BANK-001',
      effectiveDate: '2026-10-18',
    }, request);

    expect(service.createDebtPayment).toHaveBeenCalledWith(70, {
      amount: 300_000,
      method: 'TRANSFER',
      transactionCode: 'BANK-001',
      effectiveDate: new Date('2026-10-18T00:00:00.000Z'),
    }, { id: 9, role: 'ACCOUNTING_STAFF' });
  });
});
