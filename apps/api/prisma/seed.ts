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
  },
  {
    code: 'HR',
    name: 'Hành chính nhân sự & Quản lý',
    description: 'Quản trị nhân sự, tài khoản, phân quyền, chấm công, bảng lương và phê duyệt điều hành.',
  },
  {
    code: 'RECEPTION_STAFF',
    name: 'Nhân viên tiếp nhận',
    description:
      'Tiếp nhận hồ sơ mới, thu tiền, in phiếu và chuyển hồ sơ cho bác sĩ.',
  },
  {
    code: 'DOCTOR',
    name: 'Bác sĩ thực hiện',
    description:
      'Nhận hồ sơ, thực hiện khám, ghi dữ liệu điều trị và hoàn thành hồ sơ.',
  },
  {
    code: 'WAREHOUSE_MANAGEMENT',
    name: 'Quản lý kho',
    description:
      'Quản lý vật tư y tế, vật tư nha khoa và văn phòng phẩm của phòng khám.',
  },
  {
    code: 'ACCOUNTING_STAFF',
    name: 'Nhân viên kế toán',
    description:
      'Tổng hợp khoản thu, báo cáo tháng và chi phí vật tư từ kho.',
  },
] as const;

// 10 real-world accounts: 1 Admin, 1 HR, 3 Reception, 3 Doctors, 1 Warehouse, 1 Accounting
const userAccounts = [
  // 1. Quản trị viên (1 tài khoản)
  {
    username: 'admin',
    fullName: 'Trần Nguyễn Minh Khôi',
    roleCode: 'ADMIN',
  },
  // 2. Hành chính nhân sự & Quản lý (1 tài khoản)
  {
    username: 'hr',
    fullName: 'Lê Thị Nhân Sự',
    roleCode: 'HR',
  },
  // 3. Tiếp nhận (3 tài khoản: Quầy trung tâm, Quầy 01, Quầy 02)
  {
    username: 'reception',
    fullName: 'Trần Thị Tiếp Nhận',
    roleCode: 'RECEPTION_STAFF',
  },
  {
    username: 'reception-hoa',
    fullName: 'Nguyễn Thanh Hoa',
    roleCode: 'RECEPTION_STAFF',
  },
  {
    username: 'reception-mai',
    fullName: 'Võ Phương Mai',
    roleCode: 'RECEPTION_STAFF',
  },
  // 4. Bác sĩ (3 tài khoản - 3 phòng khám thực tế)
  {
    username: 'doctor-minh',
    fullName: 'BS. CKI. Nguyễn Hoàng Minh',
    roleCode: 'DOCTOR',
  },
  {
    username: 'doctor-lan',
    fullName: 'BS. ThS. Trần Ngọc Lan',
    roleCode: 'DOCTOR',
  },
  {
    username: 'doctor-huy',
    fullName: 'BS. CKI. Lê Quốc Huy',
    roleCode: 'DOCTOR',
  },
  // 5. Quản lý kho (1 tài khoản)
  {
    username: 'warehouse',
    fullName: 'Phạm Văn Kho',
    roleCode: 'WAREHOUSE_MANAGEMENT',
  },
  // 6. Kế toán (1 tài khoản)
  {
    username: 'accounting',
    fullName: 'Hoàng Thị Kế Toán',
    roleCode: 'ACCOUNTING_STAFF',
  },
] as const;

const clinicRooms = [
  { code: 'room-01', name: 'Phòng khám 01', description: 'Khám tổng quát & nha khoa cơ bản' },
  { code: 'room-02', name: 'Phòng khám 02', description: 'Thẩm mỹ & chỉnh nha' },
  { code: 'room-03', name: 'Phòng tiểu phẫu', description: 'Tiểu phẫu răng khôn & phục hình' },
];

const dentalServices = [
  { code: 'cleaning', category: 'Nha khoa cơ bản', name: 'Cạo vôi + đánh bóng', price: 400_000, unit: '2 hàm' },
  { code: 'filling', category: 'Nha khoa cơ bản', name: 'Trám răng', price: 300_000, unit: '1 chiếc' },
  { code: 'root-front', category: 'Nha khoa cơ bản', name: 'Lấy tủy răng cửa', price: 2_000_000, unit: '1 chiếc' },
  { code: 'root-molar', category: 'Nha khoa cơ bản', name: 'Lấy tủy răng hàm', price: 3_000_000, unit: '1 chiếc' },
  { code: 'extract-normal', category: 'Nha khoa cơ bản', name: 'Nhổ răng thường', price: 300_000, unit: '1 chiếc' },
  { code: 'extract-wisdom', category: 'Nha khoa cơ bản', name: 'Nhổ răng khôn', price: 500_000, unit: '1 chiếc' },
  { code: 'whitening-clinic', category: 'Thẩm mỹ & phục hình', name: 'Tẩy trắng tại phòng', price: 3_000_000, unit: '2 hàm' },
  { code: 'whitening-home', category: 'Thẩm mỹ & phục hình', name: 'Khay tẩy tại nhà', price: 1_500_000, unit: '2 hàm' },
  { code: 'crown-metal', category: 'Thẩm mỹ & phục hình', name: 'Răng sứ kim loại', price: 1_500_000, unit: '1 cái' },
  { code: 'crown-ceramic', category: 'Thẩm mỹ & phục hình', name: 'Răng toàn sứ', price: 8_000_000, unit: '1 cái' },
  { code: 'crown-premium', category: 'Thẩm mỹ & phục hình', name: 'Răng toàn sứ cao cấp', price: 15_000_000, unit: '1 cái' },
  { code: 'braces-metal', category: 'Chỉnh nha & Implant', name: 'Niềng mắc cài kim loại', price: 40_000_000, unit: '2 hàm' },
  { code: 'braces-ceramic', category: 'Chỉnh nha & Implant', name: 'Niềng mắc cài sứ / tự buộc', price: 50_000_000, unit: '2 hàm' },
  { code: 'aligner', category: 'Chỉnh nha & Implant', name: 'Niềng khay trong suốt', price: 70_000_000, unit: '2 hàm' },
];

const medicalSupplies = [
  // Nhóm VTYT thường
  {
    code: 'gloves-vglove',
    name: 'Găng tay cao su có bột Vglove (Khải Hoàn, Việt Nam)',
    group: 'THUONG',
    baseUnit: 'Cái',
    conversionUnit: null,
    conversionRate: null,
    costPrice: 1_500,
    inStock: 2_000,
  },
  {
    code: 'composite-3m',
    name: 'Composite đặc 3M Filtek Z350 XT (Mỹ)',
    group: 'THUONG',
    baseUnit: 'Tuýp',
    conversionUnit: null,
    conversionRate: null,
    costPrice: 750_000,
    inStock: 20,
  },
  {
    code: 'composite-mani',
    name: 'Composite đặc MANI Nano (Nhật)',
    group: 'THUONG',
    baseUnit: 'Tuýp',
    conversionUnit: null,
    conversionRate: null,
    costPrice: 550_000,
    inStock: 25,
  },
  {
    code: 'gutta-meta',
    name: 'Côn gutta máy Meta Biomed 4%–6% (Hàn Quốc)',
    group: 'THUONG',
    baseUnit: 'Cái',
    conversionUnit: 'Hộp',
    conversionRate: 60,
    costPrice: 180_000,
    inStock: 600,
  },
  {
    code: 'cement-relyx',
    name: 'Xi măng gắn RelyX U200 (3M)',
    group: 'THUONG',
    baseUnit: 'Tuýp',
    conversionUnit: null,
    conversionRate: null,
    costPrice: 950_000,
    inStock: 15,
  },
  // Nhóm VTYT vô cảm
  {
    code: 'needle-septoject',
    name: 'Kim tiêm Septoject (Septodont, Pháp)',
    group: 'VO_CAM',
    baseUnit: 'Kim',
    conversionUnit: 'Hộp',
    conversionRate: 100,
    costPrice: 150_000,
    inStock: 1_000,
  },
  {
    code: 'needle-shinject',
    name: 'Kim tiêm gây tê Shinject (Shinhung)',
    group: 'VO_CAM',
    baseUnit: 'Kim',
    conversionUnit: 'Hộp',
    conversionRate: 100,
    costPrice: 130_000,
    inStock: 1_000,
  },
  {
    code: 'needle-terumo',
    name: 'Kim tiêm tê Terumo',
    group: 'VO_CAM',
    baseUnit: 'Kim',
    conversionUnit: 'Hộp',
    conversionRate: 100,
    costPrice: 140_000,
    inStock: 1_000,
  },
  {
    code: 'syringe-osung',
    name: 'Bơm tiêm áp lực Osung 1.8cc',
    group: 'VO_CAM',
    baseUnit: 'Bơm',
    conversionUnit: null,
    conversionRate: null,
    costPrice: 350_000,
    inStock: 30,
  },
  {
    code: 'anesthetic-septanest',
    name: 'Septanest with Adrenaline 1/100.000 (Septodont, Pháp), articaine 4%',
    group: 'VO_CAM',
    baseUnit: 'Ống',
    conversionUnit: 'Hộp',
    conversionRate: 50,
    costPrice: 450_000,
    inStock: 500,
  },
  {
    code: 'paper-a4',
    name: 'Giấy in A4 Double A 70gsm',
    group: 'VAN_PHONG',
    baseUnit: 'Ram',
    conversionUnit: 'Thùng',
    conversionRate: 5,
    costPrice: 78_000,
    inStock: 8,
  },
  {
    code: 'receipt-roll-k80',
    name: 'Giấy in hóa đơn nhiệt K80',
    group: 'VAN_PHONG',
    baseUnit: 'Cuộn',
    conversionUnit: 'Thùng',
    conversionRate: 50,
    costPrice: 18_000,
    inStock: 120,
  },
];

const demoPatients = [
  {
    code: 'MBN20261710/0001',
    fullName: 'Nguyễn Văn An',
    dateOfBirth: new Date('1992-05-14'),
    gender: 'Nam',
    phone: '0912345678',
    citizenId: '079092123457',
    address: '123 Nguyễn Trãi, Quận 1, TP.HCM',
    note: 'Dị ứng nhẹ với penicillin, ê buốt răng hàm dưới khi uống nước đá.',
  },
  {
    code: 'MBN20261710/0002',
    fullName: 'Trần Thị Mai Hương',
    dateOfBirth: new Date('1998-11-20'),
    gender: 'Nữ',
    phone: '0987654321',
    citizenId: '048198234567',
    address: '45 Lê Lợi, Quận Hải Châu, Đà Nẵng',
    note: 'Nhu cầu niềng răng khay trong suốt và tẩy trắng răng thẩm mỹ 2 hàm.',
  },
  {
    code: 'MBN20261710/0003',
    fullName: 'Lê Quốc Bảo',
    dateOfBirth: new Date('1985-08-03'),
    gender: 'Nam',
    phone: '0903112233',
    citizenId: '001085345678',
    address: '88 Cầu Giấy, Hà Nội',
    note: 'Sưng đau nướu răng khôn hàm dưới bên trái, há miệng khó khăn.',
  },
  {
    code: 'MBN20261710/0004',
    fullName: 'Phạm Thùy Linh',
    dateOfBirth: new Date('2001-02-28'),
    gender: 'Nữ',
    phone: '0934567890',
    citizenId: '079301456789',
    address: '12 Đinh Tiên Hoàng, Quận Bình Thạnh, TP.HCM',
    note: 'Khám định kỳ 6 tháng, cạo vôi răng và đánh bóng 2 hàm.',
  },
  {
    code: 'MBN20261710/0005',
    fullName: 'Hoàng Minh Tuấn',
    dateOfBirth: new Date('1978-10-10'),
    gender: 'Nam',
    phone: '0978999888',
    citizenId: '001078567891',
    address: '67 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    note: 'Răng cửa bị mẻ lớn sau va chạm, muốn bọc răng toàn sứ cao cấp.',
  },
];

async function main() {
  const passwordHash = await hash('Dental@123', 12);

  // 1. Roles
  const roleMap = new Map<string, number>();
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
    roleMap.set(item.code, role.id);
  }

  // 2. The 10 Real-World User Accounts
  for (const acc of userAccounts) {
    const roleId = roleMap.get(acc.roleCode)!;
    await prisma.user.upsert({
      where: { username: acc.username },
      update: {
        fullName: acc.fullName,
        roleId,
        isActive: true,
      },
      create: {
        username: acc.username,
        fullName: acc.fullName,
        passwordHash,
        roleId,
        isActive: true,
      },
    });
  }

  // Gracefully clean up legacy demo users 'manager' and 'doctor' if present
  const hrUserRecord = await prisma.user.findUnique({ where: { username: 'hr' } });
  const docMinhRecord = await prisma.user.findUnique({ where: { username: 'doctor-minh' } });
  const legacyManager = await prisma.user.findUnique({ where: { username: 'manager' } });
  if (legacyManager) {
    if (hrUserRecord) {
      await prisma.payroll.updateMany({ where: { approvedById: legacyManager.id }, data: { approvedById: hrUserRecord.id } });
    }
    await prisma.userRoleAssignment.deleteMany({ where: { userId: legacyManager.id } });
    await prisma.employee.updateMany({ where: { userId: legacyManager.id }, data: { userId: null } });
    await prisma.user.delete({ where: { id: legacyManager.id } }).catch(() => {});
  }
  const legacyDoctor = await prisma.user.findUnique({ where: { username: 'doctor' } });
  if (legacyDoctor && docMinhRecord) {
    await prisma.doctorExamination.updateMany({ where: { doctorId: legacyDoctor.id }, data: { doctorId: docMinhRecord.id } });
    await prisma.intake.updateMany({ where: { doctorId: legacyDoctor.id }, data: { doctorId: docMinhRecord.id } });
    await prisma.examinationPrintHistory.updateMany({ where: { printedById: legacyDoctor.id }, data: { printedById: docMinhRecord.id } });
    await prisma.examinationAuditLog.updateMany({ where: { actorId: legacyDoctor.id }, data: { actorId: docMinhRecord.id } });
    await prisma.userRoleAssignment.deleteMany({ where: { userId: legacyDoctor.id } });
    await prisma.employee.updateMany({ where: { userId: legacyDoctor.id }, data: { userId: null } });
    await prisma.user.delete({ where: { id: legacyDoctor.id } }).catch(() => {});
  }
  await prisma.role.delete({ where: { code: 'MANAGER' } }).catch(() => {});

  // 3. Clinic Rooms
  for (const room of clinicRooms) {
    await prisma.clinicRoom.upsert({
      where: { code: room.code },
      update: {
        name: room.name,
        description: room.description,
      },
      create: room,
    });
  }

  // 4. Dental Services
  for (const service of dentalServices) {
    await prisma.dentalService.upsert({
      where: { code: service.code },
      update: {
        name: service.name,
        category: service.category,
        price: service.price,
        unit: service.unit,
      },
      create: service,
    });
  }

  // 4.1. Medical Supplies (VTYT - Role Bác Sĩ)
  for (const supply of medicalSupplies) {
    await prisma.medicalSupply.upsert({
      where: { code: supply.code },
      update: {
        name: supply.name,
        group: supply.group,
        baseUnit: supply.baseUnit,
        conversionUnit: supply.conversionUnit,
        conversionRate: supply.conversionRate,
        costPrice: supply.costPrice,
      },
      create: supply,
    });
  }

  // 4.2. Warehouse demo data: suppliers, thresholds, batches and draft documents
  const suppliers = [
    { code: 'NCC-001', name: 'Công ty Thiết bị Nha khoa Đông Á', phone: '02873001234', taxCode: '0312345678', address: 'TP. Hồ Chí Minh' },
    { code: 'NCC-002', name: 'Công ty Dược phẩm Septodont Việt Nam', phone: '02473005678', taxCode: '0109876543', address: 'Hà Nội' },
    { code: 'NCC-003', name: 'Nhà cung cấp Văn phòng phẩm An Phát', phone: '02363778899', taxCode: '0401234567', address: 'Đà Nẵng' },
  ];
  const supplierIds = new Map<string, number>();
  for (const item of suppliers) {
    const supplier = await prisma.supplier.upsert({ where: { code: item.code }, update: item, create: item });
    supplierIds.set(item.code, supplier.id);
  }

  await prisma.medicalSupply.update({ where: { code: 'paper-a4' }, data: { minimumStock: 20, expiryWarningDays: 90 } });
  await prisma.medicalSupply.update({ where: { code: 'composite-3m' }, data: { minimumStock: 10, expiryWarningDays: 90 } });
  const seededSupplies = await prisma.medicalSupply.findMany({ where: { code: { in: medicalSupplies.map((item) => item.code) } } });
  for (const supply of seededSupplies) {
    const existingBatch = await prisma.inventoryBatch.findFirst({ where: { supplyId: supply.id } });
    if (!existingBatch) {
      const expiryDate = supply.code === 'composite-3m' ? new Date(Date.now() + 45 * 86_400_000) : supply.code === 'anesthetic-septanest' ? new Date(Date.now() + 365 * 86_400_000) : null;
      await prisma.inventoryBatch.create({ data: { supplyId: supply.id, batchNo: `LOT-${supply.code.toUpperCase()}`, expiryDate, quantity: supply.inStock, unitCost: supply.costPrice, originalReceiptCode: 'SEED-OPENING', receivedAt: new Date('2026-09-01') } });
    }
  }

  const paper = seededSupplies.find((item) => item.code === 'paper-a4');
  if (paper) {
    await prisma.stockDocument.upsert({
      where: { code: 'MVT20261018/0001' },
      update: {},
      create: { code: 'MVT20261018/0001', type: 'IN', status: 'DRAFT', supplierId: supplierIds.get('NCC-003'), reason: 'Nhập bổ sung văn phòng phẩm', goodsAmount: 780000, vatAmount: 62400, totalAmount: 842400, lines: { create: { supplyId: paper.id, inputQuantity: 2, inputUnit: 'Thùng', conversionFactor: 5, convertedQuantity: 10, batchNo: 'PAPER-1026', inputUnitPrice: 390000, vatRate: 8, goodsAmount: 780000, vatAmount: 62400, totalAmount: 842400 } } },
    });
  }

  // 5. Demo Patients
  const patientMap = new Map<string, number>();
  for (const p of demoPatients) {
    const patient = await prisma.patient.upsert({
      where: { code: p.code },
      update: {
        fullName: p.fullName,
        dateOfBirth: p.dateOfBirth,
        gender: p.gender,
        phone: p.phone,
        citizenId: p.citizenId,
        address: p.address,
        note: p.note,
      },
      create: p,
    });
    patientMap.set(p.code, patient.id);
  }

  // 6. Demo Intakes with strict relations
  const receptionUser = await prisma.user.findUnique({ where: { username: 'reception' } });
  const doctorMinh = await prisma.user.findUnique({ where: { username: 'doctor-minh' } });
  const doctorHuy = await prisma.user.findUnique({ where: { username: 'doctor-huy' } });
  const doctorLan = await prisma.user.findUnique({ where: { username: 'doctor-lan' } });
  const room01 = await prisma.clinicRoom.findUnique({ where: { code: 'room-01' } });
  const room02 = await prisma.clinicRoom.findUnique({ where: { code: 'room-02' } });
  const room03 = await prisma.clinicRoom.findUnique({ where: { code: 'room-03' } });

  const filling = await prisma.dentalService.findUnique({ where: { code: 'filling' } });
  const cleaning = await prisma.dentalService.findUnique({ where: { code: 'cleaning' } });
  const wisdom = await prisma.dentalService.findUnique({ where: { code: 'extract-wisdom' } });
  const aligner = await prisma.dentalService.findUnique({ where: { code: 'aligner' } });
  const whiteningClinic = await prisma.dentalService.findUnique({ where: { code: 'whitening-clinic' } });

  // Intake 1: TRANSFERRED (Paid cash, transferred to doctor)
  const intake1 = await prisma.intake.upsert({
    where: { code: 'TNK20261710/0001' },
    update: {
      status: 'TRANSFERRED',
      transferredAt: new Date(),
    },
    create: {
      code: 'TNK20261710/0001',
      patientId: patientMap.get('MBN20261710/0001')!,
      symptoms: 'Đau nhức vùng răng cấm bên phải 2 ngày, ê buốt khi ăn đồ ngọt hoặc uống lạnh.',
      priority: 'Thường',
      status: 'TRANSFERRED',
      roomId: room01?.id,
      doctorId: doctorMinh?.id,
      createdById: receptionUser?.id,
      transferredAt: new Date(),
    },
  });

  if (filling && cleaning) {
    await prisma.intakeService.upsert({
      where: { intakeId_serviceId: { intakeId: intake1.id, serviceId: filling.id } },
      update: {},
      create: {
        intakeId: intake1.id,
        serviceId: filling.id,
        quantity: 1,
        unitPrice: filling.price,
        amount: filling.price,
      },
    });
    await prisma.intakeService.upsert({
      where: { intakeId_serviceId: { intakeId: intake1.id, serviceId: cleaning.id } },
      update: {},
      create: {
        intakeId: intake1.id,
        serviceId: cleaning.id,
        quantity: 1,
        unitPrice: cleaning.price,
        amount: cleaning.price,
      },
    });
  }

  await prisma.payment.upsert({
    where: { orderId: 'CASH-TNK20261710/0001' },
    update: {},
    create: {
      intakeId: intake1.id,
      intakeCode: intake1.code,
      orderId: 'CASH-TNK20261710/0001',
      requestId: 'REQ-CASH-TNK20261710/0001',
      partnerCode: 'CLINIC_CASHIER',
      method: 'CASH',
      status: 'PAID',
      amount: 700000,
      paidAt: new Date(),
      createdById: receptionUser?.id,
    },
  });

  // Intake 2: READY (Assigned room & doctor, pending payment)
  const intake2 = await prisma.intake.upsert({
    where: { code: 'TNK20261710/0002' },
    update: { status: 'READY' },
    create: {
      code: 'TNK20261710/0002',
      patientId: patientMap.get('MBN20261710/0003')!,
      symptoms: 'Răng số 8 hàm dưới bên trái sưng tấy, đau nhức dữ dội lan lên thái dương.',
      priority: 'Ưu tiên',
      status: 'READY',
      roomId: room03?.id,
      doctorId: doctorHuy?.id,
      createdById: receptionUser?.id,
    },
  });

  if (wisdom && cleaning) {
    await prisma.intakeService.upsert({
      where: { intakeId_serviceId: { intakeId: intake2.id, serviceId: wisdom.id } },
      update: {},
      create: {
        intakeId: intake2.id,
        serviceId: wisdom.id,
        quantity: 1,
        unitPrice: wisdom.price,
        amount: wisdom.price,
      },
    });
    await prisma.intakeService.upsert({
      where: { intakeId_serviceId: { intakeId: intake2.id, serviceId: cleaning.id } },
      update: {},
      create: {
        intakeId: intake2.id,
        serviceId: cleaning.id,
        quantity: 1,
        unitPrice: cleaning.price,
        amount: cleaning.price,
      },
    });
  }

  // Intake 3: PAID (Paid via MoMo, waiting for transfer)
  const intake3 = await prisma.intake.upsert({
    where: { code: 'TNK20261710/0003' },
    update: { status: 'PAID' },
    create: {
      code: 'TNK20261710/0003',
      patientId: patientMap.get('MBN20261710/0002')!,
      symptoms: 'Tư vấn niềng răng khay trong suốt và tẩy trắng răng thẩm mỹ đón sự kiện.',
      priority: 'Ưu tiên',
      status: 'PAID',
      roomId: room02?.id,
      doctorId: doctorLan?.id,
      createdById: receptionUser?.id,
    },
  });

  if (aligner && whiteningClinic) {
    await prisma.intakeService.upsert({
      where: { intakeId_serviceId: { intakeId: intake3.id, serviceId: aligner.id } },
      update: {},
      create: {
        intakeId: intake3.id,
        serviceId: aligner.id,
        quantity: 1,
        unitPrice: aligner.price,
        amount: aligner.price,
      },
    });
    await prisma.intakeService.upsert({
      where: { intakeId_serviceId: { intakeId: intake3.id, serviceId: whiteningClinic.id } },
      update: {},
      create: {
        intakeId: intake3.id,
        serviceId: whiteningClinic.id,
        quantity: 1,
        unitPrice: whiteningClinic.price,
        amount: whiteningClinic.price,
      },
    });
  }

  await prisma.payment.upsert({
    where: { orderId: 'DENTAL-MOMO-DEMO-0003' },
    update: {},
    create: {
      intakeId: intake3.id,
      intakeCode: intake3.code,
      orderId: 'DENTAL-MOMO-DEMO-0003',
      requestId: 'REQ-MOMO-DEMO-0003',
      partnerCode: 'MOMO',
      method: 'MOMO',
      status: 'PAID',
      amount: 73000000,
      paidAt: new Date(),
      createdById: receptionUser?.id,
    },
  });

  // Intake 4: DRAFT (Newly received patient, no services assigned yet)
  await prisma.intake.upsert({
    where: { code: 'TNK20261710/0004' },
    update: { status: 'DRAFT' },
    create: {
      code: 'TNK20261710/0004',
      patientId: patientMap.get('MBN20261710/0005')!,
      symptoms: 'Răng cửa trên bị sứt mẻ 1/3 thân răng, cần khám phục hình thẩm mỹ.',
      priority: 'Thường',
      status: 'DRAFT',
      createdById: receptionUser?.id,
    },
  });

  // 7. Accounting demo data. These records reference real demo patients, rooms,
  // services and suppliers above; no fabricated clinic legal identity is seeded.
  const accountingUser = await prisma.user.findUnique({ where: { username: 'accounting' } });
  const adminUser = await prisma.user.findUnique({ where: { username: 'admin' } });

  const seedEvent = await prisma.accountingEvent.upsert({
    where: { sourceType_sourceCode_eventType_idempotencyKey: {
      sourceType: 'SEED', sourceCode: 'ACCOUNTING-DEMO', eventType: 'DEMO_CREATED', idempotencyKey: 'accounting-demo-v1',
    } },
    update: { status: 'PROCESSED' },
    create: {
      sourceType: 'SEED', sourceCode: 'ACCOUNTING-DEMO', eventType: 'DEMO_CREATED', idempotencyKey: 'accounting-demo-v1',
      payloadJson: JSON.stringify({ note: 'Dữ liệu minh họa liên kết nghiệp vụ phòng khám' }), status: 'PROCESSED', processedAt: new Date(),
    },
  });

  const cashSeed = [
    { sourceCode: 'PT20261018/0001', ledgerView: 'CASH', direction: 'IN', category: 'PATIENT_ADVANCE', amount: 700_000, preTax: 700_000, taxRate: 0, tax: 0, method: 'CASH', patientId: patientMap.get('MBN20261710/0001'), roomId: room01?.id, reason: 'Thu trước tạm ứng tiếp nhận khám răng', date: '2026-10-18T08:30:00.000Z', docStatus: 'NOT_REQUIRED' },
    { sourceCode: 'PT20261018/0002', ledgerView: 'CASH', direction: 'IN', category: 'TREATMENT_REVENUE', amount: 3_000_000, preTax: 3_000_000, taxRate: 0, tax: 0, method: 'TRANSFER', patientId: patientMap.get('MBN20261710/0002'), roomId: room02?.id, reason: 'Thu tiền dịch vụ tẩy trắng răng', date: '2026-10-18T11:00:00.000Z', docStatus: 'NOT_REQUIRED', txCode: 'FT261018099231' },
    { sourceCode: 'PT20261019/0001', ledgerView: 'CASH', direction: 'IN', category: 'DEPOSIT_REVENUE', amount: 15_000_000, preTax: 15_000_000, taxRate: 0, tax: 0, method: 'TRANSFER', patientId: patientMap.get('MBN20261710/0003'), roomId: room02?.id, reason: 'Thu cọc niềng răng khay trong suốt đợt 1', date: '2026-10-19T09:15:00.000Z', docStatus: 'NOT_REQUIRED', txCode: 'FT261019128841' },
    { sourceCode: 'PT20261019/0002', ledgerView: 'CASH', direction: 'IN', category: 'RETAIL_REVENUE', amount: 250_000, preTax: 250_000, taxRate: 0, tax: 0, method: 'CASH', patientId: undefined, roomId: room01?.id, reason: 'Thu bán lẻ bàn chải kẽ và chỉ nha khoa tại quầy', date: '2026-10-19T10:30:00.000Z', docStatus: 'NOT_REQUIRED' },
    { sourceCode: 'PC20261018/0001', ledgerView: 'CASH', direction: 'OUT', category: 'ADMIN_EXPENSE', amount: 2_450_000, preTax: 2_450_000, taxRate: 0, tax: 0, method: 'TRANSFER', patientId: undefined, roomId: undefined, reason: 'Chi thanh toán tiền điện & internet phòng khám tháng 10/2026', date: '2026-10-18T14:00:00.000Z', docStatus: 'VALID', txCode: 'FT261018339102' },
    { sourceCode: 'PC20261018/0002', ledgerView: 'CASH', direction: 'OUT', category: 'MATERIAL_PAYMENT', amount: 5_200_000, preTax: 5_200_000, taxRate: 0, tax: 0, method: 'TRANSFER', patientId: undefined, roomId: undefined, supplierId: supplierIds.get('NCC-001'), reason: 'Thanh toán tiền vật tư đợt 1 cho Cty Thiết Bị Y Tế Sài Gòn', date: '2026-10-18T15:30:00.000Z', docStatus: 'VALID', txCode: 'FT261018559021' },
    { sourceCode: 'PC20261019/0001', ledgerView: 'CASH', direction: 'OUT', category: 'LABO_PAYMENT', amount: 1_800_000, preTax: 1_800_000, taxRate: 0, tax: 0, method: 'TRANSFER', patientId: undefined, roomId: undefined, reason: 'Chi labo đúc phục hình mão răng toàn sứ Cercon', date: '2026-10-19T09:45:00.000Z', docStatus: 'PENDING', txCode: 'FT261019772210' },
    { sourceCode: 'PC20261019/0002', ledgerView: 'CASH', direction: 'OUT', category: 'CARD_FEE', amount: 45_000, preTax: 45_000, taxRate: 0, tax: 0, method: 'CARD', patientId: undefined, roomId: undefined, reason: 'Phí thanh toán thẻ POS Vietcombank', date: '2026-10-19T10:00:00.000Z', docStatus: 'NOT_REQUIRED' },
    { sourceCode: 'PC20261019/0003', ledgerView: 'CASH', direction: 'OUT', category: 'SALARY', amount: 3_000_000, preTax: 3_000_000, taxRate: 0, tax: 0, method: 'CASH', patientId: undefined, roomId: undefined, reason: 'Tạm ứng lương trợ thủ nha khoa đợt giữa tháng', date: '2026-10-19T11:30:00.000Z', docStatus: 'NOT_REQUIRED' },
    // Losses (Tổn thất xuất hủy - không ảnh hưởng tiền)
    { sourceCode: 'TT20261018/0001', ledgerView: 'LOSS', direction: 'NONE', category: 'DISPOSAL_LOSS', amount: 1_200_000, preTax: 1_200_000, taxRate: 0, tax: 0, method: undefined, patientId: undefined, roomId: room01?.id, reason: 'Xuất hủy thuốc tê Septodont hết hạn sử dụng', date: '2026-10-18T16:00:00.000Z', docStatus: 'VALID' },
    { sourceCode: 'TT20261019/0001', ledgerView: 'LOSS', direction: 'NONE', category: 'DISPOSAL_LOSS', amount: 180_000, preTax: 180_000, taxRate: 0, tax: 0, method: undefined, patientId: undefined, roomId: room03?.id, reason: 'Xuất hủy găng tay cao su rách hỏng trong bảo quản', date: '2026-10-19T08:00:00.000Z', docStatus: 'VALID' },
  ];

  for (const item of cashSeed) {
    const existing = await prisma.accountingEntry.findFirst({ where: { sourceType: 'SEED', sourceCode: item.sourceCode } });
    if (!existing) {
      await prisma.accountingEntry.create({ data: {
        eventId: seedEvent.id, ledgerView: item.ledgerView, direction: item.direction, category: item.category,
        effectiveDate: new Date(item.date), roomId: item.roomId, patientId: item.patientId, supplierId: item.supplierId,
        sourceType: 'SEED', sourceCode: item.sourceCode, preTaxAmount: item.preTax, taxRate: item.taxRate, taxAmount: item.tax, totalAmount: item.amount,
        affectsCash: item.ledgerView === 'CASH', paymentMethod: item.method, transactionCode: item.txCode, paymentStatus: 'PAID', documentStatus: item.docStatus,
        reason: item.reason, actorId: accountingUser?.id,
      } });
    }
  }

  // Performance lines
  const perfSeed = [
    { serviceCode: 'cleaning', revenue: 400_000, cost: 45_000, doctor: doctorMinh, room: room01, date: '2026-10-18T09:30:00.000Z' },
    { serviceCode: 'filling', revenue: 300_000, cost: 60_000, doctor: doctorMinh, room: room01, date: '2026-10-18T10:15:00.000Z' },
    { serviceCode: 'extract-wisdom', revenue: 500_000, cost: 120_000, doctor: doctorHuy, room: room03, date: '2026-10-18T15:00:00.000Z' },
    { serviceCode: 'whitening-clinic', revenue: 3_000_000, cost: 450_000, doctor: doctorLan, room: room02, date: '2026-10-19T09:00:00.000Z' },
  ];
  for (let i = 0; i < perfSeed.length; i++) {
    const p = perfSeed[i];
    const s = await prisma.dentalService.findUnique({ where: { code: p.serviceCode } });
    if (s && p.doctor && p.room) {
      const existing = await prisma.performanceLine.findFirst({ where: { eventId: seedEvent.id, examinationId: i + 1, serviceId: s.id } });
      if (!existing) {
        await prisma.performanceLine.create({ data: {
          eventId: seedEvent.id, examinationId: i + 1, intakeServiceId: i + 1, serviceId: s.id,
          doctorId: p.doctor.id, roomId: p.room.id, serviceType: s.serviceType,
          taxClassification: s.taxClassification, taxRate: s.defaultTaxRate,
          recognizedRevenue: p.revenue, supplyCost: p.cost, effectiveDate: new Date(p.date),
        } });
      }
    }
  }

  // Debts
  const debtSeeds = [
    { debtType: 'PATIENT_RECEIVABLE', sourceCode: 'CN-BN-001', patientId: patientMap.get('MBN20261710/0003'), supplierId: undefined, amount: 7_000_000, dueDate: new Date('2026-11-20'), date: '2026-10-19T09:00:00.000Z' },
    { debtType: 'PATIENT_RECEIVABLE', sourceCode: 'CN-BN-002', patientId: patientMap.get('MBN20261710/0002'), supplierId: undefined, amount: 3_200_000, dueDate: new Date('2026-09-15'), date: '2026-09-01T10:00:00.000Z' },
    { debtType: 'PATIENT_RECEIVABLE', sourceCode: 'CN-BN-003', patientId: patientMap.get('MBN20261710/0001'), supplierId: undefined, amount: 800_000, dueDate: new Date('2026-08-10'), date: '2026-08-01T10:00:00.000Z' },
    { debtType: 'SUPPLIER_PAYABLE', sourceCode: 'CN-NCC-001', patientId: undefined, supplierId: supplierIds.get('NCC-001'), amount: 5_500_000, dueDate: new Date('2026-11-10'), date: '2026-10-18T10:00:00.000Z' },
    { debtType: 'SUPPLIER_PAYABLE', sourceCode: 'CN-NCC-002', patientId: undefined, supplierId: supplierIds.get('NCC-002'), amount: 4_200_000, dueDate: new Date('2026-07-01'), date: '2026-06-15T10:00:00.000Z' },
  ];
  for (const debt of debtSeeds) {
    const existing = await prisma.debt.findFirst({ where: { sourceType: 'SEED', sourceCode: debt.sourceCode } });
    if (!existing) {
      await prisma.debt.create({ data: {
        debtType: debt.debtType, patientId: debt.patientId, supplierId: debt.supplierId, roomId: room01?.id,
        sourceType: 'SEED', sourceCode: debt.sourceCode, principalAmount: debt.amount, dueDate: debt.dueDate,
        effectiveDate: new Date(debt.date),
      } });
    }
  }

  // Supplier Invoices
  const firstStockDoc = await prisma.stockDocument.findFirst({ where: { type: 'IN' } });
  const invoice1 = await prisma.supplierInvoice.upsert({
    where: { invoiceNumber_series_supplierTaxCode: {
      invoiceNumber: '0001425', series: '1C26TAA', supplierTaxCode: '0309988771',
    } },
    update: {},
    create: {
      invoiceNumber: '0001425',
      series: '1C26TAA',
      invoiceDate: new Date('2026-10-15'),
      supplierId: supplierIds.get('NCC-001'),
      supplierTaxCode: '0309988771',
      buyerName: 'PHÒNG KHÁM NHA KHOA DENTALCARE',
      buyerTaxCode: '0312345678',
      buyerAddress: '123 Đường 3/2, Phường 11, Quận 10, TP. Hồ Chí Minh',
      goodsAmount: 5_000_000,
      taxAmount: 500_000,
      totalAmount: 5_500_000,
      documentStatus: 'VALID',
      createdById: accountingUser?.id,
    },
  });
  if (firstStockDoc) {
    await prisma.supplierInvoiceStockDocument.upsert({
      where: { supplierInvoiceId_stockDocumentId: { supplierInvoiceId: invoice1.id, stockDocumentId: firstStockDoc.id } },
      update: {},
      create: {
        supplierInvoiceId: invoice1.id,
        stockDocumentId: firstStockDoc.id,
        linkedAmount: 5_500_000,
      },
    });
  }

  await prisma.supplierInvoice.upsert({
    where: { invoiceNumber_series_supplierTaxCode: {
      invoiceNumber: '0008892', series: '1C26TBB', supplierTaxCode: '0315544332',
    } },
    update: {},
    create: {
      invoiceNumber: '0008892',
      series: '1C26TBB',
      invoiceDate: new Date('2026-10-16'),
      supplierId: supplierIds.get('NCC-002'),
      supplierTaxCode: '0315544332',
      buyerName: 'Nha khoa DentalCare Chi nhánh 2',
      buyerTaxCode: '0399999999',
      buyerAddress: '999 Đường Cách Mạng Tháng 8, Quận 3, TP. Hồ Chí Minh',
      goodsAmount: 3_000_000,
      taxAmount: 300_000,
      totalAmount: 3_300_000,
      documentStatus: 'INVALID',
      differenceNote: 'Hóa đơn xuất sai tên đơn vị mua và MST; đã yêu cầu nhà cung cấp lập biên bản điều chỉnh.',
      createdById: accountingUser?.id,
    },
  });

  // Cash Reconciliations
  await prisma.cashReconciliation.upsert({
    where: { businessDate_roomId: { businessDate: new Date('2026-10-18'), roomId: room01?.id ?? 1 } },
    update: {},
    create: {
      businessDate: new Date('2026-10-18'),
      roomId: room01?.id ?? 1,
      openingBalance: 15_000_000,
      calculatedBalance: 18_250_000,
      countedBalance: 18_250_000,
      differenceAmount: 0,
      recordedById: accountingUser?.id ?? 1,
      confirmedById: adminUser?.id ?? 1,
      confirmedAt: new Date('2026-10-18T18:00:00Z'),
    },
  });

  await prisma.cashReconciliation.upsert({
    where: { businessDate_roomId: { businessDate: new Date('2026-10-19'), roomId: room01?.id ?? 1 } },
    update: {},
    create: {
      businessDate: new Date('2026-10-19'),
      roomId: room01?.id ?? 1,
      openingBalance: 18_250_000,
      calculatedBalance: 19_450_000,
      countedBalance: 19_400_000,
      differenceAmount: -50_000,
      reason: 'Thối thừa tiền lẻ cho bệnh nhân cạo vôi răng ca sáng',
      recordedById: accountingUser?.id ?? 1,
    },
  });

  // Period Lock (Tháng 9/2026 đã khóa)
  await prisma.accountingPeriodLock.upsert({
    where: { year_month: { year: 2026, month: 9 } },
    update: {},
    create: {
      year: 2026,
      month: 9,
      reason: 'Khóa sổ kế toán tháng 09/2026 theo quy chế phòng khám.',
      lockedById: adminUser?.id ?? 1,
    },
  });

  // Refund Request
  const pt01 = await prisma.accountingEntry.findFirst({ where: { sourceCode: 'PT20261018/0001' } });
  if (pt01 && patientMap.get('MBN20261710/0001')) {
    const existingRefund = await prisma.refundRequest.findFirst({ where: { originalEntryId: pt01.id } });
    if (!existingRefund) {
      await prisma.refundRequest.create({ data: {
        originalEntryId: pt01.id,
        patientId: patientMap.get('MBN20261710/0001')!,
        amount: 300_000,
        reason: 'Bệnh nhân tạm hoãn thực hiện thủ thuật lấy tủy do sức khỏe, xin hoàn lại phần cọc chưa dùng.',
        status: 'PENDING_APPROVAL',
        createdById: accountingUser?.id ?? 1,
      } });
    }
  }

  // Audit Logs
  const auditSeed = [
    { entityType: 'PERIOD_LOCK', entityId: 1, action: 'LOCK_PERIOD', reason: 'Khóa kỳ kế toán tháng 9/2026', actorId: adminUser?.id },
    { entityType: 'ACCOUNTING_ENTRY', entityId: 1, action: 'CONFIRM_TAX', reason: 'Xác nhận mức thuế suất dịch vụ điều trị 0%', actorId: accountingUser?.id },
  ];
  for (const a of auditSeed) {
    const existing = await prisma.accountingAuditLog.findFirst({ where: { entityType: a.entityType, action: a.action } });
    if (!existing) {
      await prisma.accountingAuditLog.create({ data: {
        entityType: a.entityType,
        entityId: a.entityId,
        action: a.action,
        reason: a.reason,
        actorId: a.actorId,
      } });
    }
  }

  // ============================================================
  // HR & PERSONNEL ADMINISTRATION SEED
  // ============================================================
  console.log('Seeding HR & Personnel Administration Module...');

  // 1. Role Configuration (Forbidden combinations & default rates)
  await prisma.roleConfiguration.upsert({
    where: { configKey: 'FORBIDDEN_ROLE_COMBINATIONS' },
    update: {},
    create: {
      configKey: 'FORBIDDEN_ROLE_COMBINATIONS',
      configValue: JSON.stringify([
        { roleA: 'ACCOUNTING_STAFF', roleB: 'WAREHOUSE_MANAGEMENT', reason: 'Kế toán không được kiêm nhiệm Quản lý kho để đảm bảo kiểm soát nội bộ và tính toàn vẹn vật tư.' },
        { roleA: 'ACCOUNTING_STAFF', roleB: 'RECEPTION_STAFF', reason: 'Kế toán không được trực tiếp thu tiền tại quầy tiếp nhận để phân tách dòng tiền.' },
      ]),
      description: 'Danh mục các tổ hợp vai trò bị cấm kiêm nhiệm',
      updatedById: adminUser?.id,
    },
  });

  await prisma.roleConfiguration.upsert({
    where: { configKey: 'DEFAULT_INCENTIVE_RATE' },
    update: {},
    create: {
      configKey: 'DEFAULT_INCENTIVE_RATE',
      configValue: '5.00',
      description: 'Tỷ lệ thưởng dịch vụ mặc định (5% cho bác sĩ, 5% cho tiếp nhận)',
      updatedById: adminUser?.id,
    },
  });

  // 1b. Working Hours Configuration (Set from HR)
  const existingConfig = await prisma.workingHoursConfig.findFirst({
    where: { effectiveDate: new Date('2026-01-01T00:00:00.000Z') },
  });
  if (!existingConfig) {
    await prisma.workingHoursConfig.create({
      data: {
        startTime: '08:00',
        endTime: '17:30',
        splitTime: '12:00',
        effectiveDate: new Date('2026-01-01T00:00:00.000Z'),
        note: 'Quy định khung giờ làm việc phòng khám DentalKhoi: Thứ 2 đến Thứ 7 (08:00 - 17:30)',
      },
    });
  }

  // 2. Work Shifts
  const shiftDefs = [
    { code: 'CA_HANH_CHINH', name: 'Ca hành chính (08:00 - 17:30)', startTime: '08:00', endTime: '17:30', shiftType: 'REGULAR' },
    { code: 'CA_SANG', name: 'Ca sáng (08:00 - 12:00)', startTime: '08:00', endTime: '12:00', shiftType: 'REGULAR' },
    { code: 'CA_CHIEU', name: 'Ca chiều (13:30 - 17:30)', startTime: '13:30', endTime: '17:30', shiftType: 'REGULAR' },
    { code: 'CA_TOI', name: 'Ca tối (18:00 - 21:00)', startTime: '18:00', endTime: '21:00', shiftType: 'REGULAR' },
    { code: 'CA_TRUC', name: 'Ca trực cấp cứu (21:00 - 08:00)', startTime: '21:00', endTime: '08:00', shiftType: 'ON_DUTY' },
  ];
  const shiftMap = new Map<string, number>();
  for (const s of shiftDefs) {
    const shift = await prisma.workShift.upsert({
      where: { code: s.code },
      update: { name: s.name, startTime: s.startTime, endTime: s.endTime, shiftType: s.shiftType },
      create: s,
    });
    shiftMap.set(s.code, shift.id);
  }

  // 3. Employees
  const allUsers = await prisma.user.findMany({ include: { role: true } });
  const userByUsername = new Map(allUsers.map((u) => [u.username, u]));
  const hrUser = userByUsername.get('hr');

  // Avoid unique constraint conflicts on userId
  try {
    // In SQL Server, unique constraint on nullable column only allows one NULL, so ignore if fails
    // or upsert employees directly
  } catch {}

  const employeeDefs = [
    {
      code: 'NV-0001', username: 'admin', fullName: 'Trần Nguyễn Minh Khôi', gender: 'Nam', phone: '0901000001',
      dateOfBirth: new Date('1988-04-12'), email: 'khoi.tran@dentalkhoi.vn', title: 'Giám đốc Điều hành & Quản trị Hệ thống',
      department: 'Ban Quản Trị', joinDate: new Date('2024-01-01'), baseSalary: 35_000_000, fixedAllowance: 5_000_000,
      bankName: 'Vietcombank', bankAccountNumber: '0071001234567', bankAccountName: 'TRAN NGUYEN MINH KHOI', citizenId: '079088001122', insuranceCode: 'BH7901234567',
    },
    {
      code: 'NV-0002', username: 'hr', fullName: 'Lê Thị Nhân Sự', gender: 'Nữ', phone: '0901000002',
      dateOfBirth: new Date('1992-06-18'), email: 'nhansu@dentalcare.vn', title: 'Trưởng phòng Hành chính - Nhân sự & Quản lý',
      department: 'Phòng Hành chính - Nhân sự & Quản lý', joinDate: new Date('2024-02-01'), baseSalary: 22_000_000, fixedAllowance: 3_500_000,
      bankName: 'MBBank', bankAccountNumber: '0801234567890', bankAccountName: 'LE THI NHAN SU', citizenId: '079092003344', insuranceCode: 'BH7901234568',
    },
    {
      code: 'NV-0003', username: 'reception', fullName: 'Trần Thị Tiếp Nhận', gender: 'Nữ', phone: '0901000003',
      dateOfBirth: new Date('1996-03-14'), email: 'tiepnhan@dentalcare.vn', title: 'Tổ trưởng Lễ tân & Thu ngân (Quầy đón tiếp trung tâm)',
      department: 'Phòng Tiếp nhận', joinDate: new Date('2024-05-10'), baseSalary: 13_000_000, fixedAllowance: 2_000_000,
      bankName: 'ACB', bankAccountNumber: '2468135790', bankAccountName: 'TRAN THI TIEP NHAN', citizenId: '079096005566', insuranceCode: 'BH7901234569',
    },
    {
      code: 'NV-0004', username: 'reception-hoa', fullName: 'Nguyễn Thanh Hoa', gender: 'Nữ', phone: '0901000004',
      dateOfBirth: new Date('1997-08-22'), email: 'hoa.reception@dentalcare.vn', title: 'Nhân viên Lễ tân & Chăm sóc khách hàng (Quầy 01)',
      department: 'Phòng Tiếp nhận', joinDate: new Date('2024-06-01'), baseSalary: 11_000_000, fixedAllowance: 1_500_000,
      bankName: 'Techcombank', bankAccountNumber: '1903882211001', bankAccountName: 'NGUYEN THANH HOA', citizenId: '079097004455', insuranceCode: 'BH7901234570',
    },
    {
      code: 'NV-0005', username: 'reception-mai', fullName: 'Võ Phương Mai', gender: 'Nữ', phone: '0901000005',
      dateOfBirth: new Date('1999-12-05'), email: 'mai.reception@dentalcare.vn', title: 'Nhân viên Tiếp nhận & Điều phối ca khám (Quầy 02)',
      department: 'Phòng Tiếp nhận', joinDate: new Date('2024-07-15'), baseSalary: 11_000_000, fixedAllowance: 1_500_000,
      bankName: 'Vietinbank', bankAccountNumber: '101877665544', bankAccountName: 'VO PHUONG MAI', citizenId: '079099006677', insuranceCode: 'BH7901234571',
    },
    {
      code: 'NV-0006', username: 'doctor-minh', fullName: 'BS. CKI. Nguyễn Hoàng Minh', gender: 'Nam', phone: '0901000006',
      dateOfBirth: new Date('1983-12-10'), email: 'bs.minh@dentalcare.vn', title: 'Bác sĩ CKI Nha khoa tổng quát & Phục hình',
      department: 'Khối Chuyên môn Lâm sàng', roomId: 1, joinDate: new Date('2024-01-01'), baseSalary: 28_000_000, fixedAllowance: 3_500_000,
      bankName: 'Vietcombank', bankAccountNumber: '0071009988776', bankAccountName: 'NGUYEN HOANG MINH', citizenId: '079083007788', insuranceCode: 'BH7901234572',
    },
    {
      code: 'NV-0007', username: 'doctor-lan', fullName: 'BS. ThS. Trần Ngọc Lan', gender: 'Nữ', phone: '0901000007',
      dateOfBirth: new Date('1987-07-22'), email: 'bs.lan@dentalcare.vn', title: 'Bác sĩ Thạc sĩ Thẩm mỹ & Chỉnh nha',
      department: 'Khối Chuyên môn Lâm sàng', roomId: 2, joinDate: new Date('2024-02-15'), baseSalary: 30_000_000, fixedAllowance: 4_000_000,
      bankName: 'Techcombank', bankAccountNumber: '1903998877665', bankAccountName: 'TRAN NGOC LAN', citizenId: '079087008899', insuranceCode: 'BH7901234573',
    },
    {
      code: 'NV-0008', username: 'doctor-huy', fullName: 'BS. CKI. Lê Quốc Huy', gender: 'Nam', phone: '0901000008',
      dateOfBirth: new Date('1980-05-30'), email: 'bs.huy@dentalcare.vn', title: 'Bác sĩ CKI Tiểu phẫu & Cấy ghép Implant',
      department: 'Khối Chuyên môn Lâm sàng', roomId: 3, joinDate: new Date('2024-01-10'), baseSalary: 32_000_000, fixedAllowance: 4_500_000,
      bankName: 'BIDV', bankAccountNumber: '1201000888999', bankAccountName: 'LE QUOC HUY', citizenId: '079080009900', insuranceCode: 'BH7901234574',
    },
    {
      code: 'NV-0009', username: 'warehouse', fullName: 'Phạm Văn Kho', gender: 'Nam', phone: '0901000009',
      dateOfBirth: new Date('1991-08-05'), email: 'kho@dentalcare.vn', title: 'Tổ trưởng Quản lý Kho Dược & Vật tư Y tế',
      department: 'Bộ phận Quản lý Kho', joinDate: new Date('2024-04-01'), baseSalary: 13_500_000, fixedAllowance: 1_500_000,
      bankName: 'VPBank', bankAccountNumber: '1597534862', bankAccountName: 'PHAM VAN KHO', citizenId: '079091006677', insuranceCode: 'BH7901234575',
    },
    {
      code: 'NV-0010', username: 'accounting', fullName: 'Hoàng Thị Kế Toán', gender: 'Nữ', phone: '0901000010',
      dateOfBirth: new Date('1990-11-25'), email: 'ketoan@dentalcare.vn', title: 'Kế toán trưởng phụ trách Tài chính - Thu chi',
      department: 'Phòng Tài chính - Kế toán', joinDate: new Date('2024-02-01'), baseSalary: 18_000_000, fixedAllowance: 2_500_000,
      bankName: 'Vietinbank', bankAccountNumber: '101889900112', bankAccountName: 'HOANG THI KE TOAN', citizenId: '079090004455', insuranceCode: 'BH7901234576',
    },
  ];

  const employeeMap = new Map<string, number>();
  for (const emp of employeeDefs) {
    const user = userByUsername.get(emp.username);
    const employee = await prisma.employee.upsert({
      where: { code: emp.code },
      update: {
        fullName: emp.fullName,
        dateOfBirth: emp.dateOfBirth,
        gender: emp.gender,
        phone: emp.phone,
        email: emp.email,
        citizenId: emp.citizenId,
        title: emp.title,
        department: emp.department,
        roomId: emp.roomId ?? null,
        joinDate: emp.joinDate,
        status: 'ACTIVE',
        insuranceCode: emp.insuranceCode,
        insuranceStartDate: emp.joinDate,
        bankName: emp.bankName,
        bankAccountNumber: emp.bankAccountNumber,
        bankAccountName: emp.bankAccountName,
        baseSalary: emp.baseSalary,
        fixedAllowance: emp.fixedAllowance,
        userId: user?.id,
      },
      create: {
        code: emp.code,
        fullName: emp.fullName,
        dateOfBirth: emp.dateOfBirth,
        gender: emp.gender,
        phone: emp.phone,
        email: emp.email,
        citizenId: emp.citizenId,
        title: emp.title,
        department: emp.department,
        roomId: emp.roomId,
        joinDate: emp.joinDate,
        status: 'ACTIVE',
        insuranceCode: emp.insuranceCode,
        insuranceStartDate: emp.joinDate,
        bankName: emp.bankName,
        bankAccountNumber: emp.bankAccountNumber,
        bankAccountName: emp.bankAccountName,
        baseSalary: emp.baseSalary,
        fixedAllowance: emp.fixedAllowance,
        userId: user?.id,
      },
    });
    employeeMap.set(emp.code, employee.id);

    // Seed Labor Contract
    const existingContract = await prisma.employeeContract.findFirst({ where: { employeeId: employee.id } });
    if (!existingContract) {
      await prisma.employeeContract.create({
        data: {
          employeeId: employee.id,
          contractNumber: `HDLD-${emp.code}/2024`,
          contractType: 'KHONG_THOI_HAN',
          startDate: emp.joinDate,
          note: 'Hợp đồng lao động chính thức không xác định thời hạn',
        },
      });
    }

    // Seed UserRoleAssignment (multi-role)
    if (user) {
      await prisma.userRoleAssignment.upsert({
        where: { userId_roleId: { userId: user.id, roleId: user.roleId } },
        update: { isPrimary: true, isApproved: true },
        create: {
          userId: user.id,
          roleId: user.roleId,
          isPrimary: true,
          isApproved: true,
          assignedById: adminUser?.id,
          approvedById: hrUser?.id ?? adminUser?.id,
          approvedAt: new Date(),
        },
      });
    }
  }

  // 4. Shift Assignments & Attendance Records for October & November 2026 (Mon - Sat, HR working hours: 08:00 - 17:30)
  const caHanhChinhId = shiftMap.get('CA_HANH_CHINH')!;
  const doctors = ['NV-0006', 'NV-0007', 'NV-0008'];
  const baseStaff = ['NV-0001', 'NV-0002', 'NV-0003', 'NV-0004', 'NV-0005', 'NV-0009', 'NV-0010'];
  const allStaffCodes = [...doctors, ...baseStaff];

  // Seed October 2026 (days 1 to 31, Mon - Sat)
  for (let day = 1; day <= 31; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const date = new Date(`2026-10-${dayStr}T00:00:00.000Z`);
    const dayOfWeek = date.getUTCDay();
    if (dayOfWeek === 0) continue; // Skip Sunday

    for (const empCode of allStaffCodes) {
      const empId = employeeMap.get(empCode)!;
      // Shift assignment: Mon - Sat with HR working hours
      const existingShift = await prisma.shiftAssignment.findFirst({
        where: { employeeId: empId, date },
      });
      const doctorRoomId = empCode === 'NV-0006' ? 1 : empCode === 'NV-0007' ? 2 : empCode === 'NV-0008' ? 3 : null;

      if (!existingShift) {
        await prisma.shiftAssignment.create({
          data: {
            employeeId: empId,
            shiftId: caHanhChinhId,
            date,
            roomId: doctorRoomId,
            note: 'Ca hành chính Thứ 2 - Thứ 7 theo giờ HR (08:00 - 17:30)',
          },
        });
      } else {
        await prisma.shiftAssignment.update({
          where: { id: existingShift.id },
          data: {
            shiftId: caHanhChinhId,
            roomId: doctorRoomId,
            note: 'Ca hành chính Thứ 2 - Thứ 7 theo giờ HR (08:00 - 17:30)',
          },
        });
      }

      // Attendance records for past days (up to Oct 22)
      if (day <= 22) {
        const existingAtt = await prisma.attendanceRecord.findUnique({
          where: { employeeId_date: { employeeId: empId, date } },
        });
        if (!existingAtt) {
          const isLate = day === 6 && empCode === 'NV-0003'; // Reception late 15 mins on Oct 6
          const isOnLeave = day === 14 && empCode === 'NV-0007'; // BS Lan on leave Oct 14
          await prisma.attendanceRecord.create({
            data: {
              employeeId: empId,
              date,
              status: isOnLeave ? 'ON_LEAVE' : isLate ? 'LATE' : 'PRESENT',
              checkInTime: isOnLeave ? null : isLate ? '08:15' : '07:55',
              checkOutTime: isOnLeave ? null : '17:35',
              lateMinutes: isLate ? 15 : 0,
              leaveType: isOnLeave ? 'PAID_LEAVE' : null,
              overtimeHours: day === 10 && doctors.includes(empCode) ? 1.5 : 0,
              isOnDuty: false,
              isLocked: false,
            },
          });
        }
      }
    }
  }

  // Seed November 2026 (days 1 to 30, Mon - Sat)
  for (let day = 1; day <= 30; day++) {
    const dayStr = day < 10 ? `0${day}` : `${day}`;
    const date = new Date(`2026-11-${dayStr}T00:00:00.000Z`);
    const dayOfWeek = date.getUTCDay();
    if (dayOfWeek === 0) continue; // Skip Sunday

    for (const empCode of allStaffCodes) {
      const empId = employeeMap.get(empCode)!;
      const existingShift = await prisma.shiftAssignment.findFirst({
        where: { employeeId: empId, date },
      });
      const doctorRoomId = empCode === 'NV-0006' ? 1 : empCode === 'NV-0007' ? 2 : empCode === 'NV-0008' ? 3 : null;

      if (!existingShift) {
        await prisma.shiftAssignment.create({
          data: {
            employeeId: empId,
            shiftId: caHanhChinhId,
            date,
            roomId: doctorRoomId,
            note: 'Ca hành chính Thứ 2 - Thứ 7 theo giờ HR (08:00 - 17:30)',
          },
        });
      }
    }
  }

  // 5. Service Incentives for Doctors and Receptionists (5% each independently)
  const completedExams = await prisma.doctorExamination.findMany({
    where: { status: 'COMPLETED' },
    include: { intake: { include: { services: { include: { service: true } } } } },
  });

  const receptionEmpId = employeeMap.get('NV-0003')!;
  for (const exam of completedExams) {
    const doctorEmp = allUsers.find((u) => u.id === exam.doctorId)?.username;
    const doctorEmpId = doctorEmp === 'doctor-minh' ? employeeMap.get('NV-0006') : doctorEmp === 'doctor-lan' ? employeeMap.get('NV-0007') : employeeMap.get('NV-0008');

    for (const serviceLine of exam.intake.services) {
      const lineAmount = serviceLine.amount;
      const incentiveVal = Math.round(lineAmount * 0.05);

      // Doctor incentive (5%)
      if (doctorEmpId) {
        const existingDocIncentive = await prisma.serviceIncentive.findUnique({
          where: { intakeServiceId_roleType: { intakeServiceId: serviceLine.id, roleType: 'DOCTOR' } },
        });
        if (!existingDocIncentive) {
          await prisma.serviceIncentive.create({
            data: {
              intakeServiceId: serviceLine.id,
              examinationId: exam.id,
              employeeId: doctorEmpId,
              roleType: 'DOCTOR',
              serviceName: serviceLine.service.name,
              serviceAmount: lineAmount,
              rate: 5.0,
              incentiveAmount: incentiveVal,
              status: 'VALID',
              completedAt: exam.completedAt ?? new Date(),
            },
          });
        }
      }

      // Reception incentive (5%)
      const existingRecIncentive = await prisma.serviceIncentive.findUnique({
        where: { intakeServiceId_roleType: { intakeServiceId: serviceLine.id, roleType: 'RECEPTION' } },
      });
      if (!existingRecIncentive) {
        await prisma.serviceIncentive.create({
          data: {
            intakeServiceId: serviceLine.id,
            examinationId: exam.id,
            employeeId: receptionEmpId,
            roleType: 'RECEPTION',
            serviceName: serviceLine.service.name,
            serviceAmount: lineAmount,
            rate: 5.0,
            incentiveAmount: incentiveVal,
            status: 'VALID',
            completedAt: exam.completedAt ?? new Date(),
          },
        });
      }
    }
  }

  // 6. Payroll for Month 10/2026 (Draft) & Month 09/2026 (Locked & Paid)
  // Month 10/2026 (DRAFT)
  const existingPayroll10 = await prisma.payroll.findFirst({ where: { year: 2026, month: 10 } });
  if (!existingPayroll10 && hrUser) {
    const payroll10 = await prisma.payroll.create({
      data: {
        code: 'BL202610/0001',
        year: 2026,
        month: 10,
        title: 'Bảng lương cán bộ nhân viên tháng 10/2026',
        standardWorkingDays: 26,
        status: 'DRAFT',
        createdById: hrUser.id,
        note: 'Bảng lương kỳ tháng 10/2026 đang tính thử nghiệm',
      },
    });

    let totalGross10 = 0;
    let totalDeductions10 = 0;
    let totalNet10 = 0;

    for (const empDef of employeeDefs) {
      const empId = employeeMap.get(empDef.code)!;
      const actualDays = 16.0; // Up to Oct 19
      const attSalary = Math.round((empDef.baseSalary / 26) * actualDays);
      const allowance = empDef.fixedAllowance;

      // Sum incentives
      const empIncentives = await prisma.serviceIncentive.findMany({
        where: { employeeId: empId, status: 'VALID' },
      });
      const incentiveTotal = empIncentives.reduce((sum, item) => sum + item.incentiveAmount, 0);

      const gross = attSalary + allowance + incentiveTotal;
      const insurance = Math.round(empDef.baseSalary * 0.08); // Nhập số tiền bảo hiểm
      const deductions = insurance;
      const net = Math.max(0, gross - deductions);

      totalGross10 += gross;
      totalDeductions10 += deductions;
      totalNet10 += net;

      await prisma.payrollItem.create({
        data: {
          payrollId: payroll10.id,
          employeeId: empId,
          baseSalary: empDef.baseSalary,
          standardDays: 26,
          actualDays,
          attendanceSalary: attSalary,
          allowanceAmount: allowance,
          serviceIncentiveAmount: incentiveTotal,
          otherBonus: 0,
          overtimePay: 0,
          grossSalary: gross,
          insuranceDeduction: insurance,
          advanceDeduction: 0,
          otherDeduction: 0,
          totalDeductions: deductions,
          netSalary: net,
        },
      });
    }

    await prisma.payroll.update({
      where: { id: payroll10.id },
      data: { totalGross: totalGross10, totalDeductions: totalDeductions10, totalNet: totalNet10 },
    });
  }

  // Month 09/2026 (LOCKED / PAID)
  const existingPayroll09 = await prisma.payroll.findFirst({ where: { year: 2026, month: 9 } });
  if (!existingPayroll09 && hrUser) {
    const payroll09 = await prisma.payroll.create({
      data: {
        code: 'BL202609/0001',
        year: 2026,
        month: 9,
        title: 'Bảng lương cán bộ nhân viên tháng 09/2026',
        standardWorkingDays: 26,
        status: 'PAID',
        createdById: hrUser.id,
        approvedById: hrUser.id,
        approvedAt: new Date('2026-10-02T10:00:00Z'),
        lockedAt: new Date('2026-10-03T15:00:00Z'),
        paidAt: new Date('2026-10-05T09:30:00Z'),
        totalGross: 215_000_000,
        totalDeductions: 17_200_000,
        totalNet: 197_800_000,
        note: 'Đã hoàn tất thanh toán chuyển khoản qua ngân hàng Techcombank',
      },
    });

    for (const empDef of employeeDefs) {
      const empId = employeeMap.get(empDef.code)!;
      const attSalary = empDef.baseSalary; // Full month 26 days
      const allowance = empDef.fixedAllowance;
      const incentiveTotal = empDef.title.includes('Bác sĩ') ? 3_500_000 : empDef.code === 'NV-0003' ? 1_200_000 : 0;
      const gross = attSalary + allowance + incentiveTotal;
      const insurance = Math.round(empDef.baseSalary * 0.08);
      const deductions = insurance;
      const net = gross - deductions;

      await prisma.payrollItem.create({
        data: {
          payrollId: payroll09.id,
          employeeId: empId,
          baseSalary: empDef.baseSalary,
          standardDays: 26,
          actualDays: 26,
          attendanceSalary: attSalary,
          allowanceAmount: allowance,
          serviceIncentiveAmount: incentiveTotal,
          otherBonus: 500_000,
          grossSalary: gross + 500_000,
          insuranceDeduction: insurance,
          advanceDeduction: 0,
          otherDeduction: 0,
          totalDeductions: deductions,
          netSalary: net + 500_000,
          isPaid: true,
          paidAt: new Date('2026-10-05T09:30:00Z'),
        },
      });
    }
  }

  // 7. HR Audit Log
  const existingHrAudit = await prisma.hrAuditLog.findFirst();
  if (!existingHrAudit && hrUser) {
    await prisma.hrAuditLog.create({
      data: {
        entityType: 'PAYROLL',
        entityId: 1,
        action: 'LOCK_PAYROLL',
        actorId: hrUser.id,
        detailsJson: JSON.stringify({ code: 'BL202609/0001', month: 9, year: 2026, status: 'LOCKED' }),
      },
    });
  }

  console.log('HR & Personnel Administration seeding completed.');
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
