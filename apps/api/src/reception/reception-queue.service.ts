import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { clinicDateToDbDate } from '../common/clinic-time.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';

export interface IssueTicketInput {
  intakeId: number;
  roomId: number;
  businessDate: string;
}

export interface QueueTicketDto {
  id: number;
  intakeId: number;
  roomId: number;
  businessDate: string;
  queueNumber: number;
  displayNumber: string;
  status: string;
  issuedAt: string;
}

type LockedCounter = { id: number; lastIssuedNumber: number };

@Injectable()
export class ReceptionQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async issueTicket(
    input: IssueTicketInput,
    actorId?: number,
    transactionClient?: Prisma.TransactionClient,
  ): Promise<QueueTicketDto> {
    const businessDate = clinicDateToDbDate(input.businessDate);

    if (transactionClient) {
      return this.issueInsideTransaction(transactionClient, input, businessDate, actorId);
    }

    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (tx) => this.issueInsideTransaction(tx, input, businessDate, actorId),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const retryable =
          error instanceof Prisma.PrismaClientKnownRequestError &&
          (error.code === 'P2002' || error.code === 'P2034');
        if (!retryable || attempt === 2) throw error;
      }
    }

    throw new Error('Không thể cấp STT sau khi thử lại.');
  }

  private async issueInsideTransaction(
    tx: Prisma.TransactionClient,
    input: IssueTicketInput,
    businessDate: Date,
    actorId?: number,
  ): Promise<QueueTicketDto> {
    const existing = await tx.queueTicket.findUnique({ where: { intakeId: input.intakeId } });
    if (existing) return this.toDto(existing);

    const rows = await tx.$queryRaw<LockedCounter[]>(Prisma.sql`
      SELECT [id], [lastIssuedNumber]
      FROM [dbo].[RoomQueueCounter] WITH (UPDLOCK, HOLDLOCK)
      WHERE [businessDate] = ${businessDate} AND [roomId] = ${input.roomId}
    `);

    let counter = rows[0];
    if (!counter) {
      counter = await tx.roomQueueCounter.create({
        data: { businessDate, roomId: input.roomId, lastIssuedNumber: 0 },
        select: { id: true, lastIssuedNumber: true },
      });
    }

    if (counter.lastIssuedNumber >= 9999) {
      throw new BadRequestException('Phòng khám đã cấp hết STT trong ngày (0001–9999).');
    }

    const updatedCounter = await tx.roomQueueCounter.update({
      where: { id: counter.id },
      data: { lastIssuedNumber: { increment: 1 } },
    });
    const ticket = await tx.queueTicket.create({
      data: {
        intakeId: input.intakeId,
        roomId: input.roomId,
        businessDate,
        queueNumber: updatedCounter.lastIssuedNumber,
        status: 'WAITING',
        issuedById: actorId,
      },
    });
    await tx.intakeAuditLog.create({
      data: {
        intakeId: input.intakeId,
        action: 'QUEUE_ISSUED',
        actorId,
        changesJson: JSON.stringify({
          businessDate: input.businessDate,
          roomId: input.roomId,
          queueNumber: ticket.queueNumber,
        }),
      },
    });
    return this.toDto(ticket);
  }

  private toDto(ticket: {
    id: number;
    intakeId: number;
    roomId: number;
    businessDate: Date;
    queueNumber: number;
    status: string;
    issuedAt: Date;
  }): QueueTicketDto {
    return {
      id: ticket.id,
      intakeId: ticket.intakeId,
      roomId: ticket.roomId,
      businessDate: ticket.businessDate.toISOString().slice(0, 10),
      queueNumber: ticket.queueNumber,
      displayNumber: String(ticket.queueNumber).padStart(4, '0'),
      status: ticket.status,
      issuedAt: ticket.issuedAt.toISOString(),
    };
  }
}

