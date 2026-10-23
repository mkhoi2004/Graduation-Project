import { describe, expect, it, vi } from 'vitest';
import { PaymentsService, type PaymentGateway, type PaymentRepository } from './payments.service.js';
import type { VnpayGateway } from './vnpay.gateway.js';

function createService() {
  const createPending = vi.fn(async (payment) => ({ ...payment, status: 'PENDING' as const }));
  const updateResult = vi.fn(async (_orderId, status) => ({ orderId: 'DENTAL-1', status }));
  const findByOrderId = vi.fn(async () => ({
    orderId: 'DENTAL-1',
    requestId: 'REQ-1',
    partnerCode: 'PARTNER',
    intakeCode: 'TNK1',
    amount: 900000,
    status: 'PENDING' as const,
  }));
  const repository: PaymentRepository = {
    createPending,
    updateResult,
    findByOrderId,
  };
  const createPayment = vi.fn(async () => ({
    orderId: 'DENTAL-1',
    requestId: 'REQ-1',
    partnerCode: 'PARTNER',
    payUrl: 'https://test-payment.momo.vn/pay',
  }));
  const verifyResult = vi.fn(() => true);
  const gateway: PaymentGateway = {
    createPayment,
    verifyResult,
  };

  const vnpayCreatePayment = vi.fn(async () => ({
    orderId: 'DENTAL-VNPAY-1',
    requestId: 'DENTAL-VNPAY-1',
    partnerCode: 'P1ZX9P2M',
    payUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?foo=bar',
  }));
  const vnpayVerifyResult = vi.fn(() => true);
  const vnpayGateway = {
    createPayment: vnpayCreatePayment,
    verifyResult: vnpayVerifyResult,
  } as unknown as VnpayGateway;

  return {
    service: new PaymentsService(repository, gateway, vnpayGateway),
    repository,
    gateway,
    vnpayGateway,
    createPending,
    updateResult,
    verifyResult,
    findByOrderId,
    vnpayCreatePayment,
    vnpayVerifyResult,
  };
}

describe('PaymentsService', () => {
  describe('MoMo', () => {
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

  describe('VNPAY', () => {
    it('creates a pending VNPAY payment and returns its pay URL', async () => {
      const { service, createPending } = createService();
      const result = await service.createVnpayPayment({ intakeCode: 'TNK1', amount: 900000 });
      expect(result.payUrl).toContain('vpcpay.html');
      expect(result.orderId).toBe('DENTAL-VNPAY-1');
      expect(createPending).toHaveBeenCalledWith({
        orderId: 'DENTAL-VNPAY-1',
        requestId: 'DENTAL-VNPAY-1',
        partnerCode: 'P1ZX9P2M',
        intakeCode: 'TNK1',
        amount: 900000,
        method: 'VNPAY',
      });
    });

    it('marks a valid successful VNPAY result as paid', async () => {
      const { service, updateResult, findByOrderId } = createService();
      findByOrderId.mockResolvedValueOnce({
        orderId: 'DENTAL-VNPAY-1',
        requestId: 'DENTAL-VNPAY-1',
        partnerCode: 'P1ZX9P2M',
        intakeCode: 'TNK1',
        amount: 900000,
        status: 'PENDING',
      });
      await service.handleVnpayResult({
        vnp_TxnRef: 'DENTAL-VNPAY-1',
        vnp_TmnCode: 'P1ZX9P2M',
        vnp_Amount: 90000000, // 900,000 * 100
        vnp_ResponseCode: '00',
        vnp_TransactionStatus: '00',
        vnp_SecureHash: 'valid-hash',
      });
      expect(updateResult).toHaveBeenCalledWith('DENTAL-VNPAY-1', 'PAID', expect.any(Object));
    });

    it('rejects a VNPAY result when signature is invalid', async () => {
      const { service, vnpayVerifyResult } = createService();
      vnpayVerifyResult.mockReturnValue(false);
      await expect(
        service.handleVnpayResult({
          vnp_TxnRef: 'DENTAL-VNPAY-1',
          vnp_SecureHash: 'invalid-hash',
        }),
      ).rejects.toThrow(/chữ ký/i);
    });

    it('rejects a VNPAY result whose amount does not match', async () => {
      const { service, findByOrderId } = createService();
      findByOrderId.mockResolvedValueOnce({
        orderId: 'DENTAL-VNPAY-1',
        requestId: 'DENTAL-VNPAY-1',
        partnerCode: 'P1ZX9P2M',
        intakeCode: 'TNK1',
        amount: 900000,
        status: 'PENDING',
      });
      await expect(
        service.handleVnpayResult({
          vnp_TxnRef: 'DENTAL-VNPAY-1',
          vnp_TmnCode: 'P1ZX9P2M',
          vnp_Amount: 50000000,
          vnp_ResponseCode: '00',
          vnp_SecureHash: 'valid-hash',
        }),
      ).rejects.toThrow(/số tiền/i);
    });

    it('handles IPN successfully returning RspCode 00', async () => {
      const { service, findByOrderId, updateResult } = createService();
      findByOrderId.mockResolvedValueOnce({
        orderId: 'DENTAL-VNPAY-1',
        requestId: 'DENTAL-VNPAY-1',
        partnerCode: 'P1ZX9P2M',
        intakeCode: 'TNK1',
        amount: 900000,
        status: 'PENDING',
      });
      const response = await service.handleVnpayIpn({
        vnp_TxnRef: 'DENTAL-VNPAY-1',
        vnp_Amount: 90000000,
        vnp_ResponseCode: '00',
        vnp_SecureHash: 'valid-hash',
      });
      expect(response).toEqual({ RspCode: '00', Message: 'Confirm Success' });
      expect(updateResult).toHaveBeenCalledWith('DENTAL-VNPAY-1', 'PAID', expect.any(Object));
    });

    it('returns RspCode 97 on IPN invalid checksum', async () => {
      const { service, vnpayVerifyResult } = createService();
      vnpayVerifyResult.mockReturnValue(false);
      const response = await service.handleVnpayIpn({
        vnp_TxnRef: 'DENTAL-VNPAY-1',
        vnp_SecureHash: 'bad-hash',
      });
      expect(response).toEqual({ RspCode: '97', Message: 'Invalid Checksum' });
    });

    it('returns RspCode 02 on IPN when order already confirmed', async () => {
      const { service, findByOrderId } = createService();
      findByOrderId.mockResolvedValueOnce({
        orderId: 'DENTAL-VNPAY-1',
        requestId: 'DENTAL-VNPAY-1',
        partnerCode: 'P1ZX9P2M',
        intakeCode: 'TNK1',
        amount: 900000,
        status: 'PAID',
      });
      const response = await service.handleVnpayIpn({
        vnp_TxnRef: 'DENTAL-VNPAY-1',
        vnp_Amount: 90000000,
        vnp_ResponseCode: '00',
        vnp_SecureHash: 'valid-hash',
      });
      expect(response).toEqual({ RspCode: '02', Message: 'Order already confirmed' });
    });

    it('returns RspCode 04 on IPN invalid amount', async () => {
      const { service, findByOrderId } = createService();
      findByOrderId.mockResolvedValueOnce({
        orderId: 'DENTAL-VNPAY-1',
        requestId: 'DENTAL-VNPAY-1',
        partnerCode: 'P1ZX9P2M',
        intakeCode: 'TNK1',
        amount: 900000,
        status: 'PENDING',
      });
      const response = await service.handleVnpayIpn({
        vnp_TxnRef: 'DENTAL-VNPAY-1',
        vnp_Amount: 10000000,
        vnp_ResponseCode: '00',
        vnp_SecureHash: 'valid-hash',
      });
      expect(response).toEqual({ RspCode: '04', Message: 'Invalid amount' });
    });
  });
});
