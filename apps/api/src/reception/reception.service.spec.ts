import { BadRequestException, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReceptionService } from './reception.service.js';
import type { PrismaService } from '../infrastructure/database/prisma.service.js';

describe('ReceptionService', () => {
  let service: ReceptionService;
  let mockPrisma: any;
  let mockAccounting: any;
  let mockQueue: any;

  beforeEach(() => {
    mockPrisma = {
      clinicRoom: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      dentalService: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
      patient: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      intake: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findUniqueOrThrow: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      intakeService: {
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
      queueTicket: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      roomQueueCounter: {
        findMany: vi.fn(),
      },
      intakePrintHistory: {
        count: vi.fn(),
        create: vi.fn(),
      },
      intakeAuditLog: {
        create: vi.fn(),
      },
      accountingEvent: {
        upsert: vi.fn(),
      },
      payment: {
        create: vi.fn().mockResolvedValue({ id: 77 }),
        deleteMany: vi.fn(),
      },
      patientDeleted: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      intakeDeleted: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      intakeServiceDeleted: {
        create: vi.fn(),
      },
      paymentDeleted: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(mockPrisma)),
    };

    mockAccounting = { ingestReceptionPayment: vi.fn().mockResolvedValue({ eventId: 1, entryId: 2 }) };
    mockQueue = {
      issueTicket: vi.fn().mockResolvedValue({
        id: 1,
        intakeId: 1,
        roomId: 1,
        businessDate: '2026-10-21',
        queueNumber: 1,
        displayNumber: '0001',
        status: 'WAITING',
        issuedAt: '2026-10-21T01:00:00.000Z',
      }),
    };
    service = new ReceptionService(mockPrisma as unknown as PrismaService, mockAccounting, mockQueue);
  });

  describe('getMasterData', () => {
    it('returns rooms, services, and doctors in correct structure', async () => {
      mockPrisma.clinicRoom.findMany.mockResolvedValue([
        { code: 'room-01', name: 'Phòng 01', description: 'Mô tả 1' },
      ]);
      mockPrisma.dentalService.findMany.mockResolvedValue([
        { code: 'cleaning', category: 'Cơ bản', name: 'Lấy vôi', price: 400000, unit: '2 hàm' },
      ]);
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 10,
          username: 'doctor-minh',
          fullName: 'BS. Minh',
          employee: {
            room: { code: 'room-02', name: 'Phòng 02' },
            shiftAssignments: [{
              id: 9,
              room: { code: 'room-01', name: 'Phòng 01' },
              shift: { name: 'Ca sáng', startTime: '08:00', endTime: '12:00' },
            }],
          },
        },
      ]);

      const data = await service.getMasterData(new Date('2026-10-21T02:00:00.000Z'));

      expect(data.rooms).toEqual([{ id: 'room-01', name: 'Phòng 01', description: 'Mô tả 1' }]);
      expect(data.services).toEqual([{ id: 'cleaning', category: 'Cơ bản', name: 'Lấy vôi', price: 400000, unit: '2 hàm' }]);
      expect(data.businessDate).toBe('2026-10-21');
      expect(data.doctors).toEqual([{
        id: 'doctor-minh',
        name: 'BS. Minh',
        specialty: 'Nha khoa chuyên sâu',
        isOnDuty: true,
        assignedRoom: { id: 'room-01', name: 'Phòng 01' },
        fallbackRoom: { id: 'room-02', name: 'Phòng 02' },
        shiftName: 'Ca sáng',
        shiftStart: '08:00',
        shiftEnd: '12:00',
      }]);
    });
  });

  describe('queue-enabled intake list', () => {
    it('filters by date, room and priority and exposes STT/current calling number', async () => {
      mockPrisma.intake.findMany.mockResolvedValue([{
        code: 'TNK20262110/0005',
        symptoms: 'Đau răng',
        priority: 'Ưu tiên',
        priorityReason: 'Người cao tuổi',
        status: 'READY',
        createdAt: new Date('2026-10-21T01:00:00.000Z'),
        transferredAt: null,
        patient: { code: 'MBN0001', fullName: 'Nguyễn Văn A' },
        room: { id: 2, code: 'room-02', name: 'Phòng 02' },
        doctor: { username: 'doctor-minh', fullName: 'BS. Minh' },
        services: [{ service: { code: 'cleaning' }, quantity: 1 }],
        payments: [],
        queueTicket: {
          businessDate: new Date('2026-10-21T00:00:00.000Z'),
          queueNumber: 5,
          status: 'WAITING',
        },
        _count: { printHistories: 0 },
      }]);
      mockPrisma.roomQueueCounter.findMany.mockResolvedValue([{
        roomId: 2,
        businessDate: new Date('2026-10-21T00:00:00.000Z'),
        currentNumber: 3,
      }]);

      const result = await service.getIntakes({
        date: '2026-10-21',
        roomCode: 'room-02',
        priority: 'Ưu tiên',
      });

      expect(mockPrisma.intake.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          priority: 'Ưu tiên',
          room: { code: 'room-02' },
          queueTicket: { businessDate: new Date('2026-10-21T00:00:00.000Z') },
        },
      }));
      expect(result[0]).toMatchObject({
        queueNumber: '0005',
        priorityReason: 'Người cao tuổi',
        currentCallingNumber: '0003',
        patientName: 'Nguyễn Văn A',
      });
    });
  });

  describe('recordIntakePrint', () => {
    const printableIntake = {
      id: 9,
      code: 'TNK20262110/0005',
      symptoms: 'Đau răng',
      priority: 'Ưu tiên',
      priorityReason: 'Người cao tuổi',
      createdAt: new Date('2026-10-21T01:00:00.000Z'),
      patient: { code: 'MBN0001', fullName: 'Nguyễn Văn A' },
      room: { code: 'room-02', name: 'Phòng 02' },
      doctor: { username: 'doctor-minh', fullName: 'BS. Minh' },
      services: [{ quantity: 1, service: { code: 'cleaning', name: 'Lấy cao răng' } }],
      payments: [],
      queueTicket: {
        businessDate: new Date('2026-10-21T00:00:00.000Z'),
        queueNumber: 5,
        status: 'WAITING',
      },
    };

    it('keeps the same STT and marks only reprints as copies', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue(printableIntake);
      mockPrisma.intakePrintHistory.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);
      mockPrisma.intakePrintHistory.create.mockResolvedValue({ id: 1 });

      const first = await service.recordIntakePrint(printableIntake.code, 10);
      const second = await service.recordIntakePrint(printableIntake.code, 10);

      expect(first).toMatchObject({ isCopy: false, printCount: 1, queueNumber: '0005' });
      expect(second).toMatchObject({ isCopy: true, printCount: 2, queueNumber: '0005' });
      expect(mockPrisma.intakePrintHistory.create).toHaveBeenNthCalledWith(2, expect.objectContaining({
        data: expect.objectContaining({ isCopy: true }),
      }));
    });
  });

  describe('cancelIntake', () => {
    const waitingIntake = {
      id: 9,
      code: 'TNK20262110/0005',
      status: 'PAID',
      examination: null,
      payments: [{ id: 77, status: 'PAID', amount: 500000 }],
      queueTicket: {
        id: 12,
        status: 'WAITING',
        queueNumber: 5,
        roomId: 2,
        businessDate: new Date('2026-10-21T00:00:00.000Z'),
      },
    };

    it('requires a cancellation reason', async () => {
      await expect(service.cancelIntake(waitingIntake.code, '   ', 10))
        .rejects.toThrow(BadRequestException);
    });

    it('cancels only a waiting ticket, retains payment and emits an idempotent accounting event', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue(waitingIntake);
      mockPrisma.queueTicket.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.intake.update.mockResolvedValue({ ...waitingIntake, status: 'CANCELLED_RECEPTION' });
      mockPrisma.accountingEvent.upsert.mockResolvedValue({ id: 31 });

      const result = await service.cancelIntake(waitingIntake.code, 'Đổi dịch vụ', 10);

      expect(result).toMatchObject({
        intakeCode: waitingIntake.code,
        queueNumber: '0005',
        status: 'CANCELLED_RECEPTION',
      });
      expect(mockPrisma.queueTicket.updateMany).toHaveBeenCalledWith({
        where: { id: 12, status: 'WAITING' },
        data: { status: 'CANCELLED', cancelledAt: expect.any(Date) },
      });
      expect(mockPrisma.accountingEvent.upsert).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          sourceType_sourceCode_eventType_idempotencyKey: {
            sourceType: 'RECEPTION',
            sourceCode: waitingIntake.code,
            eventType: 'INTAKE_CANCELLED',
            idempotencyKey: 'reception-cancel-9',
          },
        },
        create: expect.objectContaining({
          payloadJson: expect.stringContaining('"rewardAmount":0'),
        }),
      }));
    });

    it('blocks cancellation after the ticket was called or examination exists', async () => {
      mockPrisma.intake.findUnique
        .mockResolvedValueOnce({
          ...waitingIntake,
          queueTicket: { ...waitingIntake.queueTicket, status: 'CALLED' },
        })
        .mockResolvedValueOnce({ ...waitingIntake, examination: { id: 8 } });

      await expect(service.cancelIntake(waitingIntake.code, 'Không khám', 10))
        .rejects.toThrow(BadRequestException);
      await expect(service.cancelIntake(waitingIntake.code, 'Không khám', 10))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('upsertPatient', () => {
    it('creates a new patient with daily MBN code and saves to database', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);
      mockPrisma.patient.findMany.mockResolvedValue([{ code: 'MBN20261710/0001' }]);
      mockPrisma.patient.create.mockImplementation((args: any) => ({
        ...args.data,
        createdAt: new Date('2026-10-17T08:00:00Z'),
        updatedAt: new Date('2026-10-17T08:00:00Z'),
      }));

      const res = await service.upsertPatient({
        fullName: 'Lê Văn C',
        dateOfBirth: '1995-03-20',
        gender: 'Nam',
        phone: '0933112233',
        address: 'Quận 10, TP.HCM',
        note: 'Tiền sử sâu răng',
      });

      expect(res.fullName).toBe('Lê Văn C');
      expect(res.id).toMatch(/^MBN\d{8}\/\d{4}$/);
      expect(mockPrisma.patient.create).toHaveBeenCalled();
    });

    it('rejects duplicate phone number', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 1,
        code: 'MBN20261710/0001',
        phone: '0912345678',
      });

      await expect(
        service.upsertPatient({
          fullName: 'Bệnh nhân mới',
          dateOfBirth: '1990-01-01',
          gender: 'Nam',
          phone: '0912345678',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates existing patient without creating duplicate', async () => {
      mockPrisma.patient.findUnique.mockImplementation(({ where }: any) => {
        if (where.phone) return { code: 'MBN20261710/0001', phone: '0912345678' };
        if (where.code) {
          return {
            id: 1,
            code: 'MBN20261710/0001',
            fullName: 'Cũ',
            dateOfBirth: new Date('1990-01-01'),
            gender: 'Nam',
            phone: '0912345678',
            address: 'Hà Nội',
            note: '',
            createdAt: new Date('2026-10-17T08:00:00Z'),
            updatedAt: new Date('2026-10-17T08:00:00Z'),
          };
        }
        return null;
      });

      mockPrisma.patient.update.mockResolvedValue({
        id: 1,
        code: 'MBN20261710/0001',
        fullName: 'Đã đổi tên',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Nam',
        phone: '0912345678',
        address: 'Hà Nội',
        note: '',
        createdAt: new Date('2026-10-17T08:00:00Z'),
        updatedAt: new Date('2026-10-17T09:00:00Z'),
      });

      const res = await service.upsertPatient({ fullName: 'Đã đổi tên', phone: '0912345678' }, 'MBN20261710/0001');
      expect(res.fullName).toBe('Đã đổi tên');
      expect(mockPrisma.patient.update).toHaveBeenCalled();
    });
  });

  describe('createIntake', () => {
    it('requires a reason when creating an Ưu tiên intake', async () => {
      await expect(service.createIntake({
        patientCode: 'MBN20261710/0001',
        symptoms: 'Đau răng',
        priority: 'Ưu tiên',
      })).rejects.toThrow(/lý do/i);
    });

    it('creates an intake in DRAFT status linked to a valid patient', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 1,
        code: 'MBN20261710/0001',
      });
      mockPrisma.intake.findMany.mockResolvedValue([]);
      mockPrisma.intake.create.mockImplementation((args: any) => ({
        ...args.data,
        createdAt: new Date('2026-10-17T08:00:00Z'),
      }));

      const intake = await service.createIntake({
        patientCode: 'MBN20261710/0001',
        symptoms: 'Đau răng hàm',
        priority: 'Thường',
      });

      expect(intake.status).toBe('DRAFT');
      expect(intake.patientId).toBe('MBN20261710/0001');
      expect(intake.id).toMatch(/^TNK\d{8}\/\d{4}$/);
    });

    it('throws NotFoundException when patient code does not exist', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue(null);

      await expect(
        service.createIntake({
          patientCode: 'NON_EXISTENT',
          symptoms: 'Đau răng',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateIntakeServices', () => {
    it('assigns room, doctor, services and moves intake to READY status', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'DRAFT',
        queueTicket: null,
      });
      mockPrisma.clinicRoom.findUnique.mockResolvedValue({ id: 1, code: 'room-01' });
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 10,
        username: 'doctor-minh',
        role: { code: 'DOCTOR' },
      });
      mockPrisma.dentalService.findMany.mockResolvedValue([
        { id: 100, code: 'cleaning', price: 400000, isActive: true },
      ]);
      mockPrisma.intake.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'READY',
        symptoms: 'Đau răng',
        priority: 'Thường',
        priorityReason: null,
        roomOverrideReason: null,
        createdAt: new Date('2026-10-17T08:00:00Z'),
        patient: { code: 'MBN20261710/0001' },
        room: { code: 'room-01' },
        doctor: { username: 'doctor-minh' },
        services: [{ quantity: 1, unitPrice: 400000, amount: 400000, service: { code: 'cleaning' } }],
        queueTicket: {
          queueNumber: 1,
          businessDate: new Date('2026-10-21T00:00:00.000Z'),
          status: 'WAITING',
          issuedAt: new Date('2026-10-21T01:00:00.000Z'),
        },
        payments: [],
      });

      const updated = await service.updateIntakeServices('TNK20261710/0001', {
        roomCode: 'room-01',
        doctorUsername: 'doctor-minh',
        priority: 'Thường',
        roomOverrideReason: 'Bác sĩ hỗ trợ ngoài ca theo điều phối của quản lý',
        services: [{ serviceCode: 'cleaning', quantity: 1 }],
      });

      expect(updated.status).toBe('READY');
      expect(updated.roomId).toBe('room-01');
      expect(updated.doctorId).toBe('doctor-minh');
      expect(updated.queueNumber).toBe('0001');
      expect(mockQueue.issueTicket).toHaveBeenCalledWith(
        expect.objectContaining({ intakeId: 1, roomId: 1 }),
        undefined,
        expect.anything(),
      );
      expect(mockPrisma.intakeService.deleteMany).toHaveBeenCalled();
      expect(mockPrisma.intakeService.create).toHaveBeenCalled();
    });

    it('rejects service modifications on TRANSFERRED intakes', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'TRANSFERRED',
      });

      await expect(
        service.updateIntakeServices('TNK20261710/0001', {
          roomCode: 'room-01',
          doctorUsername: 'doctor-minh',
          priority: 'Thường',
          services: [{ serviceCode: 'cleaning', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('requires a reason when priority is Ưu tiên', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'DRAFT',
        queueTicket: null,
      });

      await expect(
        service.updateIntakeServices('TNK20261710/0001', {
          roomCode: 'room-01',
          doctorUsername: 'doctor-minh',
          priority: 'Ưu tiên',
          priorityReason: '',
          services: [{ serviceCode: 'cleaning', quantity: 1 }],
        }),
      ).rejects.toThrow('lý do');
    });

    it('rejects changes after a queue ticket has been issued', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'READY',
        queueTicket: { queueNumber: 1 },
      });

      await expect(
        service.updateIntakeServices('TNK20261710/0001', {
          roomCode: 'room-02',
          doctorUsername: 'doctor-lan',
          priority: 'Thường',
          services: [{ serviceCode: 'filling', quantity: 1 }],
        }),
      ).rejects.toThrow('đã được cấp STT');
    });
  });

  describe('payCash', () => {
    it('creates CASH payment and marks intake as PAID', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'READY',
        services: [{ amount: 400000 }],
        payments: [],
      });
      mockPrisma.intake.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'PAID',
        symptoms: 'Đau răng',
        priority: 'Thường',
        createdAt: new Date('2026-10-17T08:00:00Z'),
        patient: { code: 'MBN20261710/0001' },
        room: { code: 'room-01' },
        doctor: { username: 'doctor-minh' },
        services: [{ quantity: 1, unitPrice: 400000, amount: 400000, service: { code: 'cleaning' } }],
        payments: [{ method: 'CASH', status: 'PAID', orderId: 'CASH-TNK-01', paidAt: new Date() }],
      });

      const res = await service.payCash('TNK20261710/0001', 2);
      expect(res.status).toBe('PAID');
      expect(res.payment?.method).toBe('CASH');
      expect(mockPrisma.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            intakeId: 1,
            method: 'CASH',
            status: 'PAID',
            amount: 400000,
          }),
        }),
      );
      expect(mockAccounting.ingestReceptionPayment).toHaveBeenCalledWith(77, 'reception-payment-77-paid');
    });

    it('rejects payment on already paid intake', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'PAID',
        services: [{ amount: 400000 }],
      });

      await expect(service.payCash('TNK20261710/0001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('transferIntake', () => {
    it('transfers intake and locks it when PAID', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'PAID',
      });
      mockPrisma.intake.findUniqueOrThrow.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'TRANSFERRED',
        symptoms: 'Đau răng',
        priority: 'Thường',
        createdAt: new Date('2026-10-17T08:00:00Z'),
        transferredAt: new Date('2026-10-17T09:00:00Z'),
        patient: { code: 'MBN20261710/0001' },
        room: { code: 'room-01' },
        doctor: { username: 'doctor-minh' },
        services: [],
        payments: [],
      });

      const res = await service.transferIntake('TNK20261710/0001');
      expect(res.status).toBe('TRANSFERRED');
      expect(res.transferredAt).toBeDefined();
      expect(mockPrisma.intake.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'TRANSFERRED' }),
        }),
      );
    });

    it('rejects transfer when intake is not PAID', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: 1,
        code: 'TNK20261710/0001',
        status: 'READY',
      });

      await expect(service.transferIntake('TNK20261710/0001')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePatient (with backup to PatientDeleted)', () => {
    it('backs up patient and associated records to *Deleted tables then deletes from live tables', async () => {
      mockPrisma.patient.findUnique.mockResolvedValue({
        id: 1,
        code: 'MBN20261710/0001',
        fullName: 'Bệnh Nhân Xóa',
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Nam',
        phone: '0901234567',
        address: 'Hà Nội',
        note: 'Tiền sử',
        createdAt: new Date('2026-10-17T08:00:00Z'),
        updatedAt: new Date('2026-10-17T08:00:00Z'),
        intakes: [
          {
            id: 10,
            code: 'TNK20261710/0001',
            patientId: 1,
            symptoms: 'Đau răng',
            priority: 'Thường',
            status: 'DRAFT',
            services: [{ id: 100, intakeId: 10, serviceId: 5, quantity: 1, unitPrice: 300000, amount: 300000 }],
            payments: [],
          },
        ],
      });

      const res = await service.deletePatient('MBN20261710/0001', 'Bệnh nhân yêu cầu xóa', 'admin');

      expect(res.success).toBe(true);
      expect(mockPrisma.patientDeleted.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalId: 1,
            code: 'MBN20261710/0001',
            deletedBy: 'admin',
          }),
        }),
      );
      expect(mockPrisma.intakeDeleted.create).toHaveBeenCalled();
      expect(mockPrisma.patient.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });

  describe('deleteIntake (with backup to IntakeDeleted)', () => {
    it('backs up intake and services to IntakeDeleted and IntakeServiceDeleted', async () => {
      mockPrisma.intake.findUnique.mockResolvedValue({
        id: 20,
        code: 'TNK20261710/0002',
        patientId: 2,
        patient: { code: 'MBN20261710/0002' },
        symptoms: 'Nhổ răng',
        priority: 'Ưu tiên',
        status: 'READY',
        services: [{ id: 200, intakeId: 20, serviceId: 8, quantity: 1, unitPrice: 500000, amount: 500000 }],
        payments: [],
      });

      const res = await service.deleteIntake('TNK20261710/0002', 'Hủy phiếu khám', 'reception');

      expect(res.success).toBe(true);
      expect(mockPrisma.intakeDeleted.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            originalId: 20,
            code: 'TNK20261710/0002',
            deletedBy: 'reception',
          }),
        }),
      );
      expect(mockPrisma.intakeServiceDeleted.create).toHaveBeenCalled();
      expect(mockPrisma.intake.delete).toHaveBeenCalledWith({ where: { id: 20 } });
    });
  });
});
