import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DoctorService } from './doctor.service.js';
import type { PrismaService } from '../infrastructure/database/prisma.service.js';
import type { WarehouseServiceStub } from './stubs/warehouse-stub.service.js';
import type { AccountingServiceStub } from './stubs/accounting-stub.service.js';

describe('DoctorService', () => {
  let service: DoctorService;
  let mockPrisma: any;
  let mockWarehouseStub: any;
  let mockAccountingStub: any;

  beforeEach(() => {
    mockPrisma = {
      clinicRoom: {
        findMany: vi.fn(),
      },
      intake: {
        findMany: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        update: vi.fn(),
      },
      doctorExamination: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      medicalSupply: {
        findMany: vi.fn(),
      },
      examinationSupply: {
        create: vi.fn(),
        deleteMany: vi.fn(),
      },
      supplyReservation: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      examinationResult: {
        upsert: vi.fn(),
      },
      examinationPrintHistory: {
        create: vi.fn(),
      },
      examinationAuditLog: {
        create: vi.fn(),
      },
      doctorExaminationDeleted: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      examinationSupplyDeleted: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      supplyReservationDeleted: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      examinationResultDeleted: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      examinationPrintHistoryDeleted: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      accountingOutboxDeleted: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      examinationAuditLogDeleted: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (arg: any) => {
        if (typeof arg === 'function') {
          return arg(mockPrisma);
        }
        return Promise.all(arg);
      }),
    };

    mockWarehouseStub = {
      checkStock: vi.fn().mockResolvedValue({ available: true, currentStock: 100 }),
      reserveStock: vi.fn().mockResolvedValue({ success: true }),
      deductStock: vi.fn().mockResolvedValue({ success: true }),
      releaseStock: vi.fn().mockResolvedValue({ success: true }),
    };

    mockAccountingStub = {
      enqueueJournalEntry: vi.fn().mockResolvedValue({ id: 1, status: 'PENDING' }),
      enqueueReversal: vi.fn().mockResolvedValue({ eventId: 2, status: 'PENDING' }),
    };

    service = new DoctorService(
      mockPrisma as unknown as PrismaService,
      mockWarehouseStub as unknown as WarehouseServiceStub,
      mockAccountingStub as unknown as AccountingServiceStub,
    );
  });

  describe('getWaitingQueue', () => {
    it('sorts queue by priority (Khẩn cấp > Ưu tiên > Thường) and transferred time', async () => {
      const now = new Date();
      mockPrisma.intake.findMany.mockResolvedValue([
        {
          id: 1,
          code: 'TN20261018/0001',
          priority: 'Thường',
          transferredAt: new Date(now.getTime() - 10000),
          createdAt: now,
          patient: { code: 'BN001', fullName: 'Nguyễn Văn A', dateOfBirth: new Date('1990-01-01'), gender: 'Nam', phone: '0901' },
          room: { code: 'room-01', name: 'Phòng 01' },
          services: [],
        },
        {
          id: 2,
          code: 'TN20261018/0002',
          priority: 'Khẩn cấp',
          transferredAt: new Date(now.getTime() - 5000),
          createdAt: now,
          patient: { code: 'BN002', fullName: 'Trần Thị B', dateOfBirth: new Date('1995-02-02'), gender: 'Nữ', phone: '0902' },
          room: { code: 'room-01', name: 'Phòng 01' },
          services: [],
        },
        {
          id: 3,
          code: 'TN20261018/0003',
          priority: 'Ưu tiên',
          transferredAt: new Date(now.getTime() - 8000),
          createdAt: now,
          patient: { code: 'BN003', fullName: 'Lê Văn C', dateOfBirth: new Date('1985-03-03'), gender: 'Nam', phone: '0903' },
          room: { code: 'room-01', name: 'Phòng 01' },
          services: [],
        },
      ]);

      const queue = await service.getWaitingQueue(1, 'room-01');

      expect(queue).toHaveLength(3);
      expect(queue[0].id).toBe('TN20261018/0002'); // Khẩn cấp
      expect(queue[0].priority).toBe('Khẩn cấp');
      expect(queue[1].id).toBe('TN20261018/0003'); // Ưu tiên
      expect(queue[2].id).toBe('TN20261018/0001'); // Thường
    });
  });

  describe('callNextPatient', () => {
    it('blocks call if doctor already has an IN_PROGRESS examination', async () => {
      mockPrisma.doctorExamination.findFirst.mockResolvedValue({
        id: 10,
        status: 'IN_PROGRESS',
        doctorId: 1,
      });

      await expect(service.callNextPatient(1, 'room-01')).rejects.toThrow(BadRequestException);
    });

    it('throws if queue is empty', async () => {
      mockPrisma.doctorExamination.findFirst.mockResolvedValue(null);
      mockPrisma.intake.findMany.mockResolvedValue([]);

      await expect(service.callNextPatient(1, 'room-01')).rejects.toThrow(BadRequestException);
    });

    it('creates examination and marks intake as IN_PROGRESS', async () => {
      mockPrisma.doctorExamination.findFirst.mockResolvedValue(null);
      const intakeData = {
        id: 100,
        code: 'TN20261018/0001',
        patientId: 5,
        roomId: 1,
        priority: 'Thường',
        transferredAt: new Date(),
        createdAt: new Date(),
        patient: { code: 'BN001', fullName: 'Nguyễn Văn A', dateOfBirth: new Date('1990-01-01'), gender: 'Nam', phone: '0901' },
        room: { code: 'room-01', name: 'Phòng 01' },
        services: [],
      };
      mockPrisma.intake.findMany.mockResolvedValue([intakeData]);
      mockPrisma.intake.findUniqueOrThrow.mockResolvedValue(intakeData);
      mockPrisma.doctorExamination.findMany.mockResolvedValue([]);
      mockPrisma.doctorExamination.create.mockResolvedValue({
        id: 77,
        code: 'PKB20261810/0001',
      });
      mockPrisma.doctorExamination.findUniqueOrThrow.mockResolvedValue({
        id: 77,
        code: 'PKB20261810/0001',
        status: 'IN_PROGRESS',
        isLocked: false,
        startedAt: new Date(),
        patient: intakeData.patient,
        room: intakeData.room,
        intake: { code: intakeData.code, symptoms: 'Đau răng', priority: 'Thường', services: [] },
        supplies: [],
        result: null,
        printHistories: [],
      });

      const exam = await service.callNextPatient(1, 'room-01');

      expect(exam.id).toBe(77);
      expect(mockPrisma.intake.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 100 },
          data: { status: 'IN_PROGRESS' },
        }),
      );
    });
  });

  describe('getSuppliesCatalog', () => {
    it('returns catalog without exposing costPrice to doctor', async () => {
      mockPrisma.medicalSupply.findMany.mockResolvedValue([
        {
          id: 1,
          code: 'needle-septoject',
          name: 'Kim tiêm nha khoa Septoject',
          group: 'VO_CAM',
          baseUnit: 'Kim',
          conversionUnit: 'Hộp',
          conversionRate: 100,
          costPrice: 2500, // Confidential
          inStock: 500,
          isActive: true,
        },
      ]);

      const catalog = await service.getSuppliesCatalog();

      expect(catalog).toHaveLength(1);
      expect(catalog[0].id).toBe('needle-septoject');
      expect((catalog[0] as any).costPrice).toBeUndefined();
    });
  });

  describe('updateSupplies', () => {
    it('requires every consumed supply to identify an intake service line', async () => {
      mockPrisma.doctorExamination.findUnique.mockResolvedValue({ id: 1, intakeId: 10, isLocked: false, status: 'IN_PROGRESS', intake: { services: [{ id: 11 }] } });

      await expect(
        service.updateSupplies(1, { supplies: [{ supplyCode: 'glove-vglove', quantityInBaseUnit: 2 }] }),
      ).rejects.toThrow('Vật tư phải được gắn với một dòng dịch vụ');
    });

    it('blocks update if examination is already locked', async () => {
      mockPrisma.doctorExamination.findUnique.mockResolvedValue({
        id: 1,
        isLocked: true,
        status: 'COMPLETED',
      });

      await expect(
        service.updateSupplies(1, { supplies: [{ supplyCode: 'glove-vglove', quantityInBaseUnit: 2 }] }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects update if requested quantity exceeds stock', async () => {
      mockPrisma.doctorExamination.findUnique.mockResolvedValue({
        id: 1,
        intakeId: 10,
        isLocked: false,
        status: 'IN_PROGRESS',
        intake: { services: [{ id: 11 }] },
      });
      mockPrisma.medicalSupply.findMany.mockResolvedValue([
        { id: 1, code: 'glove-vglove', name: 'Găng tay', baseUnit: 'Đôi', costPrice: 2000 },
      ]);
      mockWarehouseStub.checkStock.mockResolvedValue({ available: false, currentStock: 1 });

      await expect(
        service.updateSupplies(1, { supplies: [{ supplyCode: 'glove-vglove', quantityInBaseUnit: 5, intakeServiceId: 11 }] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('completeExamination', () => {
    it('deducts stock, sends journal entry to accounting stub, and locks record', async () => {
      mockPrisma.doctorExamination.findUnique.mockResolvedValue({
        id: 1,
        code: 'PKB20261810/0001',
        status: 'IN_PROGRESS',
        intakeId: 10,
        patientId: 20,
        doctorId: 30,
        roomId: 40,
        intake: {
          code: 'TN001',
          services: [{ id: 11, serviceId: 21, amount: 400000, service: { serviceType: 'TREATMENT', taxClassification: null, defaultTaxRate: null } }],
        },
        supplies: [
          { supplyId: 1, intakeServiceId: 11, costPriceSnapshot: 2000, quantityInBaseUnit: 2 },
        ],
      });
      mockPrisma.doctorExamination.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        code: 'PKB20261810/0001',
        status: 'COMPLETED',
        isLocked: true,
        startedAt: new Date(),
        completedAt: new Date(),
        patient: { code: 'BN001', fullName: 'Nguyễn Văn A', dateOfBirth: new Date(), gender: 'Nam', phone: '0901' },
        room: { code: 'room-01', name: 'Phòng 01' },
        intake: { code: 'TN001', symptoms: '', priority: 'Thường', services: [] },
        supplies: [],
        result: null,
        printHistories: [],
      });

      const res = await service.completeExamination(1);

      expect(mockWarehouseStub.deductStock).toHaveBeenCalledWith(1);
      expect(mockAccountingStub.enqueueJournalEntry).toHaveBeenCalledWith(expect.objectContaining({
        examinationId: 1,
        examinationCode: 'PKB20261810/0001',
        serviceRevenue: 400000,
        supplyCost: 4000,
        isCancelled: false,
        patientId: 20,
        intakeId: 10,
        intakeCode: 'TN001',
        doctorId: 30,
        roomId: 40,
        serviceLines: [expect.objectContaining({ intakeServiceId: 11, serviceId: 21, revenue: 400000, supplyCost: 4000 })],
      }));
      expect(res.status).toBe('COMPLETED');
    });
  });

  describe('cancelExamination', () => {
    it('requires a reason and sets revenue to 0 in accounting outbox', async () => {
      await expect(service.cancelExamination(1, { reason: '' })).rejects.toThrow(BadRequestException);

      mockPrisma.doctorExamination.findUnique.mockResolvedValue({
        id: 1,
        code: 'PKB20261810/0001',
        status: 'IN_PROGRESS',
        intakeId: 10,
        patientId: 20,
        doctorId: 30,
        roomId: 40,
        intake: { code: 'TN001', services: [{ id: 11, serviceId: 21, amount: 400000, service: { serviceType: 'TREATMENT', taxClassification: null, defaultTaxRate: null } }] },
        supplies: [
          { supplyId: 1, intakeServiceId: 11, costPriceSnapshot: 2000, quantityInBaseUnit: 1 },
        ],
      });
      mockPrisma.doctorExamination.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        code: 'PKB20261810/0001',
        status: 'CANCELLED',
        cancelReason: 'Bệnh nhân bỏ về',
        isLocked: true,
        startedAt: new Date(),
        completedAt: new Date(),
        patient: { code: 'BN001', fullName: 'Nguyễn Văn A', dateOfBirth: new Date(), gender: 'Nam', phone: '0901' },
        room: { code: 'room-01', name: 'Phòng 01' },
        intake: { code: 'TN001', symptoms: '', priority: 'Thường', services: [] },
        supplies: [],
        result: null,
        printHistories: [],
      });

      const res = await service.cancelExamination(1, { reason: 'Bệnh nhân bỏ về' });

      expect(mockAccountingStub.enqueueJournalEntry).toHaveBeenCalledWith(expect.objectContaining({
        examinationId: 1,
        examinationCode: 'PKB20261810/0001',
        serviceRevenue: 0,
        supplyCost: 2000,
        isCancelled: true,
        serviceLines: [expect.objectContaining({ intakeServiceId: 11, revenue: 0, supplyCost: 2000 })],
      }));
      expect(res.status).toBe('CANCELLED');
    });
  });

  describe('unlockExamination', () => {
    it('unlocks examination and records audit log', async () => {
      mockPrisma.doctorExamination.findUnique.mockResolvedValue({
        id: 1,
        code: 'PKB20261810/0001',
      });

      const res = await service.unlockExamination(1, { reason: 'Cập nhật lại tóm tắt' }, 99);

      expect(res.success).toBe(true);
      expect(mockPrisma.examinationAuditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            examinationId: 1,
            action: 'UNLOCK',
            actorId: 99,
            reason: 'Cập nhật lại tóm tắt',
          }),
        }),
      );
      expect(mockAccountingStub.enqueueReversal).toHaveBeenCalledWith(expect.objectContaining({
        examinationId: 1,
        reason: 'Cập nhật lại tóm tắt',
        actorId: 99,
      }));
    });
  });
});
