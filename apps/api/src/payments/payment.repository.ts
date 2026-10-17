import { Injectable } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { PaymentRepository, type PaymentStatus, type StoredPayment } from './payments.service.js';

@Injectable()
export class PrismaPaymentRepository extends PaymentRepository {
  constructor(private readonly prisma: PrismaService) { super(); }

  async createPending(payment: Omit<StoredPayment, 'status'>): Promise<StoredPayment> {
    const intake = await this.prisma.intake.findUnique({ where: { code: payment.intakeCode } });
    return this.prisma.payment.create({
      data: {
        ...payment,
        intakeId: intake?.id,
        method: 'MOMO',
        status: 'PENDING',
      },
      select: { orderId: true, requestId: true, partnerCode: true, intakeCode: true, amount: true, status: true },
    }) as Promise<StoredPayment>;
  }

  async updateResult(orderId: string, status: PaymentStatus, payload: Record<string, unknown>) {
    await this.prisma.payment.updateMany({
      where: { orderId, status: { not: 'PAID' } },
      data: { status, gatewayPayload: JSON.stringify(payload), paidAt: status === 'PAID' ? new Date() : null },
    });
    const payment = await this.prisma.payment.findUniqueOrThrow({
      where: { orderId },
      select: { orderId: true, status: true, intakeCode: true },
    });
    if (status === 'PAID') {
      await this.prisma.intake.updateMany({
        where: { code: payment.intakeCode, status: { not: 'TRANSFERRED' } },
        data: { status: 'PAID' },
      });
    }
    return payment as { orderId: string; status: PaymentStatus };
  }

  async findByOrderId(orderId: string): Promise<StoredPayment | null> {
    return this.prisma.payment.findUnique({ where: { orderId }, select: { orderId: true, requestId: true, partnerCode: true, intakeCode: true, amount: true, status: true } }) as Promise<StoredPayment | null>;
  }
}
