import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PrismaService } from '../infrastructure/database/prisma.service.js';
import { DoctorQueueService } from './doctor-queue.service.js';

describe('DoctorQueueService', () => {
  let prisma: any;
  let service: DoctorQueueService;

  beforeEach(() => {
    prisma = {
      queueTicket: { findMany: vi.fn(), findFirst: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn() },
      roomQueueCounter: { findFirst: vi.fn(), update: vi.fn() },
      doctorExamination: { findFirst: vi.fn(), findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
      intake: { update: vi.fn() },
      queueCallHistory: { create: vi.fn() },
      intakeAuditLog: { create: vi.fn() },
      $queryRaw: vi.fn().mockResolvedValue([]),
      $transaction: vi.fn(async (callback: (tx: any) => Promise<any>) => callback(prisma)),
    };
    service = new DoctorQueueService(prisma as PrismaService);
  });

  it('returns today queue strictly by STT and reports priority without reordering it', async () => {
    const ticket = (number: number, priority: 'Thường' | 'Ưu tiên') => ({
      id: number,
      roomId: 2,
      queueNumber: number,
      businessDate: new Date('2026-10-21T00:00:00.000Z'),
      issuedAt: new Date('2026-10-21T01:00:00.000Z'),
      room: { id: 2, code: 'room-02', name: 'Phòng 02' },
      intake: {
        id: number,
        code: `TNK${number}`,
        symptoms: 'Đau răng',
        priority,
        priorityReason: priority === 'Ưu tiên' ? 'Người cao tuổi' : null,
        patient: { code: `MBN${number}`, fullName: `Bệnh nhân ${number}`, dateOfBirth: new Date('1990-01-01'), gender: 'Nam', phone: '0901', note: null },
        services: [],
      },
    });
    prisma.queueTicket.findMany.mockResolvedValue([ticket(1, 'Thường'), ticket(2, 'Thường'), ticket(3, 'Ưu tiên')]);
    prisma.roomQueueCounter.findFirst.mockResolvedValue({ currentNumber: 1 });

    const result = await service.getQueue(7, new Date('2026-10-21T02:00:00.000Z'));

    expect(result.queue.map((item) => item.queueNumber)).toEqual(['0001', '0002', '0003']);
    expect(result.queue[2]).toMatchObject({ priority: 'Ưu tiên', priorityReason: 'Người cao tuổi' });
    expect(result.summary).toMatchObject({ waitingCount: 3, priorityWaitingCount: 1, currentCallingNumber: '0001' });
    expect(prisma.queueTicket.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ status: 'WAITING', intake: { doctorId: 7, status: 'TRANSFERRED' } }),
      orderBy: { queueNumber: 'asc' },
    }));
  });

  it('atomically calls the smallest waiting STT assigned to the doctor', async () => {
    prisma.doctorExamination.findFirst.mockResolvedValue(null);
    prisma.queueTicket.findFirst.mockResolvedValue({
      id: 3, roomId: 2, queueNumber: 3, businessDate: new Date('2026-10-21T00:00:00.000Z'),
      intake: { id: 11, code: 'TNK11', patientId: 4, doctorId: 7, roomId: 2 },
    });
    prisma.queueTicket.updateMany.mockResolvedValue({ count: 1 });
    prisma.doctorExamination.create.mockResolvedValue({ id: 31 });

    const result = await service.callNext(7, 9, new Date('2026-10-21T02:00:00.000Z'));

    expect(result).toMatchObject({ nextExaminationId: 31, queueNumber: '0003' });
    expect(prisma.queueTicket.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ intake: { doctorId: 7, status: 'TRANSFERRED' } }),
      orderBy: { queueNumber: 'asc' },
    }));
    expect(prisma.queueTicket.updateMany).toHaveBeenCalledWith({
      where: { id: 3, status: 'WAITING' },
      data: { status: 'CALLED', calledAt: expect.any(Date) },
    });
    expect(prisma.queueCallHistory.create).toHaveBeenCalledWith({ data: expect.objectContaining({ ticketId: 3, action: 'CALLED', actorId: 9 }) });
    expect(prisma.roomQueueCounter.update).toHaveBeenCalledWith(expect.objectContaining({ data: { currentTicketId: 3, currentNumber: 3 } }));
  });

  it('blocks a second call while the doctor has an in-progress patient', async () => {
    prisma.doctorExamination.findFirst.mockResolvedValue({ id: 99 });
    await expect(service.callNext(7, 7)).rejects.toThrow(BadRequestException);
    expect(prisma.doctorExamination.create).not.toHaveBeenCalled();
  });

  it('returns the exact empty-queue message without changing state', async () => {
    prisma.doctorExamination.findFirst.mockResolvedValue(null);
    prisma.queueTicket.findFirst.mockResolvedValue(null);
    await expect(service.callNext(7, 7)).resolves.toEqual({ nextExaminationId: null, message: 'Không còn bệnh nhân chờ' });
    expect(prisma.queueTicket.updateMany).not.toHaveBeenCalled();
  });

  it('blocks Vắng mặt once any clinical data exists', async () => {
    prisma.doctorExamination.findUnique.mockResolvedValue({
      id: 41, doctorId: 7, intakeId: 11, status: 'IN_PROGRESS',
      supplies: [{ id: 1 }], reservations: [], result: null, printHistories: [],
    });
    await expect(service.markAbsent(41, 7)).rejects.toThrow(/Ngừng khám/i);
    expect(prisma.doctorExamination.update).not.toHaveBeenCalled();
  });

  it('marks the called ticket absent and automatically advances to the next STT', async () => {
    prisma.doctorExamination.findUnique.mockResolvedValue({
      id: 41, doctorId: 7, intakeId: 11, status: 'IN_PROGRESS',
      supplies: [], reservations: [], result: null, printHistories: [],
    });
    prisma.queueTicket.findUnique.mockResolvedValue({
      id: 3, intakeId: 11, roomId: 2, queueNumber: 3, status: 'CALLED',
      businessDate: new Date('2026-10-21T00:00:00.000Z'),
    });
    prisma.doctorExamination.findFirst.mockResolvedValue(null);
    prisma.queueTicket.findFirst.mockResolvedValue({
      id: 4, roomId: 2, queueNumber: 4, businessDate: new Date('2026-10-21T00:00:00.000Z'),
      intake: { id: 12, code: 'TNK12', patientId: 5, doctorId: 7, roomId: 2 },
    });
    prisma.queueTicket.updateMany.mockResolvedValue({ count: 1 });
    prisma.doctorExamination.create.mockResolvedValue({ id: 42 });

    const result = await service.markAbsent(41, 7, 7, new Date('2026-10-21T02:00:00.000Z'));

    expect(result).toMatchObject({ absentExaminationId: 41, absentQueueNumber: '0003', nextExaminationId: 42, queueNumber: '0004' });
    expect(prisma.doctorExamination.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'ABSENT' }) }));
    expect(prisma.queueTicket.updateMany).toHaveBeenCalledWith({
      where: { id: 3, status: 'CALLED' }, data: { status: 'ABSENT', absentAt: expect.any(Date) },
    });
  });
});
