import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { VnpayGateway } from './vnpay.gateway.js';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface StoredPayment {
  orderId: string;
  requestId: string;
  partnerCode: string;
  intakeCode: string;
  amount: number;
  status: PaymentStatus;
  method?: string;
}

export abstract class PaymentRepository {
  abstract createPending(payment: Omit<StoredPayment, 'status'>): Promise<StoredPayment>;
  abstract updateResult(orderId: string, status: PaymentStatus, payload: Record<string, unknown>): Promise<Pick<StoredPayment, 'orderId' | 'status'>>;
  abstract findByOrderId(orderId: string): Promise<StoredPayment | null>;
}

export interface MomoCheckout {
  orderId: string;
  requestId: string;
  payUrl: string;
}

export interface GatewayCheckout extends MomoCheckout { partnerCode: string }

export abstract class PaymentGateway {
  abstract createPayment(input: { intakeCode: string; amount: number }): Promise<GatewayCheckout>;
  abstract verifyResult(payload: Record<string, unknown>): boolean;
}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly repository: PaymentRepository,
    private readonly gateway: PaymentGateway,
    @Optional() private readonly vnpayGateway?: VnpayGateway,
  ) {}

  async createMomoPayment(input: { intakeCode: string; amount: number }): Promise<MomoCheckout> {
    if (!input.intakeCode.trim() || !Number.isInteger(input.amount) || input.amount < 1_000) {
      throw new BadRequestException('Thông tin thanh toán không hợp lệ.');
    }
    const checkout = await this.gateway.createPayment(input);
    if (!checkout.payUrl) throw new BadRequestException('MoMo không trả về đường dẫn thanh toán.');
    await this.repository.createPending({
      orderId: checkout.orderId,
      requestId: checkout.requestId,
      partnerCode: checkout.partnerCode,
      intakeCode: input.intakeCode,
      amount: input.amount,
      method: 'MOMO',
    });
    return { orderId: checkout.orderId, requestId: checkout.requestId, payUrl: checkout.payUrl };
  }

  async handleMomoResult(payload: Record<string, unknown>): Promise<Pick<StoredPayment, 'orderId' | 'status'>> {
    if (!this.gateway.verifyResult(payload)) throw new BadRequestException('Chữ ký phản hồi MoMo không hợp lệ.');
    const orderId = typeof payload.orderId === 'string' ? payload.orderId : '';
    if (!orderId) throw new BadRequestException('Phản hồi MoMo thiếu mã giao dịch.');
    const payment = await this.repository.findByOrderId(orderId);
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch thanh toán.');
    if (Number(payload.amount) !== payment.amount) throw new BadRequestException('Số tiền phản hồi MoMo không khớp giao dịch.');
    const requestId = typeof payload.requestId === 'string' ? payload.requestId : '';
    const partnerCode = typeof payload.partnerCode === 'string' ? payload.partnerCode : '';
    if (requestId !== payment.requestId || partnerCode !== payment.partnerCode) {
      throw new BadRequestException('Thông tin định danh giao dịch MoMo không khớp.');
    }
    if (payment.status === 'PAID') return { orderId: payment.orderId, status: payment.status };
    const status: PaymentStatus = Number(payload.resultCode) === 0 ? 'PAID' : 'FAILED';
    return this.repository.updateResult(orderId, status, payload);
  }

  async createVnpayPayment(input: {
    intakeCode: string;
    amount: number;
    bankCode?: string;
    ipAddr?: string;
  }): Promise<MomoCheckout> {
    if (!input.intakeCode.trim() || !Number.isInteger(input.amount) || input.amount < 1_000) {
      throw new BadRequestException('Thông tin thanh toán không hợp lệ.');
    }
    if (!this.vnpayGateway) {
      throw new BadRequestException('Cổng thanh toán VNPAY chưa được cấu hình.');
    }
    const checkout = await this.vnpayGateway.createPayment(input);
    if (!checkout.payUrl) throw new BadRequestException('VNPAY không trả về đường dẫn thanh toán.');
    await this.repository.createPending({
      orderId: checkout.orderId,
      requestId: checkout.requestId,
      partnerCode: checkout.partnerCode,
      intakeCode: input.intakeCode,
      amount: input.amount,
      method: 'VNPAY',
    });
    return { orderId: checkout.orderId, requestId: checkout.requestId, payUrl: checkout.payUrl };
  }

  async handleVnpayResult(payload: Record<string, unknown>): Promise<Pick<StoredPayment, 'orderId' | 'status'>> {
    if (!this.vnpayGateway) throw new BadRequestException('Cổng thanh toán VNPAY chưa được cấu hình.');
    if (!this.vnpayGateway.verifyResult(payload)) throw new BadRequestException('Chữ ký phản hồi VNPAY không hợp lệ.');

    const orderId = typeof payload.vnp_TxnRef === 'string' ? payload.vnp_TxnRef : '';
    if (!orderId) throw new BadRequestException('Phản hồi VNPAY thiếu mã giao dịch.');

    const payment = await this.repository.findByOrderId(orderId);
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch thanh toán.');

    const vnpAmount = Number(payload.vnp_Amount);
    if (vnpAmount !== payment.amount * 100) {
      throw new BadRequestException('Số tiền phản hồi VNPAY không khớp giao dịch.');
    }

    const tmnCode = typeof payload.vnp_TmnCode === 'string' ? payload.vnp_TmnCode : '';
    if (tmnCode !== payment.partnerCode) {
      throw new BadRequestException('Thông tin định danh giao dịch VNPAY không khớp.');
    }

    if (payment.status === 'PAID') return { orderId: payment.orderId, status: payment.status };

    const responseCode = typeof payload.vnp_ResponseCode === 'string' ? payload.vnp_ResponseCode : '';
    const transactionStatus = typeof payload.vnp_TransactionStatus === 'string' ? payload.vnp_TransactionStatus : responseCode;
    const isSuccess = responseCode === '00' && (transactionStatus === '00' || !transactionStatus);
    const status: PaymentStatus = isSuccess ? 'PAID' : 'FAILED';

    return this.repository.updateResult(orderId, status, payload);
  }

  async handleVnpayIpn(payload: Record<string, unknown>): Promise<{ RspCode: string; Message: string }> {
    if (!this.vnpayGateway) {
      return { RspCode: '99', Message: 'VNPAY gateway not configured' };
    }
    if (!this.vnpayGateway.verifyResult(payload)) {
      return { RspCode: '97', Message: 'Invalid Checksum' };
    }

    const orderId = typeof payload.vnp_TxnRef === 'string' ? payload.vnp_TxnRef : '';
    if (!orderId) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    const payment = await this.repository.findByOrderId(orderId);
    if (!payment) {
      return { RspCode: '01', Message: 'Order not found' };
    }

    const vnpAmount = Number(payload.vnp_Amount);
    if (vnpAmount !== payment.amount * 100) {
      return { RspCode: '04', Message: 'Invalid amount' };
    }

    if (payment.status === 'PAID') {
      return { RspCode: '02', Message: 'Order already confirmed' };
    }

    const responseCode = typeof payload.vnp_ResponseCode === 'string' ? payload.vnp_ResponseCode : '';
    const transactionStatus = typeof payload.vnp_TransactionStatus === 'string' ? payload.vnp_TransactionStatus : responseCode;
    const isSuccess = responseCode === '00' && (transactionStatus === '00' || !transactionStatus);
    const status: PaymentStatus = isSuccess ? 'PAID' : 'FAILED';

    await this.repository.updateResult(orderId, status, payload);
    return { RspCode: '00', Message: 'Confirm Success' };
  }

  async getStatus(orderId: string): Promise<StoredPayment> {
    const payment = await this.repository.findByOrderId(orderId);
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch thanh toán.');
    return payment;
  }
}
