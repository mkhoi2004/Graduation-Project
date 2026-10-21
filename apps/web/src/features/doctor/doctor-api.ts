import { getSession } from '../../lib/auth-session'
import type {
  ClinicRoom,
  CallNextResponse,
  DoctorQueueResponse,
  ExaminationDetail,
  ExaminationResultDetail,
  MedicalSupplyCatalogItem,
  SupplyUsageItem,
  MarkAbsentResponse,
} from './doctor-types'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function authorizedHeaders(): HeadersInit {
  const session = getSession()
  return {
    'Content-Type': 'application/json',
    ...(session ? { Authorization: `${session.tokenType} ${session.accessToken}` } : {}),
  }
}

export async function fetchDoctorRooms(): Promise<ClinicRoom[]> {
  const response = await fetch(`${apiUrl}/doctor/rooms`, {
    headers: authorizedHeaders(),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message ?? 'Không thể tải danh sách phòng khám.')
  }
  return response.json()
}

export async function fetchDoctorQueue(): Promise<DoctorQueueResponse> {
  const response = await fetch(`${apiUrl}/doctor/queue`, {
    headers: authorizedHeaders(),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message ?? 'Không thể tải hàng đợi bệnh nhân.')
  }
  return response.json()
}

export async function fetchCurrentExamining(): Promise<ExaminationDetail | null> {
  const response = await fetch(`${apiUrl}/doctor/current`, {
    headers: authorizedHeaders(),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message ?? 'Không thể kiểm tra ca khám hiện tại.')
  }
  return response.json()
}

export async function callNextPatientApi(): Promise<CallNextResponse> {
  const response = await fetch(`${apiUrl}/doctor/call-next`, {
    method: 'POST',
    headers: authorizedHeaders(),
  })
  const payload = (await response.json().catch(() => ({}))) as CallNextResponse & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể gọi số thứ tự tiếp theo.')
  }
  return payload
}

export async function markAbsentApi(examinationId: number): Promise<MarkAbsentResponse> {
  const response = await fetch(`${apiUrl}/doctor/examinations/${examinationId}/absent`, {
    method: 'POST', headers: authorizedHeaders(),
  })
  const payload = (await response.json().catch(() => ({}))) as MarkAbsentResponse & { message?: string }
  if (!response.ok) throw new Error(payload.message ?? 'Không thể đánh dấu bệnh nhân vắng mặt.')
  return payload
}

export async function fetchSuppliesCatalog(): Promise<MedicalSupplyCatalogItem[]> {
  const response = await fetch(`${apiUrl}/doctor/supplies`, {
    headers: authorizedHeaders(),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message ?? 'Không thể tải danh mục vật tư y tế.')
  }
  return response.json()
}

export async function fetchExaminationById(id: number): Promise<ExaminationDetail> {
  const response = await fetch(`${apiUrl}/doctor/examinations/${id}`, {
    headers: authorizedHeaders(),
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string }
    throw new Error(error.message ?? `Không thể tải thông tin ca khám #${id}.`)
  }
  return response.json()
}

export async function updateSuppliesApi(
  examinationId: number,
  supplies: SupplyUsageItem[],
): Promise<ExaminationDetail> {
  const response = await fetch(`${apiUrl}/doctor/examinations/${examinationId}/supplies`, {
    method: 'PUT',
    headers: authorizedHeaders(),
    body: JSON.stringify({ supplies }),
  })
  const payload = (await response.json().catch(() => ({}))) as ExaminationDetail & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể cập nhật vật tư tiêu hao.')
  }
  return payload
}

export async function updateResultApi(
  examinationId: number,
  result: ExaminationResultDetail,
): Promise<{ success: boolean }> {
  const response = await fetch(`${apiUrl}/doctor/examinations/${examinationId}/result`, {
    method: 'PUT',
    headers: authorizedHeaders(),
    body: JSON.stringify(result),
  })
  const payload = (await response.json().catch(() => ({}))) as { success?: boolean; message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể lưu kết quả điều trị.')
  }
  return { success: true }
}

export async function recordPrintHistoryApi(examinationId: number): Promise<{ success: boolean; printedAt: string }> {
  const response = await fetch(`${apiUrl}/doctor/examinations/${examinationId}/print`, {
    method: 'POST',
    headers: authorizedHeaders(),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    success: boolean
    printedAt: string
    message?: string
  }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể ghi nhận lịch sử in phiếu.')
  }
  return payload
}

export async function completeExaminationApi(examinationId: number): Promise<ExaminationDetail> {
  const response = await fetch(`${apiUrl}/doctor/examinations/${examinationId}/complete`, {
    method: 'POST',
    headers: authorizedHeaders(),
  })
  const payload = (await response.json().catch(() => ({}))) as ExaminationDetail & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể ghi sổ hoàn thành ca khám.')
  }
  return payload
}

export async function cancelExaminationApi(
  examinationId: number,
  reason: string,
): Promise<ExaminationDetail> {
  const response = await fetch(`${apiUrl}/doctor/examinations/${examinationId}/cancel`, {
    method: 'POST',
    headers: authorizedHeaders(),
    body: JSON.stringify({ reason }),
  })
  const payload = (await response.json().catch(() => ({}))) as ExaminationDetail & { message?: string }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể ngừng khám.')
  }
  return payload
}

export async function unlockExaminationApi(
  examinationId: number,
  reason: string,
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${apiUrl}/doctor/examinations/${examinationId}/unlock`, {
    method: 'POST',
    headers: authorizedHeaders(),
    body: JSON.stringify({ reason }),
  })
  const payload = (await response.json().catch(() => ({}))) as {
    success: boolean
    message: string
  }
  if (!response.ok) {
    throw new Error(payload.message ?? 'Không thể mở khóa hồ sơ.')
  }
  return payload
}
