import { config } from 'dotenv';
import { hash } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

config({ path: ['.env', '../../.env'] });

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required to seed the database');
}

if (
  process.env.NODE_ENV === 'production' &&
  process.env.DEMO_SEED_ENABLED !== 'true'
) {
  throw new Error(
    'Demo seeding is disabled in production. Set DEMO_SEED_ENABLED=true only when explicitly intended.',
  );
}

const prisma = new PrismaClient();

const roles = [
  {
    code: 'ADMIN',
    name: 'Quản trị viên',
    description: 'Toàn quyền quản trị hệ thống và tất cả module nghiệp vụ.',
    username: 'admin',
    fullName: 'Quản trị viên Demo',
  },
  {
    code: 'RECEPTION_STAFF',
    name: 'Nhân viên tiếp nhận',
    description:
      'Tiếp nhận hồ sơ mới, thu tiền, in phiếu và chuyển hồ sơ cho bác sĩ.',
    username: 'reception',
    fullName: 'Nhân viên tiếp nhận Demo',
  },
  {
    code: 'DOCTOR',
    name: 'Bác sĩ thực hiện',
    description:
      'Nhận hồ sơ, thực hiện khám, ghi dữ liệu điều trị và hoàn thành hồ sơ.',
    username: 'doctor',
    fullName: 'Bác sĩ Demo',
  },
  {
    code: 'WAREHOUSE_MANAGEMENT',
    name: 'Quản lý kho',
    description:
      'Quản lý vật tư y tế, vật tư nha khoa và văn phòng phẩm của phòng khám.',
    username: 'warehouse',
    fullName: 'Quản lý kho Demo',
  },
  {
    code: 'ACCOUNTING_STAFF',
    name: 'Nhân viên kế toán',
    description:
      'Tổng hợp khoản thu, báo cáo tháng và chi phí vật tư từ kho.',
    username: 'accounting',
    fullName: 'Nhân viên kế toán Demo',
  },
] as const;

async function main() {
  const passwordHash = await hash('Dental@123', 12);

  for (const item of roles) {
    const role = await prisma.role.upsert({
      where: { code: item.code },
      update: {
        name: item.name,
        description: item.description,
      },
      create: {
        code: item.code,
        name: item.name,
        description: item.description,
      },
    });

    await prisma.user.upsert({
      where: { username: item.username },
      update: {
        fullName: item.fullName,
        roleId: role.id,
      },
      create: {
        username: item.username,
        fullName: item.fullName,
        passwordHash,
        roleId: role.id,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
