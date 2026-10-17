import { createHmac, timingSafeEqual } from 'node:crypto';

export interface MomoCreateSignatureParams {
  accessKey: string;
  amount: number;
  extraData: string;
  ipnUrl: string;
  orderId: string;
  orderInfo: string;
  partnerCode: string;
  redirectUrl: string;
  requestId: string;
  requestType: string;
}

export interface MomoResultParams {
  accessKey: string;
  amount: number;
  extraData: string;
  message: string;
  orderId: string;
  orderInfo: string;
  orderType: string;
  partnerCode: string;
  payType: string;
  requestId: string;
  responseTime: number;
  resultCode: number;
  transId: number;
  signature: string;
}

function hmac(value: string, secretKey: string): string {
  return createHmac('sha256', secretKey).update(value).digest('hex');
}

export function createMomoRequestSignature(params: MomoCreateSignatureParams, secretKey: string): string {
  const raw = `accessKey=${params.accessKey}&amount=${params.amount}&extraData=${params.extraData}&ipnUrl=${params.ipnUrl}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&partnerCode=${params.partnerCode}&redirectUrl=${params.redirectUrl}&requestId=${params.requestId}&requestType=${params.requestType}`;
  return hmac(raw, secretKey);
}

export function verifyMomoResultSignature(params: MomoResultParams, secretKey: string): boolean {
  const raw = `accessKey=${params.accessKey}&amount=${params.amount}&extraData=${params.extraData}&message=${params.message}&orderId=${params.orderId}&orderInfo=${params.orderInfo}&orderType=${params.orderType}&partnerCode=${params.partnerCode}&payType=${params.payType}&requestId=${params.requestId}&responseTime=${params.responseTime}&resultCode=${params.resultCode}&transId=${params.transId}`;
  const expected = Buffer.from(hmac(raw, secretKey), 'utf8');
  const received = Buffer.from(params.signature ?? '', 'utf8');
  return expected.length === received.length && timingSafeEqual(expected, received);
}
