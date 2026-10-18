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

const doctorUsers = [
  { username: 'doctor-minh', fullName: 'BS. Nguyễn Hoàng Minh' },
  { username: 'doctor-lan', fullName: 'BS. Trần Ngọc Lan' },
  { username: 'doctor-huy', fullName: 'BS. Lê Quốc Huy' },
];

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
    address: '123 Nguyễn Trãi, Quận 1, TP.HCM',
    note: 'Dị ứng nhẹ với penicillin, ê buốt răng hàm dưới khi uống nước đá.',
  },
  {
    code: 'MBN20261710/0002',
    fullName: 'Trần Thị Mai Hương',
    dateOfBirth: new Date('1998-11-20'),
    gender: 'Nữ',
    phone: '0987654321',
    address: '45 Lê Lợi, Quận Hải Châu, Đà Nẵng',
    note: 'Nhu cầu niềng răng khay trong suốt và tẩy trắng răng thẩm mỹ 2 hàm.',
  },
  {
    code: 'MBN20261710/0003',
    fullName: 'Lê Quốc Bảo',
    dateOfBirth: new Date('1985-08-03'),
    gender: 'Nam',
    phone: '0903112233',
    address: '88 Cầu Giấy, Hà Nội',
    note: 'Sưng đau nướu răng khôn hàm dưới bên trái, há miệng khó khăn.',
  },
  {
    code: 'MBN20261710/0004',
    fullName: 'Phạm Thùy Linh',
    dateOfBirth: new Date('2001-02-28'),
    gender: 'Nữ',
    phone: '0934567890',
    address: '12 Đinh Tiên Hoàng, Quận Bình Thạnh, TP.HCM',
    note: 'Khám định kỳ 6 tháng, cạo vôi răng và đánh bóng 2 hàm.',
  },
  {
    code: 'MBN20261710/0005',
    fullName: 'Hoàng Minh Tuấn',
    dateOfBirth: new Date('1978-10-10'),
    gender: 'Nam',
    phone: '0978999888',
    address: '67 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
    note: 'Răng cửa bị mẻ lớn sau va chạm, muốn bọc răng toàn sứ cao cấp.',
  },
];

async function main() {
  const passwordHash = await hash('Dental@123', 12);

  // 1. Roles & Core Users
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

  // 2. Doctor Users
  const doctorRoleId = roleMap.get('DOCTOR')!;
  for (const doc of doctorUsers) {
    await prisma.user.upsert({
      where: { username: doc.username },
      update: {
        fullName: doc.fullName,
        roleId: doctorRoleId,
      },
      create: {
        username: doc.username,
        fullName: doc.fullName,
        passwordHash,
        roleId: doctorRoleId,
      },
    });
  }

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
      const expiryDate = supply.code === 'composite-3m' ? new Date(Date.now() + 45 * 86_400_000) : supply.code === 'anesthetic-septanest' ? new Date(Date.now() - 30 * 86_400_000) : null;
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
      priority: 'Khẩn cấp',
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
