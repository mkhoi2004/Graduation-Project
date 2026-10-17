import type { ClinicRoom, MedicalSupplyCatalogItem } from './doctor-types'

export const defaultClinicRooms: ClinicRoom[] = [
  { id: 1, code: 'room-01', name: 'Phòng khám 01', description: 'Khám tổng quát & nha khoa cơ bản' },
  { id: 2, code: 'room-02', name: 'Phòng khám 02', description: 'Thẩm mỹ & chỉnh nha' },
  { id: 3, code: 'room-03', name: 'Phòng tiểu phẫu', description: 'Tiểu phẫu răng khôn & phục hình' },
]

export const defaultMedicalSupplies: MedicalSupplyCatalogItem[] = [
  // Nhóm 1: VTYT thông thường (5 loại mẫu)
  {
    id: 'gloves-vglove',
    name: 'Găng tay cao su có bột Vglove (Khải Hoàn, Việt Nam)',
    group: 'THUONG',
    baseUnit: 'Cái',
    inStock: 2000,
  },
  {
    id: 'composite-3m',
    name: 'Composite đặc 3M Filtek Z350 XT (Mỹ)',
    group: 'THUONG',
    baseUnit: 'Tuýp',
    inStock: 20,
  },
  {
    id: 'composite-mani',
    name: 'Composite đặc MANI Nano (Nhật)',
    group: 'THUONG',
    baseUnit: 'Tuýp',
    inStock: 25,
  },
  {
    id: 'gutta-meta',
    name: 'Côn gutta máy Meta Biomed 4%–6% (Hàn Quốc)',
    group: 'THUONG',
    baseUnit: 'Cái',
    conversionUnit: 'Hộp',
    conversionRate: 60,
    inStock: 600,
  },
  {
    id: 'cement-relyx',
    name: 'Xi măng gắn RelyX U200 (3M)',
    group: 'THUONG',
    baseUnit: 'Tuýp',
    inStock: 15,
  },

  // Nhóm 2: VTYT vô cảm / Gây tê (5 loại mẫu)
  {
    id: 'needle-septoject',
    name: 'Kim tiêm Septoject (Septodont, Pháp)',
    group: 'VO_CAM',
    baseUnit: 'Kim',
    conversionUnit: 'Hộp',
    conversionRate: 100,
    inStock: 1000,
  },
  {
    id: 'needle-shinject',
    name: 'Kim tiêm gây tê Shinject (Shinhung)',
    group: 'VO_CAM',
    baseUnit: 'Kim',
    conversionUnit: 'Hộp',
    conversionRate: 100,
    inStock: 1000,
  },
  {
    id: 'needle-terumo',
    name: 'Kim tiêm tê Terumo',
    group: 'VO_CAM',
    baseUnit: 'Kim',
    conversionUnit: 'Hộp',
    conversionRate: 100,
    inStock: 1000,
  },
  {
    id: 'syringe-osung',
    name: 'Bơm tiêm áp lực Osung 1.8cc',
    group: 'VO_CAM',
    baseUnit: 'Bơm',
    inStock: 30,
  },
  {
    id: 'anesthetic-septanest',
    name: 'Septanest with Adrenaline 1/100.000 (Septodont, Pháp), articaine 4%',
    group: 'VO_CAM',
    baseUnit: 'Ống',
    conversionUnit: 'Hộp',
    conversionRate: 50,
    inStock: 500,
  },
]
