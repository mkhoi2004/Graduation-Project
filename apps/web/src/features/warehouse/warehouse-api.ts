import { getSession } from '@/lib/auth-session'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const headers = () => {
  const s = getSession()
  return {
    'Content-Type': 'application/json',
    ...(s ? { Authorization: `${s.tokenType} ${s.accessToken}` } : {}),
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl}/warehouse${path}`, {
    ...options,
    headers: { ...headers(), ...options?.headers },
  })
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(payload.message ?? 'Không thể xử lý yêu cầu kho.')
  return payload
}

export interface WarehouseMetrics {
  itemCount: number
  inventoryValue: number
  lowStockCount: number
  expiringCount: number
  expiredCount: number
}

export interface Batch {
  id: number
  batchNo?: string
  expiryDate?: string
  quantity: number
  unitCost: number
  originalReceiptCode?: string
  receivedAt: string
  expiryStatus?: 'NO_EXPIRY' | 'AVAILABLE' | 'EXPIRING_SOON' | 'EXPIRED'
  daysRemaining?: number | null
}

export interface WarehouseItem {
  id: number
  code: string
  name: string
  group: 'THUONG' | 'VO_CAM' | 'VAN_PHONG' | string
  baseUnit: string
  conversionUnit?: string
  conversionRate?: number
  minimumStock: number
  expiryWarningDays: number
  availableQuantity: number
  inventoryValue: number
  inventoryBatches: Batch[]
}

export interface DocumentLine {
  id: number
  documentId: number
  supplyId: number
  supply: {
    id: number
    code: string
    name: string
    group: string
    baseUnit: string
  }
  inputQuantity: number
  inputUnit: string
  conversionFactor: number
  convertedQuantity: number
  batchNo?: string
  expiryDate?: string
  inputUnitPrice: number
  vatRate: number
  goodsAmount: number
  vatAmount: number
  totalAmount: number
  allocations?: Array<{
    id: number
    batchId: number
    quantity: number
    unitCost: number
    amount: number
    batch: {
      id: number
      batchNo?: string
      expiryDate?: string
    }
  }>
}

export interface StockDocument {
  id: number
  code: string
  type: 'IN' | 'OUT'
  outboundType?: 'INTERNAL' | 'DISPOSAL' | 'PATIENT_USE' | string
  status: 'DRAFT' | 'PRINTED' | 'POSTED' | 'CANCELLED' | string
  supplierId?: number
  supplier?: {
    id: number
    code: string
    name: string
    phone?: string
    address?: string
    taxCode?: string
  }
  patientId?: number
  intakeId?: number
  doctorId?: number
  roomId?: number
  recipientDepartment?: string
  reason?: string
  nonFefoReason?: string
  goodsAmount: number
  vatAmount: number
  totalAmount: number
  totalAmountInWords?: string
  contentHash?: string
  printCount: number
  isLocked?: boolean
  createdById?: number
  postedById?: number
  printedAt?: string
  postedAt?: string
  cancelledAt?: string
  createdAt: string
  lines: DocumentLine[]
  printLogs?: Array<{
    id: number
    printedById?: number
    printedAt: string
    contentHash: string
    isCopy: boolean
  }>
  auditLogs?: Array<{
    id: number
    action: string
    actorId?: number
    changesJson?: string
    createdAt: string
  }>
}

export interface GroupSummary {
  group: string
  groupName: string
  itemCount: number
  quantity: number
  inventoryValue: number
}

export interface Overview {
  metrics: WarehouseMetrics
  groups: GroupSummary[]
  lowStock: Array<WarehouseItem & { quantity: number; value: number }>
  expiring: Array<Batch & { supply: { name: string; code: string; baseUnit: string } }>
  expired: Array<Batch & { supply: { name: string; code: string; baseUnit: string } }>
  recentDocuments: StockDocument[]
}

export interface UsageItem {
  id: string
  documentCode: string
  sourceType: 'DOCTOR_EXAM' | 'WAREHOUSE_ISSUE' | string
  supplyId: number
  supplyCode: string
  supplyName: string
  baseUnit: string
  patientCode: string
  patientName: string
  doctorName: string
  roomName: string
  usedAt: string
  batchNo: string
  quantity: number
  unitCost: number
  totalAmount: number
}

export interface Supplier {
  id: number
  code: string
  name: string
  phone?: string
  address?: string
  taxCode?: string
  isActive?: boolean
}

export interface ClinicContext {
  patients: Array<{ id: number; code: string; fullName: string; phone: string }>
  doctors: Array<{ id: number; username: string; fullName: string }>
  rooms: Array<{ id: number; code: string; name: string }>
  activeIntakes: Array<{
    id: number
    code: string
    patient: { id: number; code: string; fullName: string }
    doctor?: { id: number; fullName: string }
    room?: { id: number; name: string }
  }>
}

export const fetchOverview = () => request<Overview>('/overview')
export const fetchItems = (search = '', group = '') =>
  request<WarehouseItem[]>(`/items?search=${encodeURIComponent(search)}&group=${encodeURIComponent(group)}`)

export const createItem = (payload: {
  name: string
  group: string
  baseUnit: string
  conversionUnit?: string
  conversionRate?: number
  minimumStock?: number
  expiryWarningDays?: number
}) => request<WarehouseItem>('/items', { method: 'POST', body: JSON.stringify(payload) })

export const fetchUsage = (filters?: {
  startDate?: string
  endDate?: string
  doctorId?: number
  roomId?: number
  supplyCode?: string
}) => {
  const params = new URLSearchParams()
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)
  if (filters?.doctorId) params.set('doctorId', String(filters.doctorId))
  if (filters?.roomId) params.set('roomId', String(filters.roomId))
  if (filters?.supplyCode) params.set('supplyCode', filters.supplyCode)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request<UsageItem[]>(`/usage${qs}`)
}

export const fetchDocuments = (filters?: {
  type?: string
  status?: string
  startDate?: string
  endDate?: string
}) => {
  const params = new URLSearchParams()
  if (filters?.type) params.set('type', filters.type)
  if (filters?.status) params.set('status', filters.status)
  if (filters?.startDate) params.set('startDate', filters.startDate)
  if (filters?.endDate) params.set('endDate', filters.endDate)
  const qs = params.toString() ? `?${params.toString()}` : ''
  return request<StockDocument[]>(`/documents${qs}`)
}

export const fetchDocument = (id: number) => request<StockDocument>(`/documents/${id}`)
export const fetchSuppliers = () => request<Supplier[]>('/suppliers')
export const createSupplier = (payload: { name: string; phone?: string; address?: string; taxCode?: string }) =>
  request<Supplier>('/suppliers', { method: 'POST', body: JSON.stringify(payload) })

export const fetchClinicContext = () => request<ClinicContext>('/clinic-context')

export const createReceipt = (body: unknown) =>
  request<StockDocument>('/documents/receipts', { method: 'POST', body: JSON.stringify(body) })

export const createIssue = (body: unknown) =>
  request<StockDocument>('/documents/issues', { method: 'POST', body: JSON.stringify(body) })

export const updateDocument = (id: number, body: unknown) =>
  request<StockDocument>(`/documents/${id}`, { method: 'PUT', body: JSON.stringify(body) })

export const printDocument = (id: number) =>
  request<StockDocument & { isCopy?: boolean; totalAmountInWords?: string }>(`/documents/${id}/print`, {
    method: 'POST',
    body: '{}',
  })

export const postDocument = (id: number) =>
  request<StockDocument>(`/documents/${id}/post`, {
    method: 'POST',
    body: JSON.stringify({ idempotencyKey: `web-${id}-${Date.now()}` }),
  })

export const cancelDocument = (id: number, reason: string) =>
  request<StockDocument>(`/documents/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

export const disposeBatch = (batchId: number, data: { reason: string; quantity?: number }) =>
  request<{
    success: boolean
    message: string
    deletedBatch: any
    documentCode: string
    remainingBatchQuantity: number
    remainingSupplyStock: number
  }>(`/batches/${batchId}/dispose`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const deleteSupplyItem = (id: number, reason: string) =>
  request<{ success: boolean; message: string; deletedSupply: any }>(
    `/items/${id}?reason=${encodeURIComponent(reason)}`,
    { method: 'DELETE' },
  )

export const deleteDocument = (id: number, reason: string) =>
  request<{ success: boolean; message: string }>(
    `/documents/${id}?reason=${encodeURIComponent(reason)}`,
    { method: 'DELETE' },
  )

export const fetchDeletedBackups = () =>
  request<{
    batches: any[]
    supplies: any[]
    documents: any[]
    lines: any[]
    allocations: any[]
    ledgers: any[]
  }>('/backup/deleted')

export function readVietnameseCurrency(amount: number): string {
  if (!amount || amount === 0) return 'Không đồng'
  const absAmount = Math.abs(Math.round(amount))
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín']
  const units = ['', 'nghìn', 'triệu', 'tỷ', 'nghìn tỷ', 'triệu tỷ']

  function readGroupOfThree(num: number, showZeroHundred: boolean): string {
    const h = Math.floor(num / 100)
    const t = Math.floor((num % 100) / 10)
    const u = num % 10
    if (h === 0 && t === 0 && u === 0) return ''

    let res = ''
    if (h > 0 || showZeroHundred) {
      res += `${digits[h]} trăm `
    }

    if (t === 0 && u > 0) {
      if (h > 0 || showZeroHundred) res += 'lẻ '
      res += digits[u]
    } else if (t === 1) {
      res += 'mười '
      if (u === 1) res += 'một'
      else if (u === 5) res += 'lăm'
      else if (u > 0) res += digits[u]
    } else if (t > 1) {
      res += `${digits[t]} mươi `
      if (u === 1) res += 'mốt'
      else if (u === 5) res += 'lăm'
      else if (u > 0) res += digits[u]
    }

    return res.trim()
  }

  const str = absAmount.toString()
  const groups: number[] = []
  let idx = str.length
  while (idx > 0) {
    const start = Math.max(0, idx - 3)
    groups.push(parseInt(str.slice(start, idx), 10))
    idx = start
  }

  let words = ''
  for (let i = groups.length - 1; i >= 0; i--) {
    const grp = groups[i]
    if (grp === 0) continue
    const isNotFirst = i < groups.length - 1
    const part = readGroupOfThree(grp, isNotFirst)
    words += `${part} ${units[i]} `
  }

  words = words.trim()
  if (words.length > 0) {
    return words.charAt(0).toUpperCase() + words.slice(1) + ' đồng'
  }
  return 'Không đồng'
}
