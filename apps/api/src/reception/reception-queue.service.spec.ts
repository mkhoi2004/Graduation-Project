import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReceptionQueueService } from './reception-queue.service.js';

describe('ReceptionQueueService', () => {
  let prisma: any;
  let tx: any;
  let service: ReceptionQueueService;

  beforeEach(() => {
    tx = {
      queueTicket: {
        findUnique: vi.fn(),
        create: vi.fn(),
      },
      roomQueueCounter: {
        create: vi.fn(),
        update: vi.fn(),
      },
      intakeAuditLog: { create: vi.fn() },
      $queryRaw: vi.fn(),
    };
    prisma = {
      $transaction: vi.fn(async (callback: (client: any) => Promise<unknown>) => callback(tx)),
    };
    service = new ReceptionQueueService(prisma);
  });

  it('issues 0001 for the first intake in a room and business date', async () => {
    tx.queueTicket.findUnique.mockResolvedValue(null);
    tx.$queryRaw.mockResolvedValue([]);
    tx.roomQueueCounter.create.mockResolvedValue({ id: 7, lastIssuedNumber: 0 });
    tx.roomQueueCounter.update.mockResolvedValue({ id: 7, lastIssuedNumber: 1 });
    tx.queueTicket.create.mockResolvedValue({
      id: 11,
      intakeId: 101,
      roomId: 1,
      businessDate: new Date('2026-10-21T00:00:00.000Z'),
      queueNumber: 1,
      status: 'WAITING',
      issuedAt: new Date('2026-10-21T01:00:00.000Z'),
    });

    const result = await service.issueTicket(
      { intakeId: 101, roomId: 1, businessDate: '2026-10-21' },
      9,
    );

    expect(result).toMatchObject({ queueNumber: 1, displayNumber: '0001', status: 'WAITING' });
    expect(tx.intakeAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ intakeId: 101, action: 'QUEUE_ISSUED', actorId: 9 }),
    });
  });

  it('increments an existing room counter without changing another room', async () => {
    tx.queueTicket.findUnique.mockResolvedValue(null);
    tx.$queryRaw.mockResolvedValue([{ id: 7, lastIssuedNumber: 4 }]);
    tx.roomQueueCounter.update.mockResolvedValue({ id: 7, lastIssuedNumber: 5 });
    tx.queueTicket.create.mockResolvedValue({
      id: 12,
      intakeId: 102,
      roomId: 1,
      businessDate: new Date('2026-10-21T00:00:00.000Z'),
      queueNumber: 5,
      status: 'WAITING',
      issuedAt: new Date('2026-10-21T01:05:00.000Z'),
    });

    await expect(
      service.issueTicket({ intakeId: 102, roomId: 1, businessDate: '2026-10-21' }),
    ).resolves.toMatchObject({ queueNumber: 5, displayNumber: '0005' });
    expect(tx.roomQueueCounter.create).not.toHaveBeenCalled();
    expect(tx.roomQueueCounter.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { lastIssuedNumber: { increment: 1 } },
    });
  });

  it('is idempotent for an intake that already owns a ticket', async () => {
    tx.queueTicket.findUnique.mockResolvedValue({
      id: 11,
      intakeId: 101,
      roomId: 1,
      businessDate: new Date('2026-10-21T00:00:00.000Z'),
      queueNumber: 1,
      status: 'WAITING',
      issuedAt: new Date('2026-10-21T01:00:00.000Z'),
    });

    const result = await service.issueTicket({ intakeId: 101, roomId: 1, businessDate: '2026-10-21' });

    expect(result.displayNumber).toBe('0001');
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.queueTicket.create).not.toHaveBeenCalled();
  });

  it('rejects issuance after 9999 without wrapping the counter', async () => {
    tx.queueTicket.findUnique.mockResolvedValue(null);
    tx.$queryRaw.mockResolvedValue([{ id: 7, lastIssuedNumber: 9999 }]);

    await expect(
      service.issueTicket({ intakeId: 103, roomId: 1, businessDate: '2026-10-21' }),
    ).rejects.toThrow(BadRequestException);
    expect(tx.roomQueueCounter.update).not.toHaveBeenCalled();
    expect(tx.queueTicket.create).not.toHaveBeenCalled();
  });
});
