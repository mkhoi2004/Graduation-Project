import { randomUUID } from 'node:crypto';
import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { buildVnpayPaymentUrl, formatVnpayDate, verifyVnpaySignature } from './vnpay-signature.js';
import type { GatewayCheckout } from './payments.service.js';

@Injectable()
export class VnpayGateway {
  constructor(private readonly config: ConfigService) {}

  async createPayment(input: {
    intakeCode: string;
    amount: number;
    bankCode?: string;
    ipAddr?: string;
  }): Promise<GatewayCheckout> {
    const tmnCode = this.required('VNPAY_TMN_CODE');
    const secretKey = this.required('VNPAY_HASH_SECRET');
    const vnpUrl = this.required('VNPAY_URL');
    const returnUrl = this.required('VNPAY_RETURN_URL');

    const orderId = `DENTAL-VNPAY-${Date.now()}-${randomUUID().slice(0, 8)}`;
    const requestId = orderId;
    const createDate = formatVnpayDate();

    const params: Record<string, unknown> = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: tmnCode,
      vnp_Locale: 'vn',
      vnp_CurrCode: 'VND',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Thanh toan phieu ${input.intakeCode}`,
      vnp_OrderType: 'other',
      vnp_Amount: input.amount * 100,
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: input.ipAddr || '127.0.0.1',
      vnp_CreateDate: createDate,
    };

    if (input.bankCode) {
      params['vnp_BankCode'] = input.bankCode;
    }

    const payUrl = buildVnpayPaymentUrl(vnpUrl, params, secretKey);
    return { orderId, requestId, partnerCode: tmnCode, payUrl };
  }

  verifyResult(payload: Record<string, unknown>): boolean {
    const secretKey = this.required('VNPAY_HASH_SECRET');
    return verifyVnpaySignature(payload, secretKey);
  }

  private required(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) throw new ServiceUnavailableException(`Thiếu cấu hình ${key}.`);
    return value;
  }
}
