import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { AccountingService } from '../../accounting/accounting.service.js';

export interface EnqueueJournalEntryInput {
  examinationId: number;
  examinationCode: string;
  patientId: number;
  intakeId: number;
  intakeCode: string;
  doctorId: number;
  roomId: number;
  completedAt: Date;
  serviceRevenue: number;
  supplyCost: number;
  isCancelled: boolean;
  serviceLines: Array<{
    intakeServiceId: number;
    serviceId: number;
    serviceType: string;
    revenue: number;
    taxRate?: number;
    taxClassification?: string;
    supplyCost: number;
  }>;
}

/**
 * AccountingServiceStub
 * 
 * NOTE: /accounting module is not yet implemented.
 * This stub acts as the boundary interface between /doctor and /accounting.
 * 
 * Business rules:
 * - Journal entry is ONLY enqueued upon "Ghi sổ" (when treatment finishes).
 * - Normal completion:
 *   - Service Revenue: Total services established at /reception (patient invoice).
 *   - Supply Cost: Internal cost of medical supplies consumed (COGS).
 * - Refusal / Cancellation (Ngừng khám):
 *   - Service Revenue: 0.
 *   - Supply Cost: Cost of any supplies consumed prior to cancellation.
 */
@Injectable()
export class AccountingServiceStub {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting?: AccountingService,
  ) {}

  /**
   * Đẩy bút toán sang hàng đợi Outbox của phân hệ Kế toán.
   * TODO: Khi phân hệ /accounting sẵn sàng, Outbox Pattern worker sẽ quét và gửi sang Kế toán.
   */
  async enqueueJournalEntry(input: EnqueueJournalEntryInput): Promise<{ outboxId: number; status: string }> {
    const payload = JSON.stringify({
      examinationCode: input.examinationCode,
      examinationId: input.examinationId,
      patientId: input.patientId,
      intakeId: input.intakeId,
      intakeCode: input.intakeCode,
      doctorId: input.doctorId,
      roomId: input.roomId,
      completedAt: input.completedAt.toISOString(),
      serviceLines: input.serviceLines,
      serviceRevenue: input.isCancelled ? 0 : input.serviceRevenue,
      supplyCost: input.supplyCost,
      isCancelled: input.isCancelled,
      enqueuedAt: new Date().toISOString(),
    });

    const outbox = await this.prisma.accountingOutbox.upsert({
      where: { examinationId: input.examinationId },
      update: {
        serviceRevenue: input.isCancelled ? 0 : input.serviceRevenue,
        supplyCost: input.supplyCost,
        isCancelled: input.isCancelled,
        status: 'PENDING',
        payload,
      },
      create: {
        examinationId: input.examinationId,
        serviceRevenue: input.isCancelled ? 0 : input.serviceRevenue,
        supplyCost: input.supplyCost,
        isCancelled: input.isCancelled,
        status: 'PENDING',
        payload,
      },
    });

    await this.accounting?.ingestDoctorEvent(outbox.id, `doctor-outbox-${outbox.id}-${outbox.updatedAt.getTime()}`);
    return { outboxId: outbox.id, status: outbox.status };
  }

  async enqueueReversal(input: {
    examinationId: number;
    examinationCode: string;
    reason: string;
    actorId: number;
  }): Promise<{ eventId: number; status: string }> {
    if (this.accounting) return this.accounting.reverseExamination(input);
    const event = await this.prisma.accountingEvent.create({ data: {
      sourceType: 'DOCTOR_EXAMINATION', sourceCode: input.examinationCode, eventType: 'EXAMINATION_REVERSED',
      idempotencyKey: `unlock-${input.examinationId}`, payloadJson: JSON.stringify(input), status: 'PENDING',
    } });
    return { eventId: event.id, status: event.status };
  }
}
