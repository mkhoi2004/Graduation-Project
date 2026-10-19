import { getSession } from '@/lib/auth-session'
import type {
  AccountingAuditLog,
  AccountingEntry,
  AccountingOverview,
  AccountingPeriodLock,
  CashReconciliation,
  Debt,
  PendingStockDocument,
  PerformanceDetail,
  RefundRequest,
  SupplierInvoice,
} from './accounting-types'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession()
  const response = await fetch(`${apiUrl}/accounting${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { Authorization: `${session.tokenType} ${session.accessToken}` } : {}),
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const error = (await response.json().catch(() => ({}))) as { message?: string | string[] }
    throw new Error(
      Array.isArray(error.message) ? error.message.join(', ') : error.message ?? 'Không thể xử lý yêu cầu kế toán.',
    )
  }
  return response.json()
}

export function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined && val !== null && val !== '') {
      q.append(key, String(val))
    }
  }
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const fetchOverview = (filters: { startDate?: string; endDate?: string; roomId?: number; serviceType?: string; supplyType?: string } = {}) =>
  request<AccountingOverview>(`/overview${buildQuery(filters)}`)

export const fetchPerformanceDetails = (filters: { startDate?: string; endDate?: string; roomId?: number } = {}) =>
  request<PerformanceDetail>(`/performance-details${buildQuery(filters)}`)

export const fetchCash = (filters: { startDate?: string; endDate?: string; roomId?: number; category?: string; paymentMethod?: string } = {}) =>
  request<AccountingEntry[]>(`/cash${buildQuery(filters)}`)

export const fetchLosses = (filters: { startDate?: string; endDate?: string; roomId?: number } = {}) =>
  request<AccountingEntry[]>(`/losses${buildQuery(filters)}`)

export const fetchDebts = (filters: { type?: string } = {}) =>
  request<Debt[]>(`/debts${buildQuery(filters)}`)

export const fetchSupplierInvoices = () =>
  request<SupplierInvoice[]>('/supplier-invoices')

export const fetchPendingStockDocuments = () =>
  request<PendingStockDocument[]>('/pending-stock-documents')

export const fetchReconciliations = () =>
  request<CashReconciliation[]>('/reconciliations')

export const fetchPeriodLocks = () =>
  request<AccountingPeriodLock[]>('/period-locks')

export const fetchRefunds = () =>
  request<RefundRequest[]>('/refunds')

export const fetchAuditLogs = () =>
  request<AccountingAuditLog[]>('/audit-logs')

export const createExpense = (body: object) =>
  request<AccountingEntry>('/expenses', { method: 'POST', body: JSON.stringify(body) })

export const confirmTax = (id: number, body: { taxRate?: number; taxAmount?: number; reason?: string }) =>
  request<AccountingEntry>(`/entries/${id}/tax`, { method: 'PUT', body: JSON.stringify(body) })

export const payDebt = (id: number, body: { amount: number; method: string; transactionCode?: string; effectiveDate: string }) =>
  request(`/debts/${id}/payments`, { method: 'POST', body: JSON.stringify(body) })

export const createInvoice = (body: object) =>
  request<SupplierInvoice>('/supplier-invoices', { method: 'POST', body: JSON.stringify(body) })

export const createRefund = (body: { originalEntryId: number; amount: number; reason: string }) =>
  request<RefundRequest>('/refunds', { method: 'POST', body: JSON.stringify(body) })

export const approveRefund = (id: number) =>
  request<RefundRequest>(`/refunds/${id}/approve`, { method: 'POST' })

export const createReconciliation = (body: { businessDate: string; roomId?: number; countedBalance: number; reason?: string }) =>
  request<CashReconciliation>('/reconciliations', { method: 'POST', body: JSON.stringify(body) })

export const confirmReconciliation = (id: number) =>
  request<CashReconciliation>(`/reconciliations/${id}/confirm`, { method: 'POST' })

export const lockPeriod = (body: { year: number; month: number; reason: string }) =>
  request<AccountingPeriodLock>('/period-locks', { method: 'POST', body: JSON.stringify(body) })
