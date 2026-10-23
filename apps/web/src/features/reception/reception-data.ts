export type Gender = 'Nam' | 'Nữ' | 'Khác'

export interface PatientDraft {
  fullName: string
  dateOfBirth: string
  gender: Gender
  phone: string
  citizenId: string
  address: string
  note: string
}

export interface Patient extends PatientDraft {
  id: string
  createdAt: string
  updatedAt: string
}

export interface ServiceSelection {
  serviceId: string
  quantity: number
}

export type IntakeStatus =
  | 'DRAFT'
  | 'READY'
  | 'PAID'
  | 'TRANSFERRED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'ABSENT'
  | 'CANCELLED'
  | 'CANCELLED_RECEPTION'

export interface IntakePayment {
  method: 'CASH' | 'MOMO' | 'VNPAY'
  status: 'PENDING' | 'PAID' | 'FAILED'
  orderId?: string
  paidAt?: string
}

export interface Intake {
  id: string
  patientId: string
  symptoms: string
  priority: 'Thường' | 'Ưu tiên'
  priorityReason?: string
  roomOverrideReason?: string
  services: ServiceSelection[]
  roomId: string
  doctorId: string
  doctorName?: string
  roomName?: string
  patientName?: string
  queueNumber?: string
  queueDate?: string
  queueStatus?: 'WAITING' | 'CALLED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ABSENT'
  currentCallingNumber?: string
  printCount?: number
  isCopy?: boolean
  status: IntakeStatus
  createdAt: string
  transferredAt?: string
  payment?: IntakePayment
}

export interface DentalService {
  id: string
  category: string
  name: string
  price: number
  unit: string
}

export const dentalServices: DentalService[] = [
  { id: 'cleaning', category: 'Nha khoa cơ bản', name: 'Cạo vôi + đánh bóng', price: 400_000, unit: '2 hàm' },
  { id: 'filling', category: 'Nha khoa cơ bản', name: 'Trám răng', price: 300_000, unit: '1 chiếc' },
  { id: 'root-front', category: 'Nha khoa cơ bản', name: 'Lấy tủy răng cửa', price: 2_000_000, unit: '1 chiếc' },
  { id: 'root-molar', category: 'Nha khoa cơ bản', name: 'Lấy tủy răng hàm', price: 3_000_000, unit: '1 chiếc' },
  { id: 'extract-normal', category: 'Nha khoa cơ bản', name: 'Nhổ răng thường', price: 300_000, unit: '1 chiếc' },
  { id: 'extract-wisdom', category: 'Nha khoa cơ bản', name: 'Nhổ răng khôn', price: 500_000, unit: '1 chiếc' },
  { id: 'whitening-clinic', category: 'Thẩm mỹ & phục hình', name: 'Tẩy trắng tại phòng', price: 3_000_000, unit: '2 hàm' },
  { id: 'whitening-home', category: 'Thẩm mỹ & phục hình', name: 'Khay tẩy tại nhà', price: 1_500_000, unit: '2 hàm' },
  { id: 'crown-metal', category: 'Thẩm mỹ & phục hình', name: 'Răng sứ kim loại', price: 1_500_000, unit: '1 cái' },
  { id: 'crown-ceramic', category: 'Thẩm mỹ & phục hình', name: 'Răng toàn sứ', price: 8_000_000, unit: '1 cái' },
  { id: 'crown-premium', category: 'Thẩm mỹ & phục hình', name: 'Răng toàn sứ cao cấp', price: 15_000_000, unit: '1 cái' },
  { id: 'braces-metal', category: 'Chỉnh nha & Implant', name: 'Niềng mắc cài kim loại', price: 40_000_000, unit: '2 hàm' },
  { id: 'braces-ceramic', category: 'Chỉnh nha & Implant', name: 'Niềng mắc cài sứ / tự buộc', price: 50_000_000, unit: '2 hàm' },
  { id: 'aligner', category: 'Chỉnh nha & Implant', name: 'Niềng khay trong suốt', price: 70_000_000, unit: '2 hàm' },
]

export const clinicRooms = [
  { id: 'room-01', name: 'Phòng khám 01' },
  { id: 'room-02', name: 'Phòng khám 02' },
  { id: 'room-03', name: 'Phòng tiểu phẫu' },
]

export const doctors = [
  { id: 'doctor-minh', name: 'BS. Nguyễn Hoàng Minh', specialty: 'Nha khoa tổng quát' },
  { id: 'doctor-lan', name: 'BS. Trần Ngọc Lan', specialty: 'Chỉnh nha' },
  { id: 'doctor-huy', name: 'BS. Lê Quốc Huy', specialty: 'Phục hình & Implant' },
]

function dateStamp(date: Date): string {
  const year = date.getFullYear()
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}${day}${month}`
}

export function createDailyCode(prefix: 'MBN' | 'TNK', existingCodes: string[], date = new Date()): string {
  const base = `${prefix}${dateStamp(date)}/`
  const lastSequence = existingCodes
    .filter((code) => code.startsWith(base))
    .map((code) => Number(code.slice(base.length)))
    .filter(Number.isFinite)
    .reduce((highest, value) => Math.max(highest, value), 0)

  return `${base}${String(lastSequence + 1).padStart(4, '0')}`
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

export function validateCitizenId(citizenId: string, dateOfBirth?: string, gender?: Gender): void {
  const trimmed = citizenId?.trim() ?? ''
  if (!trimmed) {
    throw new Error('Số CCCD là bắt buộc trong hồ sơ khi khám.')
  }
  if (!/^\d{12}$/.test(trimmed)) {
    throw new Error('Số CCCD phải có đúng 12 chữ số.')
  }
  if (/^(\d)\1{11}$/.test(trimmed)) {
    throw new Error('Số CCCD không hợp lệ (không được trùng lặp toàn bộ 12 chữ số).')
  }

  // 1. 3 số đầu tiên: Mã tỉnh, thành phố trực thuộc trung ương (từ 001 đến 096)
  const provinceCode = trimmed.slice(0, 3)
  const provinceNum = parseInt(provinceCode, 10)
  if (provinceNum < 1 || provinceNum > 96) {
    throw new Error(`3 chữ số đầu của CCCD (${provinceCode}) không hợp lệ. Mã tỉnh/thành phố phải nằm trong khoảng từ 001 đến 096.`)
  }

  // 2 & 3. Đối chiếu thế kỷ, giới tính và 2 số cuối năm sinh nếu có thông tin
  if (dateOfBirth) {
    const birthYear = parseInt(dateOfBirth.split('-')[0], 10)
    if (!isNaN(birthYear)) {
      const centuryGenderChar = trimmed[3]
      const centuryGenderDigit = parseInt(centuryGenderChar, 10)

      let expectedMaleDigit: number
      let expectedFemaleDigit: number

      if (birthYear >= 1900 && birthYear <= 1999) {
        expectedMaleDigit = 0
        expectedFemaleDigit = 1
      } else if (birthYear >= 2000 && birthYear <= 2099) {
        expectedMaleDigit = 2
        expectedFemaleDigit = 3
      } else if (birthYear >= 1800 && birthYear <= 1899) {
        expectedMaleDigit = 8
        expectedFemaleDigit = 9
      } else if (birthYear >= 2100 && birthYear <= 2199) {
        expectedMaleDigit = 4
        expectedFemaleDigit = 5
      } else {
        expectedMaleDigit = 0
        expectedFemaleDigit = 1
      }

      if (gender === 'Nam' && centuryGenderDigit !== expectedMaleDigit) {
        throw new Error(
          `Chữ số thứ 4 của CCCD (${centuryGenderChar}) không hợp lệ với nam giới sinh năm ${birthYear}. Theo quy định pháp luật phải là chữ số ${expectedMaleDigit}.`
        )
      } else if (gender === 'Nữ' && centuryGenderDigit !== expectedFemaleDigit) {
        throw new Error(
          `Chữ số thứ 4 của CCCD (${centuryGenderChar}) không hợp lệ với nữ giới sinh năm ${birthYear}. Theo quy định pháp luật phải là chữ số ${expectedFemaleDigit}.`
        )
      } else if (
        gender === 'Khác' &&
        centuryGenderDigit !== expectedMaleDigit &&
        centuryGenderDigit !== expectedFemaleDigit
      ) {
        throw new Error(
          `Chữ số thứ 4 của CCCD (${centuryGenderChar}) không hợp lệ với người sinh năm ${birthYear}. Theo quy định pháp luật phải là chữ số ${expectedMaleDigit} hoặc ${expectedFemaleDigit}.`
        )
      }

      // 2 số kế tiếp: Hai số cuối của năm sinh công dân
      const yearDigits = trimmed.slice(4, 6)
      const expectedYearDigits = String(birthYear).slice(-2)
      if (yearDigits !== expectedYearDigits) {
        throw new Error(
          `Chữ số thứ 5 và 6 của CCCD (${yearDigits}) không khớp với 2 số cuối của năm sinh (${expectedYearDigits}).`
        )
      }
    }
  }

  // 4. 6 số cuối cùng: Khoảng số ngẫu nhiên giúp phân biệt cá nhân
  const randomPart = trimmed.slice(6, 12)
  if (randomPart === '000000') {
    throw new Error('6 chữ số cuối của CCCD không được là 000000 (dãy số ngẫu nhiên không hợp lệ).')
  }
  if (/^(\d)\1{5}$/.test(randomPart)) {
    throw new Error(
      `6 chữ số cuối của CCCD (${randomPart}) không hợp lệ (không được là các chữ số lặp lại giống nhau).`
    )
  }
  if (randomPart === '123456' || randomPart === '654321') {
    throw new Error('6 chữ số cuối của CCCD không được là dãy số liên tiếp đơn giản (123456/654321).')
  }
}

export function upsertPatient(patients: Patient[], draft: PatientDraft, now = new Date(), patientId?: string) {
  if (draft.phone && draft.phone.trim().length > 0 && draft.phone.trim().length < 9) {
    throw new Error('Số điện thoại không hợp lệ.')
  }
  validateCitizenId(draft.citizenId, draft.dateOfBirth, draft.gender)

  const citizenOwner = draft.citizenId ? patients.find((p) => p.citizenId && p.citizenId === draft.citizenId) : undefined
  const phoneOwner = patients.find((patient) => normalizePhone(patient.phone) === normalizePhone(draft.phone))
  const selectedPatient = patientId ? patients.find((patient) => patient.id === patientId) : undefined
  if (patientId && !selectedPatient) throw new Error('Không tìm thấy hồ sơ bệnh nhân cần cập nhật.')
  if (selectedPatient) {
    if (phoneOwner && phoneOwner.id !== selectedPatient.id) {
      throw new Error('Số điện thoại đã được sử dụng bởi một bệnh nhân khác.')
    }
    if (citizenOwner && citizenOwner.id !== selectedPatient.id) {
      throw new Error('Số CCCD đã được sử dụng bởi một bệnh nhân khác.')
    }
  } else {
    if (phoneOwner && citizenOwner && phoneOwner.id !== citizenOwner.id) {
      throw new Error('Số điện thoại và số CCCD thuộc về hai bệnh nhân khác nhau.')
    }
    if (!phoneOwner && citizenOwner) {
      throw new Error('Số CCCD đã được sử dụng bởi một bệnh nhân khác.')
    }
  }
  const existing = selectedPatient ?? phoneOwner ?? citizenOwner
  if (existing) {
    const patient = { ...existing, ...draft, updatedAt: now.toISOString() }
    return {
      patient,
      patients: patients.map((item) => item.id === patient.id ? patient : item),
      created: false,
    }
  }

  const timestamp = now.toISOString()
  const patient: Patient = {
    ...draft,
    id: createDailyCode('MBN', patients.map((item) => item.id), now),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  return { patient, patients: [...patients, patient], created: true }
}

export function calculateIntakeTotal(selections: ServiceSelection[]): number {
  return selections.reduce((total, selection) => {
    const service = dentalServices.find((item) => item.id === selection.serviceId)
    return total + (service?.price ?? 0) * Math.max(0, selection.quantity)
  }, 0)
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)
}

export function currentIsoTimestamp(): string {
  return new Date().toISOString()
}

export const demoReceptionData: { patients: Patient[]; intakes: Intake[] } = {
  patients: [
    {
      id: 'MBN20261710/0001',
      fullName: 'Nguyễn Văn An',
      dateOfBirth: '1992-05-14',
      gender: 'Nam',
      phone: '0912345678',
      citizenId: '079092123457',
      address: '123 Nguyễn Trãi, Quận 1, TP.HCM',
      note: 'Dị ứng nhẹ với penicillin, ê buốt răng hàm dưới khi uống nước đá.',
      createdAt: '2026-10-17T01:00:00.000Z',
      updatedAt: '2026-10-17T01:00:00.000Z',
    },
    {
      id: 'MBN20261710/0002',
      fullName: 'Trần Thị Mai Hương',
      dateOfBirth: '1998-11-20',
      gender: 'Nữ',
      phone: '0987654321',
      citizenId: '048198234567',
      address: '45 Lê Lợi, Quận Hải Châu, Đà Nẵng',
      note: 'Nhu cầu niềng răng khay trong suốt và tẩy trắng răng thẩm mỹ 2 hàm.',
      createdAt: '2026-10-17T01:10:00.000Z',
      updatedAt: '2026-10-17T01:10:00.000Z',
    },
    {
      id: 'MBN20261710/0003',
      fullName: 'Lê Quốc Bảo',
      dateOfBirth: '1985-08-03',
      gender: 'Nam',
      phone: '0903112233',
      citizenId: '001085345678',
      address: '88 Cầu Giấy, Hà Nội',
      note: 'Sưng đau nướu răng khôn hàm dưới bên trái, há miệng khó khăn.',
      createdAt: '2026-10-17T01:15:00.000Z',
      updatedAt: '2026-10-17T01:15:00.000Z',
    },
    {
      id: 'MBN20261710/0004',
      fullName: 'Phạm Thùy Linh',
      dateOfBirth: '2001-02-28',
      gender: 'Nữ',
      phone: '0934567890',
      citizenId: '079301456789',
      address: '12 Đinh Tiên Hoàng, Quận Bình Thạnh, TP.HCM',
      note: 'Khám định kỳ 6 tháng, cạo vôi răng và đánh bóng 2 hàm.',
      createdAt: '2026-10-17T01:20:00.000Z',
      updatedAt: '2026-10-17T01:20:00.000Z',
    },
    {
      id: 'MBN20261710/0005',
      fullName: 'Hoàng Minh Tuấn',
      dateOfBirth: '1978-10-10',
      gender: 'Nam',
      phone: '0978999888',
      citizenId: '001078567891',
      address: '67 Trần Hưng Đạo, Hoàn Kiếm, Hà Nội',
      note: 'Răng cửa bị mẻ lớn sau va chạm, muốn bọc răng toàn sứ cao cấp.',
      createdAt: '2026-10-17T01:25:00.000Z',
      updatedAt: '2026-10-17T01:25:00.000Z',
    },
  ],
  intakes: [
    {
      id: 'TNK20261710/0001',
      patientId: 'MBN20261710/0001',
      symptoms: 'Đau nhức vùng răng cấm bên phải 2 ngày, ê buốt khi ăn đồ ngọt hoặc uống lạnh.',
      priority: 'Thường',
      services: [
        { serviceId: 'filling', quantity: 1 },
        { serviceId: 'cleaning', quantity: 1 },
      ],
      roomId: 'room-01',
      doctorId: 'doctor-minh',
      status: 'TRANSFERRED',
      createdAt: '2026-10-17T01:05:00.000Z',
      transferredAt: '2026-10-17T01:30:00.000Z',
      payment: {
        method: 'CASH',
        status: 'PAID',
        paidAt: '2026-10-17T01:10:00.000Z',
      },
    },
    {
      id: 'TNK20261710/0002',
      patientId: 'MBN20261710/0003',
      symptoms: 'Răng số 8 hàm dưới bên trái sưng tấy, đau nhức dữ dội lan lên thái dương.',
      priority: 'Ưu tiên',
      priorityReason: 'Đau cấp cần được hỗ trợ',
      services: [
        { serviceId: 'extract-wisdom', quantity: 1 },
        { serviceId: 'cleaning', quantity: 1 },
      ],
      roomId: 'room-03',
      doctorId: 'doctor-huy',
      status: 'READY',
      createdAt: '2026-10-17T01:18:00.000Z',
    },
    {
      id: 'TNK20261710/0003',
      patientId: 'MBN20261710/0002',
      symptoms: 'Tư vấn niềng răng khay trong suốt và tẩy trắng răng thẩm mỹ đón sự kiện.',
      priority: 'Ưu tiên',
      services: [
        { serviceId: 'aligner', quantity: 1 },
        { serviceId: 'whitening-clinic', quantity: 1 },
      ],
      roomId: 'room-02',
      doctorId: 'doctor-lan',
      status: 'PAID',
      createdAt: '2026-10-17T01:22:00.000Z',
      payment: {
        method: 'MOMO',
        status: 'PAID',
        orderId: 'DENTAL-MOMO-DEMO-0003',
        paidAt: '2026-10-17T01:25:00.000Z',
      },
    },
    {
      id: 'TNK20261710/0004',
      patientId: 'MBN20261710/0005',
      symptoms: 'Răng cửa trên bị sứt mẻ 1/3 thân răng, cần khám phục hình thẩm mỹ.',
      priority: 'Thường',
      services: [],
      roomId: '',
      doctorId: '',
      status: 'DRAFT',
      createdAt: '2026-10-17T01:28:00.000Z',
    },
  ],
}
