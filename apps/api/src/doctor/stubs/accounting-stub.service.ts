import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';

export interface EnqueueJournalEntryInput {
  examinationId: number;
  examinationCode: string;
  serviceRevenue: number;
  supplyCost: number;
  isCancelled: boolean;
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
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Đẩy bút toán sang hàng đợi Outbox của phân hệ Kế toán.
   * TODO: Khi phân hệ /accounting sẵn sàng, Outbox Pattern worker sẽ quét và gửi sang Kế toán.
   */
  async enqueueJournalEntry(input: EnqueueJournalEntryInput): Promise<{ outboxId: number; status: string }> {
    const payload = JSON.stringify({
      examinationCode: input.examinationCode,
      examinationId: input.examinationId,
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

    return { outboxId: outbox.id, status: outbox.status };
  }
}
