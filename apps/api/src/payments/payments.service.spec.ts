import { describe, expect, it, vi } from 'vitest';
import { PaymentsService, type PaymentGateway, type PaymentRepository } from './payments.service.js';

function createService() {
  const createPending = vi.fn(async (payment) => ({ ...payment, status: 'PENDING' as const }));
  const updateResult = vi.fn(async (_orderId, status) => ({ orderId: 'DENTAL-1', status }));
  const findByOrderId = vi.fn(async () => ({ orderId: 'DENTAL-1', requestId: 'REQ-1', partnerCode: 'PARTNER', intakeCode: 'TNK1', amount: 900000, status: 'PENDING' as const }));
  const repository: PaymentRepository = {
    createPending, updateResult, findByOrderId,
  };
  const createPayment = vi.fn(async () => ({ orderId: 'DENTAL-1', requestId: 'REQ-1', partnerCode: 'PARTNER', payUrl: 'https://test-payment.momo.vn/pay' }));
  const verifyResult = vi.fn(() => true);
  const gateway: PaymentGateway = {
    createPayment, verifyResult,
  };
  return { service: new PaymentsService(repository, gateway), repository, gateway, updateResult, verifyResult, findByOrderId };
}

describe('PaymentsService', () => {
  it('creates a pending MoMo payment and returns its pay URL', async () => {
    const { service } = createService();
    const result = await service.createMomoPayment({ intakeCode: 'TNK1', amount: 900000 });
    expect(result.payUrl).toBe('https://test-payment.momo.vn/pay');
    expect(result.orderId).toBe('DENTAL-1');
  });

  it('marks a valid successful MoMo result as paid', async () => {
    const { service, updateResult } = createService();
    await service.handleMomoResult({ orderId: 'DENTAL-1', requestId: 'REQ-1', partnerCode: 'PARTNER', amount: 900000, resultCode: 0, signature: 'signed' });
    expect(updateResult).toHaveBeenCalledWith('DENTAL-1', 'PAID', expect.any(Object));
  });

  it('does not update payment state when the MoMo signature is invalid', async () => {
    const { service, updateResult, verifyResult } = createService();
    verifyResult.mockReturnValue(false);
    await expect(service.handleMomoResult({ orderId: 'DENTAL-1', resultCode: 0, signature: 'bad' })).rejects.toThrow(/chữ ký/i);
    expect(updateResult).not.toHaveBeenCalled();
  });

  it('rejects a signed callback whose amount differs from the pending payment', async () => {
    const { service, updateResult } = createService();
    await expect(service.handleMomoResult({ orderId: 'DENTAL-1', requestId: 'REQ-1', partnerCode: 'PARTNER', amount: 10000, resultCode: 0, signature: 'signed' })).rejects.toThrow(/số tiền/i);
    expect(updateResult).not.toHaveBeenCalled();
  });

  it('keeps paid as a terminal state when a duplicate callback arrives', async () => {
    const { service, updateResult, findByOrderId } = createService();
    findByOrderId.mockResolvedValueOnce({ orderId: 'DENTAL-1', requestId: 'REQ-1', partnerCode: 'PARTNER', intakeCode: 'TNK1', amount: 900000, status: 'PAID' });
    const result = await service.handleMomoResult({ orderId: 'DENTAL-1', requestId: 'REQ-1', partnerCode: 'PARTNER', amount: 900000, resultCode: 1006, signature: 'signed' });
    expect(result.status).toBe('PAID');
    expect(updateResult).not.toHaveBeenCalled();
  });
});
