import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { ReceptionQueueService } from '../src/reception/reception-queue.service.js';
import { DoctorQueueService } from '../src/doctor/doctor-queue.service.js';

const databaseUrl = process.env.DATABASE_URL ?? '';
const enabled = process.env.QUEUE_E2E_ENABLED === '1' && /database=[^;]*(test|e2e)/i.test(databaseUrl);

describe.skipIf(!enabled)('Queue concurrency against an isolated SQL Server database', () => {
  const prisma = new PrismaService();
  const receptionQueue = new ReceptionQueueService(prisma);
  const doctorQueue = new DoctorQueueService(prisma);
  const businessDate = '2099-12-31';
  const createdPatientIds: number[] = [];
  const createdIntakeIds: number[] = [];
  let roomId: number;
  let doctorId: number;

  beforeAll(async () => {
    await prisma.$connect();
    const room = await prisma.clinicRoom.findUniqueOrThrow({ where: { code: 'room-01' } });
    const doctor = await prisma.user.findUniqueOrThrow({ where: { username: 'doctor-minh' } });
    roomId = room.id;
    doctorId = doctor.id;
    await prisma.roomQueueCounter.deleteMany({
      where: { businessDate: new Date(`${businessDate}T00:00:00.000Z`), roomId },
    });
  });

  afterAll(async () => {
    if (createdIntakeIds.length) {
      await prisma.doctorExamination.deleteMany({ where: { intakeId: { in: createdIntakeIds } } });
      const tickets = await prisma.queueTicket.findMany({ where: { intakeId: { in: createdIntakeIds } }, select: { id: true } });
      await prisma.roomQueueCounter.deleteMany({ where: { businessDate: new Date(`${businessDate}T00:00:00.000Z`), roomId } });
      await prisma.queueCallHistory.deleteMany({ where: { ticketId: { in: tickets.map((ticket) => ticket.id) } } });
      await prisma.intakeAuditLog.deleteMany({ where: { intakeId: { in: createdIntakeIds } } });
      await prisma.queueTicket.deleteMany({ where: { intakeId: { in: createdIntakeIds } } });
      await prisma.intake.deleteMany({ where: { id: { in: createdIntakeIds } } });
    }
    if (createdPatientIds.length) await prisma.patient.deleteMany({ where: { id: { in: createdPatientIds } } });
    await prisma.$disconnect();
  });

  async function createWaitingIntake(sequence: number) {
    const suffix = `${Date.now()}${sequence}`;
    const patient = await prisma.patient.create({
      data: {
        code: `E2E-MBN-${suffix}`,
        fullName: `Queue E2E ${sequence}`,
        dateOfBirth: new Date('1990-01-01'),
        gender: 'Nam',
        phone: `08${suffix.slice(-8)}`,
      },
    });
    createdPatientIds.push(patient.id);
    const intake = await prisma.intake.create({
      data: {
        code: `E2E-TNK-${suffix}`,
        patientId: patient.id,
        symptoms: 'Dữ liệu giả kiểm thử đồng thời',
        priority: 'Thường',
        status: 'TRANSFERRED',
        roomId,
        doctorId,
      },
    });
    createdIntakeIds.push(intake.id);
    return intake;
  }

  it('issues distinct sequential tickets for concurrent saves and remains idempotent per intake', async () => {
    const [first, second] = await Promise.all([createWaitingIntake(1), createWaitingIntake(2)]);
    const [firstTicket, secondTicket] = await Promise.all([
      receptionQueue.issueTicket({ intakeId: first.id, roomId, businessDate }, doctorId),
      receptionQueue.issueTicket({ intakeId: second.id, roomId, businessDate }, doctorId),
    ]);
    expect([firstTicket.displayNumber, secondTicket.displayNumber].sort()).toEqual(['0001', '0002']);

    const replay = await Promise.all([
      receptionQueue.issueTicket({ intakeId: first.id, roomId, businessDate }, doctorId),
      receptionQueue.issueTicket({ intakeId: first.id, roomId, businessDate }, doctorId),
    ]);
    expect(new Set(replay.map((ticket) => ticket.id))).toEqual(new Set([firstTicket.id]));
  });

  it('allows only one concurrent call to acquire the next patient', async () => {
    const now = new Date('2099-12-31T02:00:00.000Z');
    const outcomes = await Promise.allSettled([
      doctorQueue.callNext(doctorId, doctorId, now),
      doctorQueue.callNext(doctorId, doctorId, now),
    ]);
    expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
    expect(await prisma.queueTicket.count({
      where: { intakeId: { in: createdIntakeIds }, status: 'CALLED' },
    })).toBe(1);
  });
});
