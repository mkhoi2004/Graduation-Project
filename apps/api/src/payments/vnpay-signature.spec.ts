import { describe, expect, it } from 'vitest';
import {
  buildVnpayPaymentUrl,
  createVnpaySignature,
  formatVnpayDate,
  sortObject,
  verifyVnpaySignature,
} from './vnpay-signature.js';

describe('VNPAY signatures & utilities', () => {
  const secretKey = 'PBSBVSYCBHAAYKYDQQQBIBPJHXPHCYDJ';

  it('formats dates into YYYYMMDDHHmmss string for GMT+7', () => {
    const formatted = formatVnpayDate(new Date('2026-10-23T15:00:00.000Z'));
    expect(formatted).toMatch(/^\d{14}$/);
    // 15:00:00 UTC = 22:00:00 GMT+7
    expect(formatted).toBe('20261023220000');
  });

  it('sorts parameters alphabetically and replaces spaces with +', () => {
    const input = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_OrderInfo: 'Thanh toan phieu TNK1',
      emptyParam: '',
    };
    const sorted = sortObject(input);
    expect(Object.keys(sorted)).toEqual(['vnp_Command', 'vnp_OrderInfo', 'vnp_Version']);
    expect(sorted['vnp_OrderInfo']).toBe('Thanh+toan+phieu+TNK1');
    expect(sorted['emptyParam']).toBeUndefined();
  });

  it('builds a signed payment URL and successfully verifies the returned parameters', () => {
    const params = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: 'P1ZX9P2M',
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: 'DENTAL-VNPAY-12345',
      vnp_OrderInfo: 'Thanh toan phieu TNK20261710/0001',
      vnp_OrderType: 'other',
      vnp_Amount: 90000000,
      vnp_ReturnUrl: 'http://localhost:3000/api/payments/vnpay/return',
      vnp_IpAddr: '127.0.0.1',
      vnp_CreateDate: '20261023220000',
    };

    const url = buildVnpayPaymentUrl('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html', params, secretKey);
    expect(url).toContain('https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?');
    expect(url).toContain('vnp_SecureHash=');

    const parsedUrl = new URL(url);
    const returnedParams = Object.fromEntries(parsedUrl.searchParams.entries());

    expect(verifyVnpaySignature(returnedParams, secretKey)).toBe(true);
  });

  it('rejects verification if any parameter is tampered with', () => {
    const params = {
      vnp_Amount: '90000000',
      vnp_TxnRef: 'DENTAL-VNPAY-12345',
      vnp_ResponseCode: '00',
    };
    const signature = createVnpaySignature(params, secretKey);

    // Valid signature
    expect(verifyVnpaySignature({ ...params, vnp_SecureHash: signature }, secretKey)).toBe(true);

    // Tampered amount
    expect(
      verifyVnpaySignature(
        { ...params, vnp_Amount: '10000000', vnp_SecureHash: signature },
        secretKey,
      ),
    ).toBe(false);

    // Wrong secret key
    expect(
      verifyVnpaySignature({ ...params, vnp_SecureHash: signature }, 'WRONG_SECRET'),
    ).toBe(false);

    // Missing signature
    expect(verifyVnpaySignature(params, secretKey)).toBe(false);
  });
});
