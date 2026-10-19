export interface AccountingOverview {
  cash: {
    summary: {
      moneyIn: number
      moneyOut: number
      netCash: number
      documentCount: number
    }
    byCategory: Record<string, number>
    byMethod: Record<string, number>
    enteredTaxTotal: number
  }
  performance: {
    revenue: number
    supplyCost: number
    grossProfit: number
  }
  debt: {
    receivable: number
    payable: number
    aging: Record<string, number>
  }
  filterApplicability: {
    cash: { dateRange: boolean; roomId: boolean; serviceType: boolean; supplyType: boolean }
    performance: { dateRange: boolean; roomId: boolean; serviceType: boolean; supplyType: boolean }
    debt: { dateRange: boolean; roomId: boolean; serviceType: boolean; supplyType: boolean }
  }
}

export interface PerformanceDetail {
  byService: Array<{
    serviceId: number
    serviceType: string
    count: number
    revenue: number
    cost: number
    profit: number
  }>
  byDoctor: Array<{
    doctorId: number
    count: number
    revenue: number
    cost: number
    profit: number
  }>
}

export interface AccountingEntry {
  id: number
  eventId?: number
  ledgerView: 'CASH' | 'LOSS'
  direction: 'IN' | 'OUT' | 'NONE'
  category: string
  effectiveDate: string
  roomId?: number
  patientId?: number
  supplierId?: number
  sourceType: string
  sourceCode: string
  preTaxAmount: number
  taxRate?: number
  taxAmount: number
  totalAmount: number
  affectsCash: boolean
  paymentMethod?: string
  transactionCode?: string
  paymentStatus?: string
  documentStatus?: string
  status: string
  reversalOfId?: number
  reason?: string
  actorId?: number
  approverId?: number
  taxConfirmedAt?: string
  createdAt?: string
  patientName?: string
  patientCode?: string
  doctorName?: string
  roomName?: string
  supplierName?: string
}

export interface Debt {
  id: number
  debtType: 'PATIENT_RECEIVABLE' | 'SUPPLIER_PAYABLE' | string
  patientId?: number
  supplierId?: number
  roomId?: number
  sourceType: string
  sourceCode: string
  principalAmount: number
  paidAmount: number
  remainingAmount: number
  dueDate?: string
  ageBucket: '0-30' | '31-60' | '61-90' | '>90' | string
  status: string
  effectiveDate: string
  payments?: Array<{
    id: number
    debtId: number
    cashEntryId: number
    amount: number
    reversedAt?: string
    createdAt: string
  }>
}

export interface SupplierInvoice {
  id: number
  invoiceNumber: string
  series: string
  invoiceDate: string
  supplierId?: number
  supplierTaxCode: string
  buyerName?: string
  buyerTaxCode?: string
  buyerAddress?: string
  goodsAmount: number
  taxAmount: number
  totalAmount: number
  attachmentName?: string
  attachmentUrl?: string
  documentStatus: 'PENDING' | 'VALID' | 'INVALID' | string
  differenceNote?: string
  createdById?: number
  createdAt?: string
  stockDocuments?: Array<{
    stockDocumentId: number
    code: string
    linkedAmount: number
    totalAmount: number
  }>
}

export interface PendingStockDocument {
  id: number
  code: string
  supplierId: number
  supplierName: string
  totalAmount: number
  createdAt: string
  daysWaiting: number
  isOverdue: boolean
}

export interface CashReconciliation {
  id: number
  businessDate: string
  roomId?: number
  openingBalance: number
  calculatedBalance: number
  countedBalance: number
  differenceAmount: number
  reason?: string
  recordedById: number
  confirmedById?: number
  confirmedAt?: string
  createdAt?: string
}

export interface AccountingPeriodLock {
  id: number
  year: number
  month: number
  reason: string
  lockedById: number
  lockedAt: string
}

export interface RefundRequest {
  id: number
  originalEntryId: number
  refundEntryId?: number
  patientId: number
  amount: number
  reason: string
  status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | string
  createdById: number
  approvedById?: number
  approvedAt?: string
  createdAt: string
}

export interface AccountingAuditLog {
  id: number
  entityType: string
  entityId: number
  action: string
  actorId?: number
  reason?: string
  beforeJson?: string
  afterJson?: string
  createdAt: string
}
