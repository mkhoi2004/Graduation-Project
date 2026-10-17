import { getSession } from '@/lib/auth-session'
import type { DentalService, Intake, Patient, PatientDraft, ServiceSelection } from './reception-data'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function authorizedHeaders(): HeadersInit {
  const session = getSession()
  return {
    'Content-Type': 'application/json',
    ...(session ? { Authorization: `${session.tokenType} ${session.accessToken}` } : {}),
  }
}

export interface ReceptionMasterData {
  rooms: Array<{ id: string; name: string; description?: string }>
  services: DentalService[]
  doctors: Array<{ id: string; name: string; specialty: string }>
}

export async function fetchMasterData(): Promise<ReceptionMasterData> {
  const response = await fetch(`${apiUrl}/reception/master-data`, {
    headers: authorizedHeaders(),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message ?? 'Không thể tải danh mục tiếp nhận.')
  }
  return response.json()
}

export async function fetchPatients(): Promise<Patient[]> {
  const response = await fetch(`${apiUrl}/reception/patients`, {
    headers: authorizedHeaders(),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message ?? 'Không thể tải danh sách bệnh nhân.')
  }
  return response.json()
}

export async function createPatientApi(draft: PatientDraft): Promise<Patient> {
  const response = await fetch(`${apiUrl}/reception/patients`, {
    method: 'POST',
    headers: authorizedHeaders(),
    body: JSON.stringify(draft),
  })
  const payload = (await response.json().catch(() => ({}))) as Patient & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể tạo mới hồ sơ bệnh nhân.')
  }
  return payload
}

export async function updatePatientApi(patientCode: string, draft: Partial<PatientDraft>): Promise<Patient> {
  const response = await fetch(`${apiUrl}/reception/patients/${encodeURIComponent(patientCode)}`, {
    method: 'PUT',
    headers: authorizedHeaders(),
    body: JSON.stringify(draft),
  })
  const payload = (await response.json().catch(() => ({}))) as Patient & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể cập nhật hồ sơ bệnh nhân.')
  }
  return payload
}

export async function fetchIntakes(): Promise<Intake[]> {
  const response = await fetch(`${apiUrl}/reception/intakes`, {
    headers: authorizedHeaders(),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message ?? 'Không thể tải danh sách phiếu tiếp nhận.')
  }
  return response.json()
}

export async function createIntakeApi(input: {
  patientCode: string
  symptoms: string
  priority?: 'Thường' | 'Ưu tiên' | 'Khẩn cấp'
}): Promise<Intake> {
  const response = await fetch(`${apiUrl}/reception/intakes`, {
    method: 'POST',
    headers: authorizedHeaders(),
    body: JSON.stringify(input),
  })
  const payload = (await response.json().catch(() => ({}))) as Intake & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể tạo phiếu tiếp nhận.')
  }
  return payload
}

export async function updateIntakeServicesApi(
  intakeCode: string,
  input: {
    roomCode: string
    doctorUsername: string
    services: ServiceSelection[]
  },
): Promise<Intake> {
  const response = await fetch(`${apiUrl}/reception/intakes/${encodeURIComponent(intakeCode)}/services`, {
    method: 'PUT',
    headers: authorizedHeaders(),
    body: JSON.stringify({
      roomCode: input.roomCode,
      doctorUsername: input.doctorUsername,
      services: input.services.map((s) => ({
        serviceCode: s.serviceId,
        quantity: s.quantity,
      })),
    }),
  })
  const payload = (await response.json().catch(() => ({}))) as Intake & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể cập nhật dịch vụ chỉ định.')
  }
  return payload
}

export async function payCashApi(intakeCode: string): Promise<Intake> {
  const response = await fetch(`${apiUrl}/reception/intakes/${encodeURIComponent(intakeCode)}/pay-cash`, {
    method: 'POST',
    headers: authorizedHeaders(),
  })
  const payload = (await response.json().catch(() => ({}))) as Intake & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể ghi nhận thanh toán tiền mặt.')
  }
  return payload
}

export async function transferIntakeApi(intakeCode: string): Promise<Intake> {
  const response = await fetch(`${apiUrl}/reception/intakes/${encodeURIComponent(intakeCode)}/transfer`, {
    method: 'POST',
    headers: authorizedHeaders(),
  })
  const payload = (await response.json().catch(() => ({}))) as Intake & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể bàn giao hồ sơ cho bác sĩ.')
  }
  return payload
}

export async function deletePatientApi(patientCode: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const url = `${apiUrl}/reception/patients/${encodeURIComponent(patientCode)}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: authorizedHeaders(),
  })
  const payload = (await response.json().catch(() => ({}))) as { success: boolean; message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể xóa hồ sơ bệnh nhân.')
  }
  return { success: payload.success, message: payload.message ?? '' }
}

export async function deleteIntakeApi(intakeCode: string, reason?: string): Promise<{ success: boolean; message: string }> {
  const url = `${apiUrl}/reception/intakes/${encodeURIComponent(intakeCode)}${reason ? `?reason=${encodeURIComponent(reason)}` : ''}`
  const response = await fetch(url, {
    method: 'DELETE',
    headers: authorizedHeaders(),
  })
  const payload = (await response.json().catch(() => ({}))) as { success: boolean; message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể xóa phiếu tiếp nhận.')
  }
  return { success: payload.success, message: payload.message ?? '' }
}

export async function fetchDeletedBackups() {
  const response = await fetch(`${apiUrl}/reception/backup/deleted`, {
    headers: authorizedHeaders(),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message ?? 'Không thể tải bản ghi sao lưu.')
  }
  return response.json()
}

