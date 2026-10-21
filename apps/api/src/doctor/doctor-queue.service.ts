import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { clinicDateToDbDate, getClinicBusinessDate, getClinicTimeParts, isClinicShiftActive, previousClinicDate } from '../common/clinic-time.js';
import { PrismaService } from '../infrastructure/database/prisma.service.js';

@Injectable()
export class DoctorQueueService {
  constructor(private readonly prisma: PrismaService) {}

  async getQueue(doctorId: number, now = new Date()) {
    const businessDate = clinicDateToDbDate(getClinicBusinessDate(now));
    const room = await this.resolveDoctorRoom(this.prisma, doctorId, businessDate, now);
    if (!room) {
      return {
        queue: [],
        summary: {
          businessDate: getClinicBusinessDate(now),
          waitingCount: 0,
          priorityWaitingCount: 0,
        },
      };
    }
    const tickets = await this.prisma.queueTicket.findMany({
      where: {
        businessDate,
        roomId: room.id,
        status: 'WAITING',
        intake: { doctorId, status: 'TRANSFERRED' },
      },
      include: {
        room: true,
        intake: {
          include: {
            patient: true,
            services: { include: { service: true } },
          },
        },
      },
      orderBy: { queueNumber: 'asc' },
    });
    const counter = await this.prisma.roomQueueCounter.findFirst({ where: { businessDate, roomId: room.id } });
    const queue = tickets.map((ticket) => ({
      id: ticket.intake.code,
      intakeId: ticket.intake.id,
      ticketId: ticket.id,
      queueNumber: String(ticket.queueNumber).padStart(4, '0'),
      patientCode: ticket.intake.patient.code,
      patientName: ticket.intake.patient.fullName,
      dateOfBirth: ticket.intake.patient.dateOfBirth.toISOString().slice(0, 10),
      gender: ticket.intake.patient.gender,
      phone: ticket.intake.patient.phone,
      note: ticket.intake.patient.note ?? '',
      symptoms: ticket.intake.symptoms,
      priority: ticket.intake.priority as 'Thường' | 'Ưu tiên',
      priorityReason: ticket.intake.priorityReason ?? undefined,
      roomCode: ticket.room.code,
      roomName: ticket.room.name,
      issuedAt: ticket.issuedAt.toISOString(),
      services: ticket.intake.services.map((item) => ({
        code: item.service.code,
        name: item.service.name,
        quantity: item.quantity,
        unit: item.service.unit,
      })),
    }));
    return {
      queue,
      summary: {
        businessDate: getClinicBusinessDate(now),
        roomCode: room.code,
        roomName: room.name,
        waitingCount: queue.length,
        priorityWaitingCount: queue.filter((item) => item.priority === 'Ưu tiên').length,
        currentCallingNumber: counter?.currentNumber
          ? String(counter.currentNumber).padStart(4, '0')
          : undefined,
      },
    };
  }

  async callNext(doctorId: number, actorId = doctorId, now = new Date()) {
    const businessDate = clinicDateToDbDate(getClinicBusinessDate(now));
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        return await this.prisma.$transaction(
          (tx) => this.callNextInsideTransaction(tx, doctorId, actorId, now, businessDate, undefined, 'CALL'),
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );
      } catch (error) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034';
        if (!retryable || attempt === 2) throw error;
      }
    }
    throw new Error('Không thể gọi STT sau khi thử lại.');
  }

  async markAbsent(examinationId: number, doctorId: number, actorId = doctorId, now = new Date()) {
    const businessDate = clinicDateToDbDate(getClinicBusinessDate(now));
    return this.prisma.$transaction(async (tx) => {
      const examination = await tx.doctorExamination.findUnique({
        where: { id: examinationId },
        include: { supplies: true, reservations: true, result: true, printHistories: true },
      });
      if (!examination || examination.doctorId !== doctorId) {
        throw new BadRequestException('Ca khám không thuộc bác sĩ đang đăng nhập.');
      }
      if (examination.status !== 'IN_PROGRESS') {
        throw new BadRequestException('Chỉ ca vừa được gọi và đang ở trạng thái Đang khám mới có thể đánh dấu Vắng mặt.');
      }
      if (examination.supplies.length || examination.reservations.length || examination.result || examination.printHistories.length) {
        throw new BadRequestException('Ca đã có dữ liệu khám. Vui lòng dùng Ngừng khám thay cho Vắng mặt.');
      }
      const ticket = await tx.queueTicket.findUnique({ where: { intakeId: examination.intakeId } });
      if (!ticket || ticket.status !== 'CALLED') {
        throw new BadRequestException('STT không còn ở trạng thái vừa gọi.');
      }

      await tx.doctorExamination.update({
        where: { id: examination.id },
        data: { status: 'ABSENT', completedAt: now, cancelReason: 'Bệnh nhân vắng mặt', isLocked: true },
      });
      await tx.intake.update({ where: { id: examination.intakeId }, data: { status: 'ABSENT' } });
      await tx.queueTicket.updateMany({
        where: { id: ticket.id, status: 'CALLED' },
        data: { status: 'ABSENT', absentAt: now },
      });
      await tx.queueCallHistory.create({ data: { ticketId: ticket.id, action: 'ABSENT', actorId, occurredAt: now } });
      await tx.intakeAuditLog.create({
        data: {
          intakeId: examination.intakeId,
          action: 'QUEUE_ABSENT',
          actorId,
          reason: 'Bệnh nhân vắng mặt',
          changesJson: JSON.stringify({ queueNumber: ticket.queueNumber, roomId: ticket.roomId }),
        },
      });

      const next = await this.callNextInsideTransaction(
        tx, doctorId, actorId, now, businessDate, ticket.roomId, 'AUTO_CALL_AFTER_ABSENT',
      );
      if (!next.nextExaminationId) {
        await tx.roomQueueCounter.update({
          where: { businessDate_roomId: { businessDate: ticket.businessDate, roomId: ticket.roomId } },
          data: { currentTicketId: null, currentNumber: null },
        });
      }
      return {
        absentExaminationId: examination.id,
        absentQueueNumber: String(ticket.queueNumber).padStart(4, '0'),
        ...next,
      };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  private async callNextInsideTransaction(
    tx: Prisma.TransactionClient,
    doctorId: number,
    actorId: number,
    now: Date,
    businessDate: Date,
    requestedRoomId?: number,
    historyAction: 'CALL' | 'AUTO_CALL_AFTER_ABSENT' = 'CALL',
  ) {
      const ongoing = await tx.doctorExamination.findFirst({ where: { doctorId, status: 'IN_PROGRESS' } });
      if (ongoing) {
        throw new BadRequestException('Bác sĩ đang có bệnh nhân Đang khám. Vui lòng hoàn thành, Ngừng khám hoặc đánh dấu Vắng mặt trước khi gọi tiếp.');
      }

      const assignedRoom = requestedRoomId
        ? { id: requestedRoomId }
        : await this.resolveDoctorRoom(tx, doctorId, businessDate, now);
      if (!assignedRoom) return { nextExaminationId: null, message: 'Không còn bệnh nhân chờ' };

      await tx.$queryRaw(Prisma.sql`
        SELECT [id] FROM [dbo].[RoomQueueCounter] WITH (UPDLOCK, HOLDLOCK)
        WHERE [businessDate] = ${businessDate} AND [roomId] = ${assignedRoom.id}
      `);
      const ticket = await tx.queueTicket.findFirst({
        where: {
          businessDate,
          roomId: assignedRoom.id,
          status: 'WAITING',
          intake: { doctorId, status: 'TRANSFERRED' },
        },
        include: { intake: true },
        orderBy: { queueNumber: 'asc' },
      });
      if (!ticket) return { nextExaminationId: null, message: 'Không còn bệnh nhân chờ' };

      const changed = await tx.queueTicket.updateMany({
        where: { id: ticket.id, status: 'WAITING' },
        data: { status: 'CALLED', calledAt: now },
      });
      if (changed.count !== 1) {
        throw new BadRequestException('STT vừa được xử lý bởi người khác. Vui lòng tải lại hàng chờ.');
      }

      const datePart = getClinicBusinessDate(now).replaceAll('-', '');
      const examination = await tx.doctorExamination.create({
        data: {
          code: `PKB${datePart}/${String(ticket.id).padStart(6, '0')}`,
          intakeId: ticket.intake.id,
          patientId: ticket.intake.patientId,
          doctorId,
          roomId: ticket.roomId,
          status: 'IN_PROGRESS',
          startedAt: now,
        },
      });
      await tx.intake.update({ where: { id: ticket.intake.id }, data: { status: 'IN_PROGRESS' } });
      await tx.queueCallHistory.create({
        data: { ticketId: ticket.id, action: historyAction, actorId, occurredAt: now },
      });
      await tx.intakeAuditLog.create({
        data: {
          intakeId: ticket.intake.id,
          action: 'QUEUE_CALLED',
          actorId,
          changesJson: JSON.stringify({ queueNumber: ticket.queueNumber, roomId: ticket.roomId }),
        },
      });
      await tx.roomQueueCounter.update({
        where: { businessDate_roomId: { businessDate, roomId: ticket.roomId } },
        data: { currentTicketId: ticket.id, currentNumber: ticket.queueNumber },
      });
      return {
        nextExaminationId: examination.id,
        queueNumber: String(ticket.queueNumber).padStart(4, '0'),
        message: `Đã gọi STT ${String(ticket.queueNumber).padStart(4, '0')}`,
      };
  }

  private async resolveDoctorRoom(
    client: Prisma.TransactionClient | PrismaService,
    doctorId: number,
    businessDate: Date,
    now: Date,
  ): Promise<{ id: number; code?: string; name?: string } | null> {
    const current = await client.doctorExamination.findFirst({
      where: { doctorId, status: 'IN_PROGRESS' },
      select: { room: { select: { id: true, code: true, name: true } } },
    });
    if (current?.room) return current.room;

    const clinicParts = getClinicTimeParts(now);
    const previousBusinessDate = clinicDateToDbDate(previousClinicDate(clinicParts.date));
    const doctor = await client.user.findUnique({
      where: { id: doctorId },
      select: {
        employee: {
          select: {
            room: { select: { id: true, code: true, name: true } },
            shiftAssignments: {
              where: { date: { in: [businessDate, previousBusinessDate] } },
              select: {
                id: true,
                date: true,
                room: { select: { id: true, code: true, name: true } },
                shift: { select: { startTime: true, endTime: true } },
              },
            },
          },
        },
      },
    });
    const active = [...(doctor?.employee?.shiftAssignments ?? [])]
      .filter((assignment) => isClinicShiftActive(
        assignment.date,
        assignment.shift.startTime,
        assignment.shift.endTime,
        clinicParts.date,
        clinicParts.time,
      ))
      .sort((a, b) => b.shift.startTime.localeCompare(a.shift.startTime) || b.id - a.id)[0];
    if (active?.room) return active.room;

    const waitingRooms = await client.queueTicket.findMany({
      where: { businessDate, status: 'WAITING', intake: { doctorId, status: 'TRANSFERRED' } },
      select: { room: { select: { id: true, code: true, name: true } } },
      distinct: ['roomId'],
    });
    if (waitingRooms.length > 1) {
      throw new BadRequestException('Bác sĩ đang có hàng chờ ở nhiều phòng. Vui lòng liên hệ Tiếp nhận để điều phối lại.');
    }
    return waitingRooms[0]?.room ?? doctor?.employee?.room ?? null;
  }
}
