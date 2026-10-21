export interface ClinicRoom {
  id: number
  code: string
  name: string
  description?: string
}

export interface QueuePatient {
  queueNumber: string
  id: string // Intake code (e.g. TN20261018/0001)
  intakeId: number
  patientCode: string
  patientName: string
  dateOfBirth: string
  gender: string
  phone: string
  note: string
  symptoms: string
  priority: 'Thường' | 'Ưu tiên'
  priorityReason?: string
  roomCode: string
  roomName: string
  issuedAt: string
  services: Array<{
    code: string
    name: string
    quantity: number
    unit?: string
  }>
}

export interface DoctorQueueSummary {
  businessDate: string
  roomCode?: string
  roomName?: string
  waitingCount: number
  priorityWaitingCount: number
  currentCallingNumber?: string
}

export interface DoctorQueueResponse {
  queue: QueuePatient[]
  summary: DoctorQueueSummary
}

export interface CallNextResponse {
  nextExaminationId: number | null
  nextExamination: ExaminationDetail | null
  queueNumber?: string
  message: string
}

export interface MarkAbsentResponse {
  absentExamination: ExaminationDetail
  nextExamination: ExaminationDetail | null
  message: string
}

export interface MedicalSupplyCatalogItem {
  id: string // supply code (e.g. 'needle-septoject')
  name: string
  group: 'THUONG' | 'VO_CAM'
  baseUnit: string
  conversionUnit?: string
  conversionRate?: number
  inStock: number
}

export interface SupplyUsageItem {
  intakeServiceId: number
  supplyCode: string
  conversionUnitUsed?: string
  quantityInBaseUnit: number
}

export interface ExaminationSupplyDetail {
  id: number
  intakeServiceId: number
  supplyCode: string
  supplyName: string
  group: 'THUONG' | 'VO_CAM'
  baseUnit: string
  conversionUnitUsed?: string
  quantityInBaseUnit: number
}

export interface ExaminationResultDetail {
  summary: string
  treatmentMethod: string
  treatmentOrientation: string
  nextAppointmentDate?: string
}

export interface ExaminationPrintHistoryItem {
  id: number
  printedAt: string
}

export interface ExaminationDetail {
  id: number
  code: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ABSENT'
  isLocked: boolean
  startedAt: string
  completedAt?: string
  cancelReason?: string
  patient: {
    code: string
    fullName: string
    dateOfBirth: string
    gender: string
    phone: string
    address?: string
    note?: string
  }
  intake: {
    code: string
    symptoms: string
    priority: 'Thường' | 'Ưu tiên'
    priorityReason?: string
    roomCode: string
    roomName: string
    services: Array<{
      intakeServiceId: number
      code: string
      name: string
      quantity: number
      unit?: string
    }>
  }
  supplies: ExaminationSupplyDetail[]
  result?: ExaminationResultDetail
  printHistories: ExaminationPrintHistoryItem[]
}
