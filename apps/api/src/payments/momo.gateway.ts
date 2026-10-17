import { randomUUID } from 'node:crypto';
import { BadGatewayException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createMomoRequestSignature, verifyMomoResultSignature, type MomoResultParams } from './momo-signature.js';
import { PaymentGateway, type GatewayCheckout } from './payments.service.js';

@Injectable()
export class MomoGateway extends PaymentGateway {
  constructor(private readonly config: ConfigService) { super(); }

  async createPayment(input: { intakeCode: string; amount: number }): Promise<GatewayCheckout> {
    const partnerCode = this.required('MOMO_PARTNER_CODE');
    const accessKey = this.required('MOMO_ACCESS_KEY');
    const secretKey = this.required('MOMO_SECRET_KEY');
    const redirectUrl = this.required('MOMO_REDIRECT_URL');
    const ipnUrl = this.required('MOMO_IPN_URL');
    const orderId = `DENTAL-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const requestId = `${partnerCode}-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const params = { accessKey, amount: input.amount, extraData: '', ipnUrl, orderId, orderInfo: `Thanh toan phieu ${input.intakeCode}`, partnerCode, redirectUrl, requestId, requestType: 'payWithMethod' };
    const response = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, signature: createMomoRequestSignature(params, secretKey), lang: 'vi' }),
    });
    const payload = await response.json() as { payUrl?: string; message?: string };
    if (!response.ok || !payload.payUrl) throw new BadGatewayException(payload.message ?? 'Không thể tạo giao dịch MoMo.');
    return { orderId, requestId, partnerCode, payUrl: payload.payUrl };
  }

  verifyResult(payload: Record<string, unknown>): boolean {
    return verifyMomoResultSignature({ ...payload, accessKey: this.required('MOMO_ACCESS_KEY') } as unknown as MomoResultParams, this.required('MOMO_SECRET_KEY'));
  }

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new ServiceUnavailableException(`Thiếu cấu hình ${key}.`);
    return value;
  }
}
