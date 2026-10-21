import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { AccountingService } from '../accounting/accounting.service.js';
import type { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto.js';
import type { CreateIntakeDto, UpdateIntakeServicesDto } from './dto/intake.dto.js';
import type { IntakeFiltersDto } from './dto/queue-actions.dto.js';
import { clinicDateToDbDate, getClinicTimeParts } from '../common/clinic-time.js';
import { ReceptionQueueService } from './reception-queue.service.js';

function dateStamp(date = new Date()): string {
  const year = date.getFullYear();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${day}${month}`;
}

@Injectable()
export class ReceptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounting?: AccountingService,
    private readonly queueService?: ReceptionQueueService,
  ) {}

  async getMasterData(now = new Date()) {
    const clinicNow = getClinicTimeParts(now);
    const businessDate = clinicDateToDbDate(clinicNow.date);
    const [rooms, services, doctorUsers] = await Promise.all([
      this.prisma.clinicRoom.findMany({
        where: { isActive: true },
        orderBy: { code: 'asc' },
      }),
      this.prisma.dentalService.findMany({
        where: { isActive: true },
        orderBy: { id: 'asc' },
      }),
      this.prisma.user.findMany({
        where: { role: { code: 'DOCTOR' }, isActive: true },
        select: {
          id: true,
          username: true,
          fullName: true,
          employee: {
            select: {
              room: { select: { code: true, name: true } },
              shiftAssignments: {
                where: { date: businessDate },
                select: {
                  id: true,
                  room: { select: { code: true, name: true } },
                  shift: { select: { name: true, startTime: true, endTime: true } },
                },
              },
            },
          },
        },
        orderBy: { id: 'asc' },
      }),
    ]);

    return {
      businessDate: clinicNow.date,
      rooms: rooms.map((r) => ({ id: r.code, name: r.name, description: r.description })),
      services: services.map((s) => ({
        id: s.code,
        category: s.category,
        name: s.name,
        price: s.price,
        unit: s.unit,
      })),
      doctors: doctorUsers.map((d) => {
        const activeShift = [...(d.employee?.shiftAssignments ?? [])]
          .filter((assignment) =>
            assignment.shift.startTime <= clinicNow.time && clinicNow.time < assignment.shift.endTime,
          )
          .sort((a, b) =>
            b.shift.startTime.localeCompare(a.shift.startTime) || b.id - a.id,
          )[0];
        return {
          id: d.username,
          name: d.fullName,
          specialty: 'Nha khoa chuyên sâu',
          isOnDuty: Boolean(activeShift),
          assignedRoom: activeShift?.room
            ? { id: activeShift.room.code, name: activeShift.room.name }
            : undefined,
          fallbackRoom: d.employee?.room
            ? { id: d.employee.room.code, name: d.employee.room.name }
            : undefined,
          shiftName: activeShift?.shift.name,
          shiftStart: activeShift?.shift.startTime,
          shiftEnd: activeShift?.shift.endTime,
        };
      }),
    };
  }

  async getPatients() {
    const patients = await this.prisma.patient.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return patients.map((p) => ({
      id: p.code,
      fullName: p.fullName,
      dateOfBirth: p.dateOfBirth.toISOString().split('T')[0],
      gender: p.gender,
      phone: p.phone,
      address: p.address ?? '',
      note: p.note ?? '',
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  async upsertPatient(dto: CreatePatientDto | UpdatePatientDto, patientCode?: string) {
    // Check phone uniqueness
    if (dto.phone) {
      const existingWithPhone = await this.prisma.patient.findUnique({
        where: { phone: dto.phone },
      });
      if (existingWithPhone && (!patientCode || existingWithPhone.code !== patientCode)) {
        throw new BadRequestException('Số điện thoại đã được sử dụng bởi một bệnh nhân khác.');
      }
    }

    if (patientCode) {
      const existing = await this.prisma.patient.findUnique({
        where: { code: patientCode },
      });
      if (!existing) {
        throw new NotFoundException('Không tìm thấy hồ sơ bệnh nhân cần cập nhật.');
      }

      const updated = await this.prisma.patient.update({
        where: { code: patientCode },
        data: {
          fullName: dto.fullName ?? existing.fullName,
          dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : existing.dateOfBirth,
          gender: dto.gender ?? existing.gender,
          phone: dto.phone ?? existing.phone,
          address: dto.address ?? existing.address,
          note: dto.note ?? existing.note,
        },
      });

      return {
        id: updated.code,
        fullName: updated.fullName,
        dateOfBirth: updated.dateOfBirth.toISOString().split('T')[0],
        gender: updated.gender,
        phone: updated.phone,
        address: updated.address ?? '',
        note: updated.note ?? '',
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    }

    // Creating new patient
    if (!dto.fullName || !dto.dateOfBirth || !dto.gender || !dto.phone) {
      throw new BadRequestException('Vui lòng cung cấp đầy đủ thông tin bệnh nhân.');
    }

    const todayPrefix = `MBN${dateStamp()}/`;
    const existingCodes = await this.prisma.patient.findMany({
      where: { code: { startsWith: todayPrefix } },
      select: { code: true },
    });

    const maxSequence = existingCodes
      .map((item) => Number(item.code.slice(todayPrefix.length)))
      .filter(Number.isFinite)
      .reduce((max, val) => Math.max(max, val), 0);

    const newCode = `${todayPrefix}${String(maxSequence + 1).padStart(4, '0')}`;

    const created = await this.prisma.patient.create({
      data: {
        code: newCode,
        fullName: dto.fullName,
        dateOfBirth: new Date(dto.dateOfBirth),
        gender: dto.gender,
        phone: dto.phone,
        address: dto.address,
        note: dto.note,
      },
    });

    return {
      id: created.code,
      fullName: created.fullName,
      dateOfBirth: created.dateOfBirth.toISOString().split('T')[0],
      gender: created.gender,
      phone: created.phone,
      address: created.address ?? '',
      note: created.note ?? '',
      createdAt: created.createdAt.toISOString(),
      updatedAt: created.updatedAt.toISOString(),
    };
  }

  async getIntakes(filters: IntakeFiltersDto = {}) {
    const businessDate = filters.date ? clinicDateToDbDate(filters.date) : undefined;
    const where = {
      ...(filters.priority ? { priority: filters.priority } : {}),
      ...(filters.roomCode ? { room: { code: filters.roomCode } } : {}),
      ...(businessDate ? { queueTicket: { businessDate } } : {}),
    };
    const intakes = await this.prisma.intake.findMany({
      where,
      include: {
        patient: true,
        room: true,
        doctor: true,
        queueTicket: true,
        _count: { select: { printHistories: true } },
        services: {
          include: { service: true },
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const roomIds = [...new Set(intakes.flatMap((intake) => {
      const roomId = intake.roomId ?? intake.room?.id;
      return roomId ? [roomId] : [];
    }))];
    const counters = roomIds.length === 0 ? [] : await this.prisma.roomQueueCounter.findMany({
      where: {
        roomId: { in: roomIds },
        ...(businessDate ? { businessDate } : {}),
      },
    });
    const counterMap = new Map(counters.map((counter) => [
      `${counter.roomId}:${counter.businessDate.toISOString().slice(0, 10)}`,
      counter.currentNumber,
    ]));

    return intakes.map((intake) => {
      const latestPayment = intake.payments[0];
      return {
        id: intake.code,
        patientId: intake.patient.code,
        symptoms: intake.symptoms,
        priority: intake.priority as 'Thường' | 'Ưu tiên',
        priorityReason: intake.priorityReason ?? undefined,
        patientName: intake.patient.fullName,
        services: intake.services.map((s) => ({
          serviceId: s.service.code,
          quantity: s.quantity,
        })),
        roomId: intake.room?.code ?? '',
        doctorId: intake.doctor?.username ?? '',
        doctorName: intake.doctor?.fullName ?? '',
        roomName: intake.room?.name ?? '',
        queueNumber: intake.queueTicket
          ? String(intake.queueTicket.queueNumber).padStart(4, '0')
          : undefined,
        queueDate: intake.queueTicket?.businessDate.toISOString().slice(0, 10),
        queueStatus: intake.queueTicket?.status,
        currentCallingNumber: intake.queueTicket && (intake.roomId ?? intake.room?.id)
          ? (() => {
              const roomId = intake.roomId ?? intake.room!.id;
              const value = counterMap.get(`${roomId}:${intake.queueTicket.businessDate.toISOString().slice(0, 10)}`);
              return value ? String(value).padStart(4, '0') : undefined;
            })()
          : undefined,
        printCount: intake._count.printHistories,
        isCopy: intake._count.printHistories > 1,
        status: intake.status as 'DRAFT' | 'READY' | 'PAID' | 'TRANSFERRED',
        createdAt: intake.createdAt.toISOString(),
        transferredAt: intake.transferredAt ? intake.transferredAt.toISOString() : undefined,
        payment: latestPayment
          ? {
              method: latestPayment.method as 'CASH' | 'MOMO',
              status: latestPayment.status as 'PENDING' | 'PAID' | 'FAILED',
              orderId: latestPayment.orderId,
              paidAt: latestPayment.paidAt ? latestPayment.paidAt.toISOString() : undefined,
            }
          : undefined,
      };
    });
  }

  async recordIntakePrint(intakeCode: string, actorId?: number) {
    const intake = await this.prisma.intake.findUnique({
      where: { code: intakeCode },
      include: {
        patient: true,
        room: true,
        doctor: true,
        queueTicket: true,
        services: { include: { service: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!intake) throw new NotFoundException(`Không tìm thấy phiếu tiếp nhận ${intakeCode}.`);
    if (!intake.queueTicket || !intake.room || !intake.doctor) {
      throw new BadRequestException('Phiếu tiếp nhận chưa được cấp STT nên chưa thể in.');
    }

    const previousPrints = await this.prisma.intakePrintHistory.count({ where: { intakeId: intake.id } });
    const isCopy = previousPrints > 0;
    const queueNumber = String(intake.queueTicket.queueNumber).padStart(4, '0');
    const printedAt = new Date();
    const printData = {
      intakeCode: intake.code,
      patientCode: intake.patient.code,
      patientName: intake.patient.fullName,
      queueNumber,
      priority: intake.priority as 'Thường' | 'Ưu tiên',
      priorityReason: intake.priorityReason ?? undefined,
      roomCode: intake.room.code,
      roomName: intake.room.name,
      doctorUsername: intake.doctor.username,
      doctorName: intake.doctor.fullName,
      services: intake.services.map((item) => ({
        code: item.service.code,
        name: item.service.name,
        quantity: item.quantity,
      })),
      issuedAt: intake.queueTicket.issuedAt,
      printedAt,
      isCopy,
      printCount: previousPrints + 1,
    };

    await this.prisma.$transaction(async (tx) => {
      await tx.intakePrintHistory.create({
        data: {
          intakeId: intake.id,
          printedById: actorId,
          isCopy,
          contentSnapshot: JSON.stringify(printData),
        },
      });
      await tx.intakeAuditLog.create({
        data: {
          intakeId: intake.id,
          action: isCopy ? 'REPRINTED' : 'PRINTED',
          actorId,
          changesJson: JSON.stringify({ queueNumber, printCount: previousPrints + 1 }),
        },
      });
    });
    return printData;
  }

  async cancelIntake(intakeCode: string, reason: string, actorId?: number) {
    const normalizedReason = reason?.trim();
    if (!normalizedReason) throw new BadRequestException('Lý do hủy phiếu tiếp nhận là bắt buộc.');

    const intake = await this.prisma.intake.findUnique({
      where: { code: intakeCode },
      include: {
        queueTicket: true,
        examination: true,
        payments: { where: { status: 'PAID' }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!intake) throw new NotFoundException(`Không tìm thấy phiếu tiếp nhận ${intakeCode}.`);
    if (!intake.queueTicket) throw new BadRequestException('Phiếu tiếp nhận chưa có STT để hủy.');
    if (intake.queueTicket.status !== 'WAITING' || intake.examination) {
      throw new BadRequestException('Chỉ được hủy phiếu tiếp nhận còn đang chờ và chưa được gọi khám.');
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.queueTicket.updateMany({
        where: { id: intake.queueTicket!.id, status: 'WAITING' },
        data: { status: 'CANCELLED', cancelledAt: now },
      });
      if (changed.count !== 1) {
        throw new BadRequestException('Phiếu đã được xử lý bởi người khác. Vui lòng tải lại danh sách.');
      }
      await tx.intake.update({
        where: { id: intake.id },
        data: { status: 'CANCELLED_RECEPTION' },
      });
      await tx.intakeAuditLog.create({
        data: {
          intakeId: intake.id,
          action: 'CANCELLED',
          actorId,
          reason: normalizedReason,
          changesJson: JSON.stringify({
            queueNumber: intake.queueTicket!.queueNumber,
            roomId: intake.queueTicket!.roomId,
          }),
        },
      });

      const paidAmount = intake.payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (paidAmount > 0) {
        const key = {
          sourceType: 'RECEPTION',
          sourceCode: intake.code,
          eventType: 'INTAKE_CANCELLED',
          idempotencyKey: `reception-cancel-${intake.id}`,
        };
        await tx.accountingEvent.upsert({
          where: { sourceType_sourceCode_eventType_idempotencyKey: key },
          update: {},
          create: {
            ...key,
            payloadJson: JSON.stringify({
              intakeId: intake.id,
              intakeCode: intake.code,
              revenueAmount: 0,
              supplyCostAmount: 0,
              rewardAmount: 0,
              prepaidAmount: paidAmount,
              prepaymentDisposition: 'PENDING_REFUND_OR_CARRY_FORWARD',
              reason: normalizedReason,
            }),
          },
        });
      }
    });

    return {
      intakeCode: intake.code,
      queueNumber: String(intake.queueTicket.queueNumber).padStart(4, '0'),
      status: 'CANCELLED_RECEPTION',
      queueStatus: 'CANCELLED',
      cancelledAt: now.toISOString(),
    };
  }

  async createIntake(dto: CreateIntakeDto, userId?: number) {
    const priorityReason = dto.priorityReason?.trim();
    if (dto.priority === 'Ưu tiên' && !priorityReason) {
      throw new BadRequestException('Mức Ưu tiên bắt buộc phải có lý do.');
    }
    const patient = await this.prisma.patient.findUnique({
      where: { code: dto.patientCode },
    });
    if (!patient) {
      throw new NotFoundException(`Không tìm thấy bệnh nhân với mã ${dto.patientCode}.`);
    }

    const todayPrefix = `TNK${dateStamp()}/`;
    const existingCodes = await this.prisma.intake.findMany({
      where: { code: { startsWith: todayPrefix } },
      select: { code: true },
    });

    const maxSequence = existingCodes
      .map((item) => Number(item.code.slice(todayPrefix.length)))
      .filter(Number.isFinite)
      .reduce((max, val) => Math.max(max, val), 0);

    const newCode = `${todayPrefix}${String(maxSequence + 1).padStart(4, '0')}`;

    const intake = await this.prisma.intake.create({
      data: {
        code: newCode,
        patientId: patient.id,
        symptoms: dto.symptoms,
        priority: dto.priority ?? 'Thường',
        priorityReason: dto.priority === 'Ưu tiên' ? priorityReason : null,
        status: 'DRAFT',
        createdById: userId,
      },
    });

    return {
      id: intake.code,
      patientId: patient.code,
      symptoms: intake.symptoms,
      priority: intake.priority as 'Thường' | 'Ưu tiên',
      priorityReason: intake.priorityReason ?? undefined,
      services: [],
      roomId: '',
      doctorId: '',
      status: intake.status as 'DRAFT',
      createdAt: intake.createdAt.toISOString(),
    };
  }

  async updateIntakeServices(intakeCode: string, dto: UpdateIntakeServicesDto, actorId?: number) {
    const clinicNow = getClinicTimeParts();
    const businessDate = clinicDateToDbDate(clinicNow.date);
    const intake = await this.prisma.intake.findUnique({
      where: { code: intakeCode },
      include: { services: true, queueTicket: true },
    });
    if (!intake) {
      throw new NotFoundException(`Không tìm thấy phiếu tiếp nhận ${intakeCode}.`);
    }
    if (intake.status === 'TRANSFERRED') {
      throw new BadRequestException('Hồ sơ đã bàn giao cho bác sĩ, không thể sửa đổi dịch vụ.');
    }
    if (intake.queueTicket) {
      throw new BadRequestException(
        'Phiếu tiếp nhận đã được cấp STT; không thể sửa dịch vụ, bác sĩ, phòng hoặc mức ưu tiên. Vui lòng hủy và làm lại.',
      );
    }
    if (dto.priority === 'Ưu tiên' && !dto.priorityReason?.trim()) {
      throw new BadRequestException('Mức Ưu tiên bắt buộc phải có lý do.');
    }

    const room = await this.prisma.clinicRoom.findUnique({
      where: { code: dto.roomCode },
    });
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng khám với mã ${dto.roomCode}.`);
    }

    const doctor = await this.prisma.user.findUnique({
      where: { username: dto.doctorUsername },
      include: {
        role: true,
        employee: {
          include: {
            shiftAssignments: {
              where: { date: businessDate },
              include: { room: true, shift: true },
            },
          },
        },
      },
    });
    if (!doctor || doctor.role.code !== 'DOCTOR') {
      throw new NotFoundException(`Không tìm thấy bác sĩ với tài khoản ${dto.doctorUsername}.`);
    }

    const activeAssignment = [...(doctor.employee?.shiftAssignments ?? [])]
      .filter((assignment) =>
        assignment.shift.startTime <= clinicNow.time && clinicNow.time < assignment.shift.endTime,
      )
      .sort((a, b) => b.shift.startTime.localeCompare(a.shift.startTime) || b.id - a.id)[0];
    if (activeAssignment?.room?.code && activeAssignment.room.code !== dto.roomCode) {
      throw new BadRequestException(
        `Phòng khám phải theo ca trực hiện tại của bác sĩ (${activeAssignment.room.name}).`,
      );
    }
    if (!activeAssignment && !dto.roomOverrideReason?.trim()) {
      throw new BadRequestException(
        'Bác sĩ chưa được phân ca tại thời điểm này; bắt buộc nhập lý do chọn phòng thủ công.',
      );
    }

    const serviceCodes = dto.services.map((s) => s.serviceCode);
    const dentalServices = await this.prisma.dentalService.findMany({
      where: { code: { in: serviceCodes }, isActive: true },
    });
    if (dentalServices.length !== serviceCodes.length) {
      throw new NotFoundException('Một hoặc nhiều dịch vụ chỉ định không tồn tại hoặc đã ngừng hoạt động.');
    }

    const serviceMap = new Map(dentalServices.map((s) => [s.code, s]));

    await this.prisma.$transaction(async (tx) => {
      // Delete old services
      await tx.intakeService.deleteMany({
        where: { intakeId: intake.id },
      });

      // Create new services
      for (const item of dto.services) {
        const service = serviceMap.get(item.serviceCode)!;
        await tx.intakeService.create({
          data: {
            intakeId: intake.id,
            serviceId: service.id,
            quantity: item.quantity,
            unitPrice: service.price,
            amount: service.price * item.quantity,
          },
        });
      }

      // Update intake
      const nextStatus = intake.status === 'PAID' ? 'PAID' : 'READY';
      await tx.intake.update({
        where: { id: intake.id },
        data: {
          roomId: room.id,
          doctorId: doctor.id,
          priority: dto.priority,
          priorityReason: dto.priority === 'Ưu tiên' ? dto.priorityReason?.trim() : null,
          roomOverrideReason: !activeAssignment ? dto.roomOverrideReason?.trim() : null,
          status: nextStatus,
        },
      });

      if (!this.queueService) {
        throw new Error('ReceptionQueueService chưa được cấu hình.');
      }
      await this.queueService.issueTicket(
        { intakeId: intake.id, roomId: room.id, businessDate: clinicNow.date },
        actorId,
        tx,
      );
    });

    return this.getIntakeByCode(intakeCode);
  }

  async payCash(intakeCode: string, cashierId?: number) {
    const intake = await this.prisma.intake.findUnique({
      where: { code: intakeCode },
      include: { services: true, payments: true },
    });
    if (!intake) {
      throw new NotFoundException(`Không tìm thấy phiếu tiếp nhận ${intakeCode}.`);
    }
    if (intake.status === 'TRANSFERRED') {
      throw new BadRequestException('Hồ sơ đã bàn giao, không thể thực hiện thanh toán.');
    }
    if (intake.status === 'PAID') {
      throw new BadRequestException('Phiếu tiếp nhận này đã được thanh toán.');
    }
    if (intake.services.length === 0) {
      throw new BadRequestException('Phiếu khám chưa có dịch vụ nào để thanh toán.');
    }

    const totalAmount = intake.services.reduce((sum, item) => sum + item.amount, 0);
    const now = new Date();
    const orderId = `CASH-${intake.code}-${now.getTime()}`;
    const requestId = `REQ-CASH-${intake.code}-${now.getTime()}`;

    const payment = await this.prisma.$transaction(async (tx) => {
      const createdPayment = await tx.payment.create({
        data: {
          intakeId: intake.id,
          intakeCode: intake.code,
          orderId,
          requestId,
          partnerCode: 'CLINIC_CASHIER',
          method: 'CASH',
          status: 'PAID',
          amount: totalAmount,
          paidAt: now,
          createdById: cashierId,
        },
      });

      await tx.intake.update({
        where: { id: intake.id },
        data: { status: 'PAID' },
      });

      return createdPayment;
    });

    await this.accounting?.ingestReceptionPayment(
      payment.id,
      `reception-payment-${payment.id}-paid`,
    );

    return this.getIntakeByCode(intakeCode);
  }

  async transferIntake(intakeCode: string) {
    const intake = await this.prisma.intake.findUnique({
      where: { code: intakeCode },
    });
    if (!intake) {
      throw new NotFoundException(`Không tìm thấy phiếu tiếp nhận ${intakeCode}.`);
    }
    if (intake.status !== 'PAID') {
      throw new BadRequestException('Hồ sơ chưa hoàn tất thanh toán, không thể bàn giao cho bác sĩ.');
    }

    const now = new Date();
    await this.prisma.intake.update({
      where: { id: intake.id },
      data: {
        status: 'TRANSFERRED',
        transferredAt: now,
      },
    });

    return this.getIntakeByCode(intakeCode);
  }

  private async getIntakeByCode(code: string) {
    const intake = await this.prisma.intake.findUniqueOrThrow({
      where: { code },
      include: {
        patient: true,
        room: true,
        doctor: true,
        queueTicket: true,
        services: { include: { service: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const latestPayment = intake.payments[0];
    return {
      id: intake.code,
      patientId: intake.patient.code,
      symptoms: intake.symptoms,
      priority: intake.priority as 'Thường' | 'Ưu tiên',
      priorityReason: intake.priorityReason ?? undefined,
      roomOverrideReason: intake.roomOverrideReason ?? undefined,
      services: intake.services.map((s) => ({
        serviceId: s.service.code,
        quantity: s.quantity,
      })),
      roomId: intake.room?.code ?? '',
      doctorId: intake.doctor?.username ?? '',
      queueNumber: intake.queueTicket
        ? String(intake.queueTicket.queueNumber).padStart(4, '0')
        : undefined,
      queueDate: intake.queueTicket?.businessDate.toISOString().slice(0, 10),
      queueStatus: intake.queueTicket?.status,
      status: intake.status as 'DRAFT' | 'READY' | 'PAID' | 'TRANSFERRED',
      createdAt: intake.createdAt.toISOString(),
      transferredAt: intake.transferredAt ? intake.transferredAt.toISOString() : undefined,
      payment: latestPayment
        ? {
            method: latestPayment.method as 'CASH' | 'MOMO',
            status: latestPayment.status as 'PENDING' | 'PAID' | 'FAILED',
            orderId: latestPayment.orderId,
            paidAt: latestPayment.paidAt ? latestPayment.paidAt.toISOString() : undefined,
          }
        : undefined,
    };
  }

  async deletePatient(patientCode: string, deleteReason?: string, deletedBy?: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { code: patientCode },
      include: {
        intakes: {
          include: {
            services: true,
            payments: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException(`Không tìm thấy bệnh nhân ${patientCode} để xóa.`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Backup Patient to PatientDeleted
      await tx.patientDeleted.create({
        data: {
          originalId: patient.id,
          code: patient.code,
          fullName: patient.fullName,
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
          phone: patient.phone,
          address: patient.address,
          note: patient.note,
          createdAt: patient.createdAt,
          updatedAt: patient.updatedAt,
          deletedAt: now,
          deletedBy,
          deleteReason: deleteReason ?? 'Xóa hồ sơ bệnh nhân từ quầy tiếp nhận',
        },
      });

      // 2. Backup associated Intakes, Services, and Payments
      for (const intake of patient.intakes) {
        await tx.intakeDeleted.create({
          data: {
            originalId: intake.id,
            code: intake.code,
            patientId: intake.patientId,
            patientCode: patient.code,
            symptoms: intake.symptoms,
            priority: intake.priority,
            status: intake.status,
            roomId: intake.roomId,
            doctorId: intake.doctorId,
            createdById: intake.createdById,
            transferredAt: intake.transferredAt,
            createdAt: intake.createdAt,
            updatedAt: intake.updatedAt,
            deletedAt: now,
            deletedBy,
            deleteReason: deleteReason ?? `Xóa liên đới theo bệnh nhân ${patientCode}`,
          },
        });

        for (const service of intake.services) {
          await tx.intakeServiceDeleted.create({
            data: {
              originalId: service.id,
              intakeId: service.intakeId,
              serviceId: service.serviceId,
              quantity: service.quantity,
              unitPrice: service.unitPrice,
              amount: service.amount,
              createdAt: service.createdAt,
              updatedAt: service.updatedAt,
              deletedAt: now,
              deletedBy,
              deleteReason: deleteReason ?? `Xóa theo phiếu ${intake.code}`,
            },
          });
        }

        for (const payment of intake.payments) {
          await tx.paymentDeleted.create({
            data: {
              originalId: payment.id,
              intakeId: payment.intakeId,
              intakeCode: payment.intakeCode,
              orderId: payment.orderId,
              requestId: payment.requestId,
              partnerCode: payment.partnerCode,
              method: payment.method,
              status: payment.status,
              amount: payment.amount,
              gatewayPayload: payment.gatewayPayload,
              paidAt: payment.paidAt,
              createdById: payment.createdById,
              createdAt: payment.createdAt,
              updatedAt: payment.updatedAt,
              deletedAt: now,
              deletedBy,
              deleteReason: deleteReason ?? `Xóa theo phiếu ${intake.code}`,
            },
          });
        }

        // Delete intake payments & services, then intake
        await tx.payment.deleteMany({ where: { intakeId: intake.id } });
        await tx.intakeService.deleteMany({ where: { intakeId: intake.id } });
        await tx.intake.delete({ where: { id: intake.id } });
      }

      // 3. Delete Patient from live table
      await tx.patient.delete({ where: { id: patient.id } });
    });

    return {
      success: true,
      code: patientCode,
      message: `Đã xóa bệnh nhân ${patientCode} và lưu toàn bộ bản sao lưu vào bảng PatientDeleted`,
      deletedAt: now.toISOString(),
    };
  }

  async deleteIntake(intakeCode: string, deleteReason?: string, deletedBy?: string) {
    const intake = await this.prisma.intake.findUnique({
      where: { code: intakeCode },
      include: {
        patient: true,
        services: true,
        payments: true,
      },
    });

    if (!intake) {
      throw new NotFoundException(`Không tìm thấy phiếu tiếp nhận ${intakeCode} để xóa.`);
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      // 1. Backup Intake to IntakeDeleted
      await tx.intakeDeleted.create({
        data: {
          originalId: intake.id,
          code: intake.code,
          patientId: intake.patientId,
          patientCode: intake.patient?.code,
          symptoms: intake.symptoms,
          priority: intake.priority,
          status: intake.status,
          roomId: intake.roomId,
          doctorId: intake.doctorId,
          createdById: intake.createdById,
          transferredAt: intake.transferredAt,
          createdAt: intake.createdAt,
          updatedAt: intake.updatedAt,
          deletedAt: now,
          deletedBy,
          deleteReason: deleteReason ?? 'Xóa phiếu tiếp nhận từ quầy tiếp nhận',
        },
      });

      // 2. Backup Services to IntakeServiceDeleted
      for (const service of intake.services) {
        await tx.intakeServiceDeleted.create({
          data: {
            originalId: service.id,
            intakeId: service.intakeId,
            serviceId: service.serviceId,
            quantity: service.quantity,
            unitPrice: service.unitPrice,
            amount: service.amount,
            createdAt: service.createdAt,
            updatedAt: service.updatedAt,
            deletedAt: now,
            deletedBy,
            deleteReason: deleteReason ?? `Xóa theo phiếu ${intake.code}`,
          },
        });
      }

      // 3. Backup Payments to PaymentDeleted
      for (const payment of intake.payments) {
        await tx.paymentDeleted.create({
          data: {
            originalId: payment.id,
            intakeId: payment.intakeId,
            intakeCode: payment.intakeCode,
            orderId: payment.orderId,
            requestId: payment.requestId,
            partnerCode: payment.partnerCode,
            method: payment.method,
            status: payment.status,
            amount: payment.amount,
            gatewayPayload: payment.gatewayPayload,
            paidAt: payment.paidAt,
            createdById: payment.createdById,
            createdAt: payment.createdAt,
            updatedAt: payment.updatedAt,
            deletedAt: now,
            deletedBy,
            deleteReason: deleteReason ?? `Xóa theo phiếu ${intake.code}`,
          },
        });
      }

      // 4. Delete payments, services, and intake
      await tx.payment.deleteMany({ where: { intakeId: intake.id } });
      await tx.intakeService.deleteMany({ where: { intakeId: intake.id } });
      await tx.intake.delete({ where: { id: intake.id } });
    });

    return {
      success: true,
      code: intakeCode,
      message: `Đã xóa phiếu tiếp nhận ${intakeCode} và lưu bản sao lưu vào bảng IntakeDeleted`,
      deletedAt: now.toISOString(),
    };
  }

  async getDeletedBackups() {
    const [patients, intakes, payments] = await Promise.all([
      this.prisma.patientDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
      this.prisma.intakeDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
      this.prisma.paymentDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
    ]);

    return {
      patients,
      intakes,
      payments,
    };
  }
}
