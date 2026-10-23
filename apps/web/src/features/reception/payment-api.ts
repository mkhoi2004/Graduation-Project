import { getSession } from '@/lib/auth-session'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

function authorizedHeaders(): HeadersInit {
  const session = getSession()
  return { 'Content-Type': 'application/json', ...(session ? { Authorization: `${session.tokenType} ${session.accessToken}` } : {}) }
}

export interface PaymentCheckout {
  orderId: string
  payUrl: string
}

export type MomoCheckout = PaymentCheckout
export type VnpayCheckout = PaymentCheckout

export async function createMomoPayment(input: { intakeCode: string; amount: number }): Promise<MomoCheckout> {
  const response = await fetch(`${apiUrl}/payments/momo`, {
    method: 'POST',
    headers: authorizedHeaders(),
    body: JSON.stringify(input),
  })
  const payload = await response.json() as MomoCheckout & { message?: string }
  if (!response.ok) throw new Error(payload.message ?? 'Không thể tạo giao dịch MoMo.')
  return payload
}

export async function getMomoPaymentStatus(orderId: string) {
  const response = await fetch(`${apiUrl}/payments/momo/${encodeURIComponent(orderId)}/status`, { headers: authorizedHeaders() })
  const payload = await response.json() as { orderId: string; intakeCode: string; amount: number; status: 'PENDING' | 'PAID' | 'FAILED'; message?: string }
  if (!response.ok) throw new Error(payload.message ?? 'Không thể kiểm tra giao dịch MoMo.')
  return payload
}

export function redirectToMomo(payUrl: string): void {
  window.location.assign(payUrl)
}

export async function createVnpayPayment(input: { intakeCode: string; amount: number; bankCode?: string }): Promise<VnpayCheckout> {
  const response = await fetch(`${apiUrl}/payments/vnpay`, {
    method: 'POST',
    headers: authorizedHeaders(),
    body: JSON.stringify(input),
  })
  const payload = await response.json() as VnpayCheckout & { message?: string }
  if (!response.ok) throw new Error(payload.message ?? 'Không thể tạo giao dịch VNPAY.')
  return payload
}

export async function getVnpayPaymentStatus(orderId: string) {
  const response = await fetch(`${apiUrl}/payments/vnpay/${encodeURIComponent(orderId)}/status`, { headers: authorizedHeaders() })
  const payload = await response.json() as { orderId: string; intakeCode: string; amount: number; status: 'PENDING' | 'PAID' | 'FAILED'; message?: string }
  if (!response.ok) throw new Error(payload.message ?? 'Không thể kiểm tra giao dịch VNPAY.')
  return payload
}

export function redirectToVnpay(payUrl: string): void {
  window.location.assign(payUrl)
}
