import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../infrastructure/database/prisma.service.js';
import { WarehouseServiceStub } from './stubs/warehouse-stub.service.js';
import { AccountingServiceStub } from './stubs/accounting-stub.service.js';
import type { CancelExaminationDto, UnlockExaminationDto, UpdateResultDto, UpdateSuppliesDto } from './dto/doctor.dto.js';
import { DoctorQueueService } from './doctor-queue.service.js';

@Injectable()
export class DoctorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly warehouseStub: WarehouseServiceStub,
    private readonly accountingStub: AccountingServiceStub,
    private readonly queueService: DoctorQueueService,
  ) {}

  /**
   * Lấy danh sách phòng khám hoạt động.
   */
  async getRooms() {
    return this.prisma.clinicRoom.findMany({
      where: { isActive: true },
      orderBy: { code: 'asc' },
    });
  }

  async getWaitingQueue(doctorId: number) {
    return this.queueService.getQueue(doctorId);
  }

  /**
   * Lấy ca khám đang diễn ra của bác sĩ (nếu có).
   */
  async getCurrentExamining(doctorId: number) {
    const exam = await this.prisma.doctorExamination.findFirst({
      where: {
        doctorId,
        status: 'IN_PROGRESS',
      },
      include: {
        patient: true,
        room: true,
        intake: {
          include: {
            services: { include: { service: true } },
          },
        },
        supplies: {
          include: { supply: true },
        },
        result: true,
        printHistories: {
          orderBy: { printedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!exam) return null;
    return this.formatExaminationDetail(exam);
  }

  /**
   * Bước 1: Nút "Gọi STT tiếp theo"
   * - CHẶN khi bác sĩ đã có bệnh nhân ở trạng thái Đang khám.
   * - Sau khi gọi: tạo DoctorExamination, cập nhật Intake.status sang IN_PROGRESS.
   */
  async callNextPatient(doctorId: number, actorId = doctorId) {
    const called = await this.queueService.callNext(doctorId, actorId);
    if (!called.nextExaminationId) return { ...called, nextExamination: null };
    return { ...called, nextExamination: await this.getExaminationById(called.nextExaminationId) };
  }

  async markAbsent(examinationId: number, doctorId: number, actorId = doctorId) {
    const result = await this.queueService.markAbsent(examinationId, doctorId, actorId);
    const absent = await this.prisma.doctorExamination.findUnique({
      where: { id: result.absentExaminationId },
      include: { intake: { include: { services: { include: { service: true } } } } },
    });
    if (!absent) throw new NotFoundException(`Không tìm thấy ca khám #${examinationId}.`);
    await this.accountingStub.enqueueJournalEntry({
      examinationId: absent.id,
      examinationCode: absent.code,
      patientId: absent.patientId,
      intakeId: absent.intakeId,
      intakeCode: absent.intake.code,
      doctorId: absent.doctorId,
      roomId: absent.roomId,
      completedAt: absent.completedAt ?? new Date(),
      serviceRevenue: 0,
      supplyCost: 0,
      isCancelled: true,
      serviceLines: absent.intake.services.map((item) => ({
        intakeServiceId: item.id,
        serviceId: item.serviceId,
        serviceType: item.service.serviceType,
        revenue: 0,
        taxRate: Number(item.service.defaultTaxRate ?? 0),
        taxClassification: item.service.taxClassification ?? undefined,
        supplyCost: 0,
      })),
    });
    return {
      absentExamination: await this.getExaminationById(result.absentExaminationId),
      nextExamination: result.nextExaminationId
        ? await this.getExaminationById(result.nextExaminationId)
        : null,
      message: result.nextExaminationId ? result.message : 'Không còn bệnh nhân chờ',
    };
  }

  /**
   * Bước 2: Danh mục VTYT (10 loại vật tư mẫu)
   * TUYỆT ĐỐI KHÔNG HIỂN THỊ GIÁ CHO BÁC SĨ.
   */
  async getSuppliesCatalog() {
    const supplies = await this.prisma.medicalSupply.findMany({
      where: { isActive: true, group: { in: ['THUONG', 'VO_CAM'] } },
      orderBy: [{ group: 'asc' }, { id: 'asc' }],
    });

    return supplies.map((s) => ({
      id: s.code,
      name: s.name,
      group: s.group as 'THUONG' | 'VO_CAM',
      baseUnit: s.baseUnit,
      conversionUnit: s.conversionUnit,
      conversionRate: s.conversionRate,
      inStock: s.inStock,
    }));
  }

  /**
   * Bước 2: Cập nhật VTYT sử dụng trong lúc khám
   * - Kiểm tra tồn kho trước khi cho nhập
   * - Giữ chỗ tồn kho (reservation)
   * - Chặn sửa/xóa nếu đã Ghi sổ
   */
  async updateSupplies(examinationId: number, dto: UpdateSuppliesDto) {
    const exam = await this.prisma.doctorExamination.findUnique({
      where: { id: examinationId },
      include: { intake: { include: { services: true } } },
    });
    if (!exam) {
      throw new NotFoundException(`Không tìm thấy ca khám #${examinationId}.`);
    }
    if (exam.isLocked || exam.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Hồ sơ khám đã Ghi sổ hoặc đã kết thúc, không thể chỉnh sửa vật tư.');
    }

    const intakeServiceIds = new Set(exam.intake.services.map((service) => service.id));
    if (dto.supplies.some((item) => !intakeServiceIds.has(item.intakeServiceId))) {
      throw new BadRequestException('Vật tư phải được gắn với một dòng dịch vụ của ca khám.');
    }

    // 1. Kiểm tra từng vật tư và tồn kho qua Warehouse Stub
    const supplyCodes = dto.supplies.map((s) => s.supplyCode);
    const dbSupplies = await this.prisma.medicalSupply.findMany({
      where: { code: { in: supplyCodes }, isActive: true },
    });
    const supplyMap = new Map(dbSupplies.map((s) => [s.code, s]));

    for (const item of dto.supplies) {
      const supply = supplyMap.get(item.supplyCode);
      if (!supply) {
        throw new NotFoundException(`Vật tư y tế ${item.supplyCode} không tồn tại.`);
      }
      if (item.quantityInBaseUnit <= 0) {
        throw new BadRequestException(`Số lượng cho ${supply.name} phải lớn hơn 0.`);
      }

      const stockCheck = await this.warehouseStub.checkStock(supply.code, item.quantityInBaseUnit);
      if (!stockCheck.available) {
        throw new BadRequestException(
          `Không đủ tồn kho cho ${supply.name}. Yêu cầu: ${item.quantityInBaseUnit} ${supply.baseUnit}, hiện có: ${stockCheck.currentStock} ${supply.baseUnit}.`,
        );
      }
    }

    // 2. Transaction: hoàn trả giữ chỗ cũ, xóa dòng cũ, giữ chỗ mới, tạo dòng mới
    await this.prisma.$transaction(async (tx) => {
      // Release old reservations
      await tx.supplyReservation.updateMany({
        where: { examinationId, status: 'RESERVED' },
        data: { status: 'RELEASED' },
      });

      // Delete old examination supplies
      await tx.examinationSupply.deleteMany({
        where: { examinationId },
      });

      // Create new examination supplies & reservations
      for (const item of dto.supplies) {
        const supply = supplyMap.get(item.supplyCode)!;
        await tx.examinationSupply.create({
          data: {
            examinationId,
            supplyId: supply.id,
            intakeServiceId: item.intakeServiceId,
            conversionUnitUsed: item.conversionUnitUsed ?? null,
            quantityInBaseUnit: item.quantityInBaseUnit,
            costPriceSnapshot: supply.costPrice,
          },
        });

        await tx.supplyReservation.create({
          data: {
            examinationId,
            supplyId: supply.id,
            quantity: item.quantityInBaseUnit,
            status: 'RESERVED',
          },
        });
      }
    });

    return this.getExaminationById(examinationId);
  }

  /**
   * Bước 3: Cập nhật kết quả tổng kết (Tóm tắt, Phương pháp, Hướng điều trị, Ngày hẹn)
   */
  async updateResult(examinationId: number, dto: UpdateResultDto) {
    const exam = await this.prisma.doctorExamination.findUnique({
      where: { id: examinationId },
    });
    if (!exam) {
      throw new NotFoundException(`Không tìm thấy ca khám #${examinationId}.`);
    }
    if (exam.isLocked || exam.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Hồ sơ khám đã Ghi sổ hoặc đã kết thúc, không thể chỉnh sửa kết quả.');
    }

    const nextDate = dto.nextAppointmentDate ? new Date(dto.nextAppointmentDate) : null;

    const result = await this.prisma.examinationResult.upsert({
      where: { examinationId },
      update: {
        summary: dto.summary,
        treatmentMethod: dto.treatmentMethod,
        treatmentOrientation: dto.treatmentOrientation,
        nextAppointmentDate: nextDate,
      },
      create: {
        examinationId,
        summary: dto.summary,
        treatmentMethod: dto.treatmentMethod,
        treatmentOrientation: dto.treatmentOrientation,
        nextAppointmentDate: nextDate,
      },
    });

    return result;
  }

  /**
   * Bước 3: Ghi nhận lịch sử in phiếu kết quả tổng kết
   */
  async recordPrintHistory(examinationId: number, printedById?: number) {
    const exam = await this.getExaminationById(examinationId);
    const contentSnapshot = JSON.stringify(exam);

    const history = await this.prisma.examinationPrintHistory.create({
      data: {
        examinationId,
        printedById,
        printedAt: new Date(),
        contentSnapshot,
      },
    });

    return {
      success: true,
      printedAt: history.printedAt.toISOString(),
      historyId: history.id,
    };
  }

  /**
   * Bước 4: Ghi sổ (Trường hợp khám bình thường)
   * - Chuyển trạng thái sang Hoàn thành (COMPLETED).
   * - Trừ kho chính thức via WarehouseStub.
   * - Chuyển sang /accounting: Doanh thu dịch vụ (thu) + Giá vốn VTYT tiêu hao (chi).
   * - Khóa hồ sơ (isLocked = true).
   */
  async completeExamination(examinationId: number) {
    const exam = await this.prisma.doctorExamination.findUnique({
      where: { id: examinationId },
      include: {
        intake: {
          include: {
            services: { include: { service: true } },
          },
        },
        supplies: true,
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy ca khám #${examinationId}.`);
    }
    if (exam.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Ca khám không ở trạng thái Đang khám, không thể hoàn thành.');
    }

    const now = new Date();

    // 1. Tính toán tài chính
    // Doanh thu dịch vụ từ quầy tiếp nhận
    const serviceRevenue = exam.intake.services.reduce((sum, item) => sum + item.amount, 0);
    // Giá vốn VTYT tiêu hao nội bộ
    const supplyCost = exam.supplies.reduce(
      (sum, item) => sum + item.costPriceSnapshot * item.quantityInBaseUnit,
      0,
    );

    // 2. Trừ kho chính thức qua WarehouseStub
    await this.warehouseStub.deductStock(examinationId);

    // 3. Đẩy bút toán sang Accounting Outbox
    await this.accountingStub.enqueueJournalEntry({
      examinationId: exam.id,
      examinationCode: exam.code,
      patientId: exam.patientId,
      intakeId: exam.intakeId,
      intakeCode: exam.intake.code,
      doctorId: exam.doctorId,
      roomId: exam.roomId,
      completedAt: now,
      serviceRevenue,
      supplyCost,
      isCancelled: false,
      serviceLines: exam.intake.services.map((item) => ({
        intakeServiceId: item.id,
        serviceId: item.serviceId,
        serviceType: item.service.serviceType,
        revenue: item.amount,
        taxRate: Number(item.service.defaultTaxRate ?? 0),
        taxClassification: item.service.taxClassification ?? undefined,
        supplyCost: exam.supplies
          .filter((supply) => supply.intakeServiceId === item.id)
          .reduce((sum, supply) => sum + supply.costPriceSnapshot * supply.quantityInBaseUnit, 0),
      })),
    });

    // 4. Khóa và đổi trạng thái trong DB
    await this.prisma.$transaction([
      this.prisma.doctorExamination.update({
        where: { id: exam.id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
          isLocked: true,
        },
      }),
      this.prisma.intake.update({
        where: { id: exam.intakeId },
        data: { status: 'COMPLETED' },
      }),
    ]);

    return this.getExaminationById(examinationId);
  }

  /**
   * Nút Từ chối (Ngừng khám) ở thanh thao tác chung
   * Khả dụng ở mọi bước, BẮT BUỘC nhập lý do.
   * - Doanh thu dịch vụ = 0.
   * - Giá vốn VTYT = giá vốn VTYT thực tế đã dùng (nếu có).
   * - Trừ kho VTYT đã dùng, giải phóng giữ chỗ chưa dùng.
   * - Khóa hồ sơ (isLocked = true).
   */
  async cancelExamination(examinationId: number, dto: CancelExaminationDto) {
    if (!dto.reason || !dto.reason.trim()) {
      throw new BadRequestException('Bắt buộc phải nhập lý do khi ngừng khám / từ chối.');
    }

    const exam = await this.prisma.doctorExamination.findUnique({
      where: { id: examinationId },
      include: {
        intake: { include: { services: { include: { service: true } } } },
        supplies: true,
      },
    });

    if (!exam) {
      throw new NotFoundException(`Không tìm thấy ca khám #${examinationId}.`);
    }
    if (exam.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Ca khám không ở trạng thái Đang khám, không thể ngừng khám.');
    }

    const now = new Date();

    // 1. Trừ kho số VTYT đã dùng (nếu có)
    await this.warehouseStub.deductStock(examinationId);

    // 2. Tính giá vốn VTYT tiêu hao (nếu có)
    const supplyCost = exam.supplies.reduce(
      (sum, item) => sum + item.costPriceSnapshot * item.quantityInBaseUnit,
      0,
    );

    // 3. Đẩy bút toán sang Accounting Outbox: Doanh thu = 0, Chi phí VTYT = supplyCost
    await this.accountingStub.enqueueJournalEntry({
      examinationId: exam.id,
      examinationCode: exam.code,
      patientId: exam.patientId,
      intakeId: exam.intakeId,
      intakeCode: exam.intake.code,
      doctorId: exam.doctorId,
      roomId: exam.roomId,
      completedAt: now,
      serviceRevenue: 0,
      supplyCost,
      isCancelled: true,
      serviceLines: exam.intake.services.map((item) => ({
        intakeServiceId: item.id,
        serviceId: item.serviceId,
        serviceType: item.service.serviceType,
        revenue: 0,
        taxRate: Number(item.service.defaultTaxRate ?? 0),
        taxClassification: item.service.taxClassification ?? undefined,
        supplyCost: exam.supplies
          .filter((supply) => supply.intakeServiceId === item.id)
          .reduce((sum, supply) => sum + supply.costPriceSnapshot * supply.quantityInBaseUnit, 0),
      })),
    });

    // 4. Khóa và đổi trạng thái sang CANCELLED
    await this.prisma.$transaction([
      this.prisma.doctorExamination.update({
        where: { id: exam.id },
        data: {
          status: 'CANCELLED',
          cancelReason: dto.reason.trim(),
          completedAt: now,
          isLocked: true,
        },
      }),
      this.prisma.intake.update({
        where: { id: exam.intakeId },
        data: { status: 'CANCELLED' },
      }),
    ]);

    return this.getExaminationById(examinationId);
  }

  /**
   * Mở khóa hồ sơ (Dành riêng cho Quản trị viên / Trưởng khoa).
   * Mọi thao tác đều lưu vết vào ExaminationAuditLog.
   */
  async unlockExamination(examinationId: number, dto: UnlockExaminationDto, actorId: number) {
    const exam = await this.prisma.doctorExamination.findUnique({
      where: { id: examinationId },
    });
    if (!exam) {
      throw new NotFoundException(`Không tìm thấy ca khám #${examinationId}.`);
    }

    await this.accountingStub.enqueueReversal({
      examinationId,
      examinationCode: exam.code,
      reason: dto.reason,
      actorId,
    });

    await this.prisma.$transaction([
      this.prisma.doctorExamination.update({
        where: { id: examinationId },
        data: { isLocked: false },
      }),
      this.prisma.examinationAuditLog.create({
        data: {
          examinationId,
          action: 'UNLOCK',
          actorId,
          reason: dto.reason,
          changesJson: JSON.stringify({ isLockedBefore: true, isLockedAfter: false }),
        },
      }),
    ]);

    return {
      success: true,
      message: `Đã mở khóa ca khám ${exam.code} thành công.`,
    };
  }

  async getExaminationById(id: number) {
    const exam = await this.prisma.doctorExamination.findUniqueOrThrow({
      where: { id },
      include: {
        patient: true,
        room: true,
        intake: {
          include: {
            services: { include: { service: true } },
          },
        },
        supplies: {
          include: { supply: true },
        },
        result: true,
        printHistories: {
          orderBy: { printedAt: 'desc' },
          take: 5,
        },
      },
    });

    return this.formatExaminationDetail(exam);
  }

  private formatExaminationDetail(exam: any) {
    return {
      id: exam.id,
      code: exam.code,
      status: exam.status,
      isLocked: exam.isLocked,
      startedAt: exam.startedAt.toISOString(),
      completedAt: exam.completedAt ? exam.completedAt.toISOString() : undefined,
      cancelReason: exam.cancelReason ?? undefined,
      patient: {
        code: exam.patient.code,
        fullName: exam.patient.fullName,
        dateOfBirth: exam.patient.dateOfBirth.toISOString().split('T')[0],
        gender: exam.patient.gender,
        phone: exam.patient.phone,
        address: exam.patient.address ?? '',
        note: exam.patient.note ?? '',
      },
      intake: {
        code: exam.intake.code,
        symptoms: exam.intake.symptoms,
        priority: exam.intake.priority,
        roomCode: exam.room.code,
        roomName: exam.room.name,
        services: exam.intake.services.map((s: any) => ({
          intakeServiceId: s.id,
          code: s.service.code,
          name: s.service.name,
          quantity: s.quantity,
          unit: s.service.unit,
        })),
      },
      supplies: exam.supplies.map((s: any) => ({
        id: s.id,
        intakeServiceId: s.intakeServiceId,
        supplyCode: s.supply.code,
        supplyName: s.supply.name,
        group: s.supply.group,
        baseUnit: s.supply.baseUnit,
        conversionUnitUsed: s.conversionUnitUsed,
        quantityInBaseUnit: s.quantityInBaseUnit,
      })),
      result: exam.result
        ? {
            summary: exam.result.summary,
            treatmentMethod: exam.result.treatmentMethod,
            treatmentOrientation: exam.result.treatmentOrientation,
            nextAppointmentDate: exam.result.nextAppointmentDate
              ? exam.result.nextAppointmentDate.toISOString().split('T')[0]
              : undefined,
          }
        : undefined,
      printHistories: exam.printHistories.map((h: any) => ({
        id: h.id,
        printedAt: h.printedAt.toISOString(),
      })),
    };
  }

  /**
   * Tra cứu các bản ghi đã xóa được sao lưu trong các bảng *Deleted của phân hệ Bác sĩ
   */
  async getDeletedBackups() {
    const [examinations, supplies, reservations, results, prints, outboxes, auditLogs] =
      await Promise.all([
        this.prisma.doctorExaminationDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
        this.prisma.examinationSupplyDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
        this.prisma.supplyReservationDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
        this.prisma.examinationResultDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
        this.prisma.examinationPrintHistoryDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
        this.prisma.accountingOutboxDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
        this.prisma.examinationAuditLogDeleted.findMany({ orderBy: { deletedAt: 'desc' }, take: 50 }),
      ]);

    return {
      examinations,
      supplies,
      reservations,
      results,
      prints,
      outboxes,
      auditLogs,
    };
  }
}
