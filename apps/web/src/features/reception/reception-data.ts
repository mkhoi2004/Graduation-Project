export type Gender = 'Nam' | 'Nữ' | 'Khác'

export interface PatientDraft {
  fullName: string
  dateOfBirth: string
  gender: Gender
  phone: string
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

export type IntakeStatus = 'DRAFT' | 'READY' | 'TRANSFERRED'

export interface Intake {
  id: string
  patientId: string
  symptoms: string
  priority: 'Thường' | 'Ưu tiên' | 'Khẩn cấp'
  services: ServiceSelection[]
  roomId: string
  doctorId: string
  status: IntakeStatus
  createdAt: string
  transferredAt?: string
}

export interface DentalService {
  id: string
  category: 'Nha khoa cơ bản' | 'Thẩm mỹ & phục hình' | 'Chỉnh nha & Implant'
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

export function upsertPatient(patients: Patient[], draft: PatientDraft, now = new Date(), patientId?: string) {
  const phoneOwner = patients.find((patient) => normalizePhone(patient.phone) === normalizePhone(draft.phone))
  const selectedPatient = patientId ? patients.find((patient) => patient.id === patientId) : undefined
  if (patientId && !selectedPatient) throw new Error('Không tìm thấy hồ sơ bệnh nhân cần cập nhật.')
  if (selectedPatient && phoneOwner && phoneOwner.id !== selectedPatient.id) {
    throw new Error('Số điện thoại đã được sử dụng bởi một bệnh nhân khác.')
  }
  const existing = selectedPatient ?? phoneOwner
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
