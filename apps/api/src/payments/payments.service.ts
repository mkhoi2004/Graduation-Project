import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED';

export interface StoredPayment {
  orderId: string;
  requestId: string;
  partnerCode: string;
  intakeCode: string;
  amount: number;
  status: PaymentStatus;
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
  ) {}

  async createMomoPayment(input: { intakeCode: string; amount: number }): Promise<MomoCheckout> {
    if (!input.intakeCode.trim() || !Number.isInteger(input.amount) || input.amount < 1_000) {
      throw new BadRequestException('Thông tin thanh toán không hợp lệ.');
    }
    const checkout = await this.gateway.createPayment(input);
    if (!checkout.payUrl) throw new BadRequestException('MoMo không trả về đường dẫn thanh toán.');
    await this.repository.createPending({ orderId: checkout.orderId, requestId: checkout.requestId, partnerCode: checkout.partnerCode, intakeCode: input.intakeCode, amount: input.amount });
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

  async getStatus(orderId: string): Promise<StoredPayment> {
    const payment = await this.repository.findByOrderId(orderId);
    if (!payment) throw new NotFoundException('Không tìm thấy giao dịch thanh toán.');
    return payment;
  }
}
