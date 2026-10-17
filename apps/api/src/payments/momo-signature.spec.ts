import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { createMomoRequestSignature, verifyMomoResultSignature } from './momo-signature.js';

describe('MoMo signatures', () => {
  it('signs create-payment parameters in MoMo required order', () => {
    const raw = 'accessKey=access&amount=900000&extraData=&ipnUrl=https://api.example/ipn&orderId=DENTAL-1&orderInfo=Thanh toan TNK1&partnerCode=partner&redirectUrl=https://api.example/return&requestId=REQ-1&requestType=payWithMethod';
    const expected = createHmac('sha256', 'secret').update(raw).digest('hex');

    expect(createMomoRequestSignature({
      accessKey: 'access', amount: 900000, extraData: '', ipnUrl: 'https://api.example/ipn',
      orderId: 'DENTAL-1', orderInfo: 'Thanh toan TNK1', partnerCode: 'partner',
      redirectUrl: 'https://api.example/return', requestId: 'REQ-1', requestType: 'payWithMethod',
    }, 'secret')).toBe(expected);
  });

  it('rejects a modified payment result', () => {
    expect(verifyMomoResultSignature({
      accessKey: 'access', amount: 900000, extraData: '', message: 'Successful.', orderId: 'DENTAL-1',
      orderInfo: 'Thanh toan TNK1', orderType: 'momo_wallet', partnerCode: 'partner', payType: 'qr',
      requestId: 'REQ-1', responseTime: 1, resultCode: 0, transId: 123, signature: 'invalid',
    }, 'secret')).toBe(false);
  });
});
