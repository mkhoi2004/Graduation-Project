import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DoctorService } from './doctor.service.js';
import type { PrismaService } from '../infrastructure/database/prisma.service.js';
import type { WarehouseServiceStub } from './stubs/warehouse-stub.service.js';
import type { AccountingServiceStub } from './stubs/accounting-stub.service.js';
import type { DoctorQueueService } from './doctor-queue.service.js';

describe('DoctorService', () => {
  let service: DoctorService;
  let mockPrisma: any;
  let mockWarehouseStub: any;
  let mockAccountingStub: any;
  let mockQueueService: any;

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
    mockQueueService = { getQueue: vi.fn(), callNext: vi.fn(), markAbsent: vi.fn() };

    service = new DoctorService(
      mockPrisma as unknown as PrismaService,
      mockWarehouseStub as unknown as WarehouseServiceStub,
      mockAccountingStub as unknown as AccountingServiceStub,
      mockQueueService as unknown as DoctorQueueService,
    );
  });

  describe('getWaitingQueue', () => {
    it('delegates to the STT queue service', async () => {
      mockQueueService.getQueue.mockResolvedValue({ queue: [{ queueNumber: '0001' }], summary: { waitingCount: 1 } });
      await expect(service.getWaitingQueue(1)).resolves.toMatchObject({ summary: { waitingCount: 1 } });
      expect(mockQueueService.getQueue).toHaveBeenCalledWith(1);
    });
  });

  describe('callNextPatient', () => {
    it('blocks call if doctor already has an IN_PROGRESS examination', async () => {
      mockQueueService.callNext.mockRejectedValue(new BadRequestException('Bác sĩ đang có bệnh nhân Đang khám.'));
      await expect(service.callNextPatient(1)).rejects.toThrow(BadRequestException);
    });

    it('returns an empty queue response without creating an examination', async () => {
      mockQueueService.callNext.mockResolvedValue({ nextExaminationId: null, message: 'Không còn bệnh nhân chờ' });
      await expect(service.callNextPatient(1)).resolves.toEqual({ nextExaminationId: null, nextExamination: null, message: 'Không còn bệnh nhân chờ' });
    });

    it('creates examination and marks intake as IN_PROGRESS', async () => {
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
      mockQueueService.callNext.mockResolvedValue({ nextExaminationId: 77, queueNumber: '0001', message: 'Đã gọi STT 0001' });
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

      const result = await service.callNextPatient(1);

      expect(result.nextExamination?.id).toBe(77);
      expect(result.queueNumber).toBe('0001');
    });
  });

  describe('markAbsent', () => {
    it('records zero revenue/cost and returns the automatically called next examination', async () => {
      mockQueueService.markAbsent.mockResolvedValue({ absentExaminationId: 41, nextExaminationId: 42, message: 'Đã gọi STT 0004' });
      mockPrisma.doctorExamination.findUnique.mockResolvedValue({
        id: 41, code: 'PKB41', patientId: 5, intakeId: 11, doctorId: 7, roomId: 2, completedAt: new Date(),
        intake: { code: 'TNK11', services: [] },
      });
      const detail = (id: number, status: string) => ({
        id, code: `PKB${id}`, status, isLocked: status === 'ABSENT', startedAt: new Date(), completedAt: status === 'ABSENT' ? new Date() : null,
        patient: { code: 'MBN1', fullName: 'Bệnh nhân', dateOfBirth: new Date('1990-01-01'), gender: 'Nam', phone: '0901' },
        room: { code: 'room-02', name: 'Phòng 02' },
        intake: { code: 'TNK11', symptoms: 'Đau răng', priority: 'Thường', services: [] },
        supplies: [], result: null, printHistories: [],
      });
      mockPrisma.doctorExamination.findUniqueOrThrow
        .mockResolvedValueOnce(detail(41, 'ABSENT'))
        .mockResolvedValueOnce(detail(42, 'IN_PROGRESS'));

      const result = await service.markAbsent(41, 7);

      expect(result.absentExamination.status).toBe('ABSENT');
      expect(result.nextExamination?.id).toBe(42);
      expect(mockAccountingStub.enqueueJournalEntry).toHaveBeenCalledWith(expect.objectContaining({
        serviceRevenue: 0, supplyCost: 0, isCancelled: true,
      }));
      expect(mockWarehouseStub.deductStock).not.toHaveBeenCalled();
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
