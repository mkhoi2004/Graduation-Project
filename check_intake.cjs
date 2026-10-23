const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const intakes = await prisma.intake.findMany({
    include: { patient: true, doctor: true, room: true, queueTicket: true, examination: true },
    orderBy: { id: 'desc' },
    take: 10,
  });
  console.log('Latest intakes in DB:');
  for (const i of intakes) {
    console.log(`- Intake ${i.id} (${i.code}): status=${i.status}, patient=${i.patient?.fullName}, doctor=${i.doctor?.fullName}, ticketStatus=${i.queueTicket?.status}, exam=${i.examination ? `${i.examination.code}:${i.examination.status}` : 'none'}`);
  }
}

main().finally(() => prisma.$disconnect());
