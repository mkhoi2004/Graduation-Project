import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AccountingService } from './accounting.service.js';

describe('AccountingService source ingestion', () => {
  let prisma: any;
  let service: AccountingService;

  beforeEach(() => {
    prisma = {
      payment: { findUnique: vi.fn(), update: vi.fn() },
      accountingOutbox: { findUnique: vi.fn() },
      accountingWarehouseEntry: { findUnique: vi.fn() },
      accountingEvent: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      accountingEntry: { create: vi.fn(), findMany: vi.fn() },
      performanceLine: { create: vi.fn(), findMany: vi.fn() },
      debt: { create: vi.fn(), findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
      patientAdvanceAllocation: { create: vi.fn(), findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn() },
      debtPaymentAllocation: { create: vi.fn() },
      supplierInvoice: { findUnique: vi.fn(), create: vi.fn() },
      stockDocument: { findMany: vi.fn() },
      refundRequest: { create: vi.fn(), findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]), update: vi.fn() },
      accountingPeriodLock: { findUnique: vi.fn(), create: vi.fn() },
      cashReconciliation: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      accountingAuditLog: { create: vi.fn() },
      $transaction: vi.fn((callback: (tx: any) => unknown) => callback(prisma)),
    };
    service = new AccountingService(prisma);
  });

  it('records a successful reception payment immediately as patient advance cash-in', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 7,
      intakeId: 3,
      intakeCode: 'TNK20261019/0001',
      orderId: 'CASH-1',
      method: 'CASH',
      status: 'PAID',
      amount: 600_000,
      paidAt: new Date('2026-10-19T08:00:00Z'),
      createdById: 2,
      intake: { patientId: 11, roomId: 5 },
    });
    prisma.accountingEvent.findUnique.mockResolvedValue(null);
    prisma.accountingEvent.create.mockResolvedValue({ id: 20 });
    prisma.accountingEntry.create.mockResolvedValue({ id: 30, totalAmount: 600_000 });

    const result = await service.ingestReceptionPayment(7, 'payment-7-paid');

    expect(result).toMatchObject({ duplicate: false, eventId: 20, entryId: 30 });
    expect(prisma.accountingEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      ledgerView: 'CASH', direction: 'IN', category: 'PATIENT_ADVANCE', affectsCash: true,
      patientId: 11, roomId: 5, totalAmount: 600_000, sourceCode: 'TNK20261019/0001',
    }) });
  });

  it('returns the existing result when the same event is received twice', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 7, intakeCode: 'TNK20261019/0001', status: 'PAID', amount: 600_000,
      paidAt: new Date('2026-10-19T08:00:00Z'), intake: { patientId: 11, roomId: 5 },
    });
    prisma.accountingEvent.findUnique.mockResolvedValue({ id: 20, entries: [{ id: 30 }] });

    const result = await service.ingestReceptionPayment(7, 'payment-7-paid');

    expect(result).toEqual({ duplicate: true, eventId: 20, entryId: 30 });
    expect(prisma.accountingEvent.create).not.toHaveBeenCalled();
  });

  it('creates performance lines and a patient receivable for a completed examination', async () => {
    prisma.accountingOutbox.findUnique.mockResolvedValue({
      id: 9,
      examinationId: 44,
      isCancelled: false,
      payload: JSON.stringify({
        examinationCode: 'CA20261019/0001', patientId: 11, intakeId: 3, roomId: 5, doctorId: 8,
        completedAt: '2026-10-19T10:00:00Z',
        serviceLines: [
          { intakeServiceId: 101, serviceId: 201, serviceType: 'TREATMENT', revenue: 1_000_000, taxRate: 8, taxClassification: 'CHIU_THUE', supplyCost: 250_000 },
        ],
      }),
    });
    prisma.accountingEvent.findUnique.mockResolvedValue(null);
    prisma.accountingEvent.create.mockResolvedValue({ id: 21 });
    prisma.accountingEntry.findMany.mockResolvedValue([{ id: 30, totalAmount: 600_000, createdAt: new Date('2026-10-19T08:00:00Z'), advanceAllocations: [] }]);
    prisma.performanceLine.create.mockResolvedValue({ id: 40 });
    prisma.patientAdvanceAllocation.create.mockResolvedValue({ id: 50 });
    prisma.debt.create.mockResolvedValue({ id: 60, principalAmount: 480_000 });

    const result = await service.ingestDoctorEvent(9, 'exam-44-completed');

    expect(result).toMatchObject({ duplicate: false, eventId: 21, receivable: 480_000 });
    expect(prisma.performanceLine.create).toHaveBeenCalledWith({ data: expect.objectContaining({
      recognizedRevenue: 1_000_000, taxAmount: 80_000, supplyCost: 250_000,
    }) });
    expect(prisma.patientAdvanceAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ amount: 600_000, cashEntryId: 30 }) });
    expect(prisma.debt.create).toHaveBeenCalledWith({ data: expect.objectContaining({ debtType: 'PATIENT_RECEIVABLE', principalAmount: 480_000 }) });
  });

  it('applies only the unallocated balance of prior patient advances', async () => {
    prisma.accountingOutbox.findUnique.mockResolvedValue({ id: 19, examinationId: 54, isCancelled: false, payload: JSON.stringify({
      examinationCode: 'CA20261019/0019', patientId: 11, intakeId: 13, roomId: 5, doctorId: 8, completedAt: '2026-10-19T10:00:00Z',
      serviceLines: [{ intakeServiceId: 111, serviceId: 211, serviceType: 'TREATMENT', revenue: 500_000, supplyCost: 50_000 }],
    }) });
    prisma.accountingPeriodLock.findUnique.mockResolvedValue(null);
    prisma.accountingEvent.findUnique.mockResolvedValue(null);
    prisma.accountingEvent.create.mockResolvedValue({ id: 29 });
    prisma.accountingEntry.findMany.mockResolvedValue([{ id: 30, totalAmount: 600_000, advanceAllocations: [{ amount: 450_000, reversedAt: null }] }]);

    const result = await service.ingestDoctorEvent(19, 'exam-54-completed');

    expect(result).toMatchObject({ appliedAdvance: 150_000, receivable: 350_000 });
    expect(prisma.patientAdvanceAllocation.create).toHaveBeenCalledWith({ data: expect.objectContaining({ cashEntryId: 30, amount: 150_000 }) });
  });

  it('rejects source ingestion into a locked accounting period', async () => {
    prisma.payment.findUnique.mockResolvedValue({ id: 7, intakeCode: 'TNK-1', status: 'PAID', amount: 10_000, paidAt: new Date('2026-10-19'), intake: { patientId: 1, roomId: 1 } });
    prisma.accountingPeriodLock.findUnique.mockResolvedValue({ id: 1 });
    await expect(service.ingestReceptionPayment(7, 'payment-7')).rejects.toThrow('Kỳ kế toán đã khóa');
    expect(prisma.accountingEvent.create).not.toHaveBeenCalled();
  });

  it('keeps cancelled-examination supply cost but creates no revenue or receivable', async () => {
    prisma.accountingOutbox.findUnique.mockResolvedValue({
      id: 10,
      examinationId: 45,
      isCancelled: true,
      payload: JSON.stringify({
        examinationCode: 'CA20261019/0002', patientId: 12, intakeId: 4, roomId: 5, doctorId: 8,
        completedAt: '2026-10-19T11:00:00Z',
        serviceLines: [{ intakeServiceId: 102, serviceId: 202, serviceType: 'TREATMENT', revenue: 900_000, taxRate: 0, supplyCost: 100_000 }],
      }),
    });
    prisma.accountingEvent.findUnique.mockResolvedValue(null);
    prisma.accountingEvent.create.mockResolvedValue({ id: 22 });
    prisma.accountingEntry.findMany.mockResolvedValue([{ id: 31, totalAmount: 500_000, createdAt: new Date() }]);
    prisma.performanceLine.create.mockResolvedValue({ id: 41 });

    const result = await service.ingestDoctorEvent(10, 'exam-45-cancelled');

    expect(result).toMatchObject({ receivable: 0, surplusAdvance: 500_000 });
    expect(prisma.performanceLine.create).toHaveBeenCalledWith({ data: expect.objectContaining({ recognizedRevenue: 0, supplyCost: 100_000 }) });
    expect(prisma.debt.create).not.toHaveBeenCalled();
    expect(prisma.patientAdvanceAllocation.create).not.toHaveBeenCalled();
  });

  it.each([
    ['PURCHASE_PAYABLE', 'SUPPLIER_PAYABLE'],
    ['INVENTORY_LOSS', 'LOSS'],
    ['INVENTORY_USAGE', 'PERFORMANCE'],
  ] as const)('maps warehouse event %s without creating cash movement', async (eventType, expectedKind) => {
    prisma.accountingWarehouseEntry.findUnique.mockResolvedValue({
      id: 12, eventType, goodsAmount: 700_000, vatAmount: 56_000, totalAmount: 756_000,
      payloadJson: JSON.stringify({ code: 'MVT20261019/0001', supplierId: 4, roomId: 5 }),
      document: { postedAt: new Date('2026-10-19T09:00:00Z') },
    });
    prisma.accountingEvent.findUnique.mockResolvedValue(null);
    prisma.accountingEvent.create.mockResolvedValue({ id: 23 });
    prisma.accountingEntry.create.mockResolvedValue({ id: 33 });
    prisma.debt.create.mockResolvedValue({ id: 63 });

    const result = await service.ingestWarehouseEvent(12, `warehouse-12-${eventType}`);

    expect(result.kind).toBe(expectedKind);
    if (eventType === 'PURCHASE_PAYABLE') {
      expect(prisma.debt.create).toHaveBeenCalledWith({ data: expect.objectContaining({ principalAmount: 756_000 }) });
    } else {
      expect(prisma.accountingEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ affectsCash: false }) });
    }
  });

  it('returns three separate overview blocks with explicit filter applicability', async () => {
    prisma.accountingEntry.findMany.mockResolvedValue([
      { direction: 'IN', totalAmount: 1_200_000, affectsCash: true, sourceCode: 'TNK-1', status: 'POSTED', category: 'PATIENT_ADVANCE', paymentMethod: 'CASH', taxAmount: 0 },
      { direction: 'OUT', totalAmount: 200_000, affectsCash: true, sourceCode: 'MVT-1', status: 'POSTED', category: 'MATERIAL_PAYMENT', paymentMethod: 'TRANSFER', taxAmount: 16_000 },
      { direction: 'NONE', totalAmount: 50_000, affectsCash: false, sourceCode: 'XVT-1', status: 'POSTED', category: 'INVENTORY_LOSS', paymentMethod: null, taxAmount: 0 },
    ]);
    prisma.performanceLine.findMany.mockResolvedValue([
      { recognizedRevenue: 1_000_000, supplyCost: 250_000, taxAmount: 80_000 },
    ]);
    prisma.debt.findMany.mockResolvedValue([
      { debtType: 'PATIENT_RECEIVABLE', principalAmount: 480_000, dueDate: new Date('2026-10-01'), payments: [] },
      { debtType: 'SUPPLIER_PAYABLE', principalAmount: 756_000, dueDate: new Date('2026-09-01'), payments: [{ amount: 200_000, reversedAt: null }] },
    ]);

    const overview = await service.getOverview({ asOf: new Date('2026-10-19T00:00:00Z'), supplyType: 'THUONG' });

    expect(overview.cash.summary).toEqual({ moneyIn: 1_200_000, moneyOut: 200_000, netCash: 1_000_000, documentCount: 2 });
    expect(overview.performance).toMatchObject({ revenue: 1_000_000, supplyCost: 250_000, grossProfit: 750_000 });
    expect(overview.debt).toMatchObject({ receivable: 480_000, payable: 556_000 });
    expect(overview.filterApplicability.cash.supplyType).toBe(false);
    expect(overview.filterApplicability.performance.supplyType).toBe(true);
  });

  it('settles a supplier payable partially and keeps the original principal unchanged', async () => {
    prisma.accountingPeriodLock.findUnique.mockResolvedValue(null);
    prisma.debt.findUnique.mockResolvedValue({
      id: 70, debtType: 'SUPPLIER_PAYABLE', supplierId: 4, sourceCode: 'MVT20261019/0001',
      principalAmount: 756_000, payments: [{ amount: 200_000, reversedAt: null }],
    });
    prisma.accountingEntry.create.mockResolvedValue({ id: 80 });
    prisma.debtPaymentAllocation.create.mockResolvedValue({ id: 90 });

    const result = await service.createDebtPayment(70, {
      amount: 300_000, method: 'TRANSFER', transactionCode: 'BANK-001', effectiveDate: new Date(Date.now() - 86_400_000),
    }, { id: 5, role: 'ACCOUNTING_STAFF' });

    expect(result).toMatchObject({ paidAmount: 500_000, remainingAmount: 256_000, status: 'PARTIAL' });
    expect(prisma.debt.update).toHaveBeenCalledWith({ where: { id: 70 }, data: { status: 'PARTIAL' } });
    expect(prisma.accountingEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ direction: 'OUT', totalAmount: 300_000, affectsCash: true }) });
  });

  it('requires a difference note when invoice and linked receipts differ', async () => {
    prisma.supplierInvoice.findUnique.mockResolvedValue(null);
    prisma.stockDocument.findMany.mockResolvedValue([{ id: 1, type: 'IN', status: 'POSTED', totalAmount: 700_000 }]);

    await expect(service.createSupplierInvoice({
      invoiceNumber: '000123', series: 'AA/26E', invoiceDate: new Date('2026-10-18'), supplierTaxCode: '0312345678',
      goodsAmount: 700_000, taxAmount: 56_000, totalAmount: 756_000, documentStatus: 'VALID', stockDocumentIds: [1],
    }, { id: 5, role: 'ACCOUNTING_STAFF' })).rejects.toThrow('Bắt buộc nhập lý do lệch tiền');
  });

  it('creates a pending refund and rejects approval by its creator', async () => {
    prisma.accountingEntry.findUnique = vi.fn().mockResolvedValue({ id: 30, patientId: 11, totalAmount: 600_000, status: 'POSTED', direction: 'IN', category: 'PATIENT_ADVANCE' });
    prisma.refundRequest.create.mockResolvedValue({ id: 100, status: 'PENDING_APPROVAL', createdById: 5 });
    const pending = await service.createRefundRequest({ originalEntryId: 30, amount: 100_000, reason: 'Bệnh nhân không tiếp tục điều trị' }, { id: 5, role: 'ACCOUNTING_STAFF' });
    expect(pending.status).toBe('PENDING_APPROVAL');

    prisma.refundRequest.findUnique.mockResolvedValue({ id: 100, status: 'PENDING_APPROVAL', createdById: 5, patientId: 11, amount: 100_000, originalEntryId: 30, reason: 'Bệnh nhân không tiếp tục điều trị' });
    await expect(service.approveRefund(100, { id: 5, role: 'ADMIN' })).rejects.toThrow('Người duyệt phải khác người tạo');
  });

  it('approves a refund as a different admin and only then creates cash-out', async () => {
    prisma.accountingPeriodLock.findUnique.mockResolvedValue(null);
    prisma.refundRequest.findUnique.mockResolvedValue({ id: 100, status: 'PENDING_APPROVAL', createdById: 5, patientId: 11, amount: 100_000, originalEntryId: 30, reason: 'Bệnh nhân không tiếp tục điều trị' });
    prisma.accountingEntry.findUnique = vi.fn().mockResolvedValue({ id: 30, sourceCode: 'TNK-1', roomId: 5, paymentMethod: 'CASH' });
    prisma.accountingEntry.create.mockResolvedValue({ id: 81 });
    prisma.refundRequest.update.mockResolvedValue({ id: 100, status: 'APPROVED', refundEntryId: 81 });

    const result = await service.approveRefund(100, { id: 1, role: 'ADMIN' });

    expect(result).toMatchObject({ status: 'APPROVED', refundEntryId: 81 });
    expect(prisma.accountingEntry.create).toHaveBeenCalledWith({ data: expect.objectContaining({ direction: 'OUT', category: 'REFUND', reversalOfId: 30 }) });
  });

  it('requires a different confirmer for cash reconciliation', async () => {
    prisma.cashReconciliation.findUnique.mockResolvedValue({ id: 110, recordedById: 5, confirmedById: null });
    await expect(service.confirmReconciliation(110, { id: 5, role: 'ACCOUNTING_STAFF' })).rejects.toThrow('Người xác nhận phải khác người nhập');
  });
});
