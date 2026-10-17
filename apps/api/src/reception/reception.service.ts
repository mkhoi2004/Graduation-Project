import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import type { CreatePatientDto, UpdatePatientDto } from './dto/patient.dto.js';
import type { CreateIntakeDto, UpdateIntakeServicesDto } from './dto/intake.dto.js';

function dateStamp(date = new Date()): string {
  const year = date.getFullYear();
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${day}${month}`;
}

@Injectable()
export class ReceptionService {
  constructor(private readonly prisma: PrismaService) {}

  async getMasterData() {
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
        select: { id: true, username: true, fullName: true },
        orderBy: { id: 'asc' },
      }),
    ]);

    return {
      rooms: rooms.map((r) => ({ id: r.code, name: r.name, description: r.description })),
      services: services.map((s) => ({
        id: s.code,
        category: s.category,
        name: s.name,
        price: s.price,
        unit: s.unit,
      })),
      doctors: doctorUsers.map((d) => ({
        id: d.username,
        name: d.fullName,
        specialty: 'Nha khoa chuyên sâu',
      })),
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

  async getIntakes() {
    const intakes = await this.prisma.intake.findMany({
      include: {
        patient: true,
        room: true,
        doctor: true,
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

    return intakes.map((intake) => {
      const latestPayment = intake.payments[0];
      return {
        id: intake.code,
        patientId: intake.patient.code,
        symptoms: intake.symptoms,
        priority: intake.priority as 'Thường' | 'Ưu tiên' | 'Khẩn cấp',
        services: intake.services.map((s) => ({
          serviceId: s.service.code,
          quantity: s.quantity,
        })),
        roomId: intake.room?.code ?? '',
        doctorId: intake.doctor?.username ?? '',
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

  async createIntake(dto: CreateIntakeDto, userId?: number) {
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
        status: 'DRAFT',
        createdById: userId,
      },
    });

    return {
      id: intake.code,
      patientId: patient.code,
      symptoms: intake.symptoms,
      priority: intake.priority as 'Thường' | 'Ưu tiên' | 'Khẩn cấp',
      services: [],
      roomId: '',
      doctorId: '',
      status: intake.status as 'DRAFT',
      createdAt: intake.createdAt.toISOString(),
    };
  }

  async updateIntakeServices(intakeCode: string, dto: UpdateIntakeServicesDto) {
    const intake = await this.prisma.intake.findUnique({
      where: { code: intakeCode },
      include: { services: true },
    });
    if (!intake) {
      throw new NotFoundException(`Không tìm thấy phiếu tiếp nhận ${intakeCode}.`);
    }
    if (intake.status === 'TRANSFERRED') {
      throw new BadRequestException('Hồ sơ đã bàn giao cho bác sĩ, không thể sửa đổi dịch vụ.');
    }

    const room = await this.prisma.clinicRoom.findUnique({
      where: { code: dto.roomCode },
    });
    if (!room) {
      throw new NotFoundException(`Không tìm thấy phòng khám với mã ${dto.roomCode}.`);
    }

    const doctor = await this.prisma.user.findUnique({
      where: { username: dto.doctorUsername },
      include: { role: true },
    });
    if (!doctor || doctor.role.code !== 'DOCTOR') {
      throw new NotFoundException(`Không tìm thấy bác sĩ với tài khoản ${dto.doctorUsername}.`);
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
          status: nextStatus,
        },
      });
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

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
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
    });

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
        services: { include: { service: true } },
        payments: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const latestPayment = intake.payments[0];
    return {
      id: intake.code,
      patientId: intake.patient.code,
      symptoms: intake.symptoms,
      priority: intake.priority as 'Thường' | 'Ưu tiên' | 'Khẩn cấp',
      services: intake.services.map((s) => ({
        serviceId: s.service.code,
        quantity: s.quantity,
      })),
      roomId: intake.room?.code ?? '',
      doctorId: intake.doctor?.username ?? '',
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
