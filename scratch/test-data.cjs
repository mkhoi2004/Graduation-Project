const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rooms = await prisma.clinicRoom.findMany();
  console.log('Rooms in DB:', rooms.map(r => ({ id: r.id, code: r.code, name: r.name, isActive: r.isActive })));

  const supplies = await prisma.medicalSupply.findMany();
  console.log('Supplies in DB count:', supplies.length);
  for (const s of supplies) {
    console.log(`- [${s.group}] ${s.code}: ${s.name} (Tồn: ${s.inStock} ${s.baseUnit}) Active: ${s.isActive}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
