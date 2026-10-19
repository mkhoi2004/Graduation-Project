import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AccountingOverviewPage } from './overview-page'
import { AccountingCashPage } from './cash-page'
import { AccountingDebtsPage } from './debts-page'
import { AccountingInvoicesPage } from './invoices-page'
import { AccountingControlsPage } from './controls-page'
import * as accountingApi from './accounting-api'
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

const mockOverview: AccountingOverview = {
  cash: {
    summary: {
      moneyIn: 55000000,
      moneyOut: 18000000,
      netCash: 37000000,
      documentCount: 15,
    },
    byCategory: {
      TREATMENT_COLLECTION: 45000000,
      PATIENT_ADVANCE: 10000000,
      SUPPLIER_PAYMENT: 12000000,
      CLINIC_EXPENSE: 6000000,
    },
    byMethod: {
      TRANSFER: 40000000,
      CASH: 15000000,
    },
    enteredTaxTotal: 4000000,
  },
  performance: {
    revenue: 60000000,
    supplyCost: 18000000,
    grossProfit: 42000000,
  },
  debt: {
    receivable: 8000000,
    payable: 15000000,
    aging: {
      '0-30': 5000000,
      '31-60': 2000000,
      '61-90': 1000000,
      '>90': 0,
    },
  },
  filterApplicability: {
    cash: { dateRange: true, roomId: true, serviceType: false, supplyType: false },
    performance: { dateRange: true, roomId: true, serviceType: true, supplyType: true },
    debt: { dateRange: false, roomId: false, serviceType: false, supplyType: false },
  },
}

const mockPerformanceDetail: PerformanceDetail = {
  byService: [
    {
      serviceId: 1,
      serviceType: 'TREATMENT',
      count: 12,
      revenue: 18000000,
      cost: 3600000,
      profit: 14400000,
    },
  ],
  byDoctor: [
    {
      doctorId: 1,
      count: 15,
      revenue: 30000000,
      cost: 6000000,
      profit: 24000000,
    },
  ],
}

const mockEntries: AccountingEntry[] = [
  {
    id: 1,
    sourceCode: 'PT20261019/0001',
    ledgerView: 'CASH',
    direction: 'IN',
    category: 'TREATMENT_COLLECTION',
    paymentMethod: 'TRANSFER',
    preTaxAmount: 4629630,
    taxRate: 8,
    taxAmount: 370370,
    totalAmount: 5000000,
    affectsCash: true,
    effectiveDate: '2026-10-19T00:00:00.000Z',
    sourceType: 'PATIENT_RECEIPT',
    status: 'ACTIVE',
    patientName: 'Trần Văn B',
    patientCode: 'BN-0001',
    doctorName: 'BS. Lê Thị C',
    roomName: 'Phòng 101',
  },
  {
    id: 2,
    sourceCode: 'PC20261019/0002',
    ledgerView: 'CASH',
    direction: 'OUT',
    category: 'SUPPLIER_PAYMENT',
    paymentMethod: 'TRANSFER',
    preTaxAmount: 12000000,
    taxRate: 0,
    taxAmount: 0,
    totalAmount: 12000000,
    affectsCash: true,
    effectiveDate: '2026-10-19T00:00:00.000Z',
    sourceType: 'PAYMENT_VOUCHER',
    status: 'ACTIVE',
    supplierName: 'Công ty CP Thiết bị Y tế Hoàng Long',
  },
]

const mockDebts: Debt[] = [
  {
    id: 1,
    debtType: 'PATIENT_RECEIVABLE',
    patientId: 101,
    sourceType: 'TREATMENT_PLAN',
    sourceCode: 'DT20261019/0001',
    principalAmount: 10000000,
    paidAmount: 4000000,
    remainingAmount: 6000000,
    ageBucket: '31-60',
    dueDate: '2026-09-30T00:00:00.000Z',
    status: 'PARTIAL',
    effectiveDate: '2026-09-01T00:00:00.000Z',
  },
  {
    id: 2,
    debtType: 'SUPPLIER_PAYABLE',
    supplierId: 201,
    sourceType: 'PURCHASE_RECEIPT',
    sourceCode: 'PNK20261015/0001',
    principalAmount: 8500000,
    paidAmount: 0,
    remainingAmount: 8500000,
    ageBucket: '0-30',
    dueDate: '2026-10-25T00:00:00.000Z',
    status: 'ACTIVE',
    effectiveDate: '2026-10-15T00:00:00.000Z',
  },
]

const mockInvoices: SupplierInvoice[] = [
  {
    id: 1,
    invoiceNumber: '0019283',
    series: '1C26TLL',
    invoiceDate: '2026-10-15T00:00:00.000Z',
    supplierTaxCode: '0309988771',
    buyerName: 'PHÒNG KHÁM NHA KHOA DENTALCARE',
    buyerTaxCode: '0312345678',
    buyerAddress: '123 Đường 3/2, Phường 11, Quận 10, TP. Hồ Chí Minh',
    goodsAmount: 10000000,
    taxAmount: 800000,
    totalAmount: 10800000,
    documentStatus: 'VALID',
    stockDocuments: [
      {
        stockDocumentId: 1,
        code: 'PNK20261014/0001',
        linkedAmount: 10800000,
        totalAmount: 10800000,
      },
    ],
  },
]

const mockPendingDocs: PendingStockDocument[] = [
  {
    id: 2,
    code: 'PNK20261005/0002',
    supplierId: 5,
    supplierName: 'Công ty CP Thiết bị Y tế Hoàng Long',
    totalAmount: 7500000,
    createdAt: '2026-10-05T08:30:00.000Z',
    daysWaiting: 14,
    isOverdue: true,
  },
]

const mockReconciliations: CashReconciliation[] = [
  {
    id: 1,
    businessDate: '2026-10-18T00:00:00.000Z',
    openingBalance: 0,
    calculatedBalance: 35000000,
    countedBalance: 35000000,
    differenceAmount: 0,
    recordedById: 1,
    confirmedById: 2,
    confirmedAt: '2026-10-18T18:00:00.000Z',
  },
]

const mockPeriodLocks: AccountingPeriodLock[] = [
  {
    id: 1,
    year: 2026,
    month: 9,
    reason: 'Chốt sổ tài chính tháng 9/2026',
    lockedById: 1,
    lockedAt: '2026-10-05T09:00:00.000Z',
  },
]

const mockRefunds: RefundRequest[] = [
  {
    id: 1,
    originalEntryId: 1,
    patientId: 101,
    amount: 500000,
    reason: 'Bệnh nhân điều chỉnh phác đồ, hoàn tiền thuốc tê thừa',
    status: 'PENDING_APPROVAL',
    createdById: 1,
    createdAt: '2026-10-19T09:00:00.000Z',
  },
]

const mockAuditLogs: AccountingAuditLog[] = [
  {
    id: 1,
    action: 'TAX_CONFIRM',
    entityType: 'ACCOUNTING_ENTRY',
    entityId: 1,
    actorId: 2,
    reason: 'Xác nhận khai thuế suất 8% cho PT20261019/0001',
    createdAt: '2026-10-19T08:00:00.000Z',
  },
]

describe('Accounting Feature Pages', () => {
  beforeEach(() => {
    vi.spyOn(accountingApi, 'fetchOverview').mockResolvedValue(mockOverview)
    vi.spyOn(accountingApi, 'fetchPerformanceDetails').mockResolvedValue(mockPerformanceDetail)
    vi.spyOn(accountingApi, 'fetchCash').mockResolvedValue(mockEntries)
    vi.spyOn(accountingApi, 'fetchLosses').mockResolvedValue([])
    vi.spyOn(accountingApi, 'fetchDebts').mockResolvedValue(mockDebts)
    vi.spyOn(accountingApi, 'fetchSupplierInvoices').mockResolvedValue(mockInvoices)
    vi.spyOn(accountingApi, 'fetchPendingStockDocuments').mockResolvedValue(mockPendingDocs)
    vi.spyOn(accountingApi, 'fetchReconciliations').mockResolvedValue(mockReconciliations)
    vi.spyOn(accountingApi, 'fetchPeriodLocks').mockResolvedValue(mockPeriodLocks)
    vi.spyOn(accountingApi, 'fetchRefunds').mockResolvedValue(mockRefunds)
    vi.spyOn(accountingApi, 'fetchAuditLogs').mockResolvedValue(mockAuditLogs)
    vi.spyOn(accountingApi, 'createExpense').mockResolvedValue({ id: 99, sourceCode: 'PC20261019/0099' } as any)
    vi.spyOn(accountingApi, 'payDebt').mockResolvedValue({ id: 1, remainingAmount: 0, status: 'PAID' } as any)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('1. Overview Page renders cash, performance, and debts metrics', async () => {
    render(
      <MemoryRouter initialEntries={['/accounting']}>
        <Routes>
          <Route path="/accounting" element={<AccountingOverviewPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Tổng quan kế toán quản trị')).toBeInTheDocument()
    expect(screen.getByText('1. Khối Dòng Tiền Thực Tế')).toBeInTheDocument()
    expect(screen.getByText('2. Khối Hiệu Quả Nghiệp Vụ (Lãi Gộp Ca Khám)')).toBeInTheDocument()
    expect(screen.getByText('3. Khối Công Nợ & Phân Tích Tuổi Nợ')).toBeInTheDocument()

    // Performance breakdown
    expect(screen.getByText('Bác sĩ #1')).toBeInTheDocument()
    expect(screen.getByText('Dịch vụ #1')).toBeInTheDocument()
  })

  it('2. Cash Page lists transactions, filters and opens new expense voucher modal', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/accounting/cash']}>
        <Routes>
          <Route path="/accounting/cash" element={<AccountingCashPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('PT20261019/0001')).toBeInTheDocument()
    expect(screen.getByText('PC20261019/0002')).toBeInTheDocument()

    // Click "Lập phiếu chi tiền"
    const createBtn = screen.getByRole('button', { name: /Lập phiếu chi tiền/i })
    await user.click(createBtn)

    expect(screen.getByText('Lập phiếu chi tiền mới (PC)')).toBeInTheDocument()
    expect(screen.getByText(/Khoản mục chi:/i)).toBeInTheDocument()
  })

  it('3. Debts Page shows aging buckets, balances and opens payment modal', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/accounting/debts']}>
        <Routes>
          <Route path="/accounting/debts" element={<AccountingDebtsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('DT20261019/0001')).toBeInTheDocument()
    expect(screen.getByText('Bệnh nhân #101')).toBeInTheDocument()
    expect(screen.getByText('Nhà cung cấp #201')).toBeInTheDocument()

    // Click exact "Thu tiền" button on the receivable row
    const payBtn = screen.getByRole('button', { name: /^Thu tiền$/ })
    await user.click(payBtn)

    expect(await screen.findByText(/Xử lý thanh toán công nợ/i)).toBeInTheDocument()
  })

  it('4. Invoices Page shows overdue pending stock receipts and verified invoices', async () => {
    render(
      <MemoryRouter initialEntries={['/accounting/invoices']}>
        <Routes>
          <Route path="/accounting/invoices" element={<AccountingInvoicesPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText(/1C26TLL - 0019283/i)).toBeInTheDocument()
    expect(screen.getByText(/PNK20261005\/0002/i)).toBeInTheDocument()
    expect(screen.getByText(/Chờ hóa đơn.*quá 7 ngày/i)).toBeInTheDocument()
  })

  it('5. Controls Page renders Cash Reconciliation, Period Lock, and Refund segregations', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/accounting/controls']}>
        <Routes>
          <Route path="/accounting/controls" element={<AccountingControlsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: /Kiểm quỹ tiền mặt \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Khóa kỳ kế toán \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Duyệt hoàn tiền \(1\)/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Nhật ký kiểm toán \(1\)/i })).toBeInTheDocument()

    // Switch to Period Lock tab
    await user.click(screen.getByRole('button', { name: /Khóa kỳ kế toán \(1\)/i }))
    expect(screen.getByText(/Chốt sổ tài chính tháng 9\/2026/i)).toBeInTheDocument()

    // Switch to Refund tab
    await user.click(screen.getByRole('button', { name: /Duyệt hoàn tiền \(1\)/i }))
    expect(screen.getByText(/Bệnh nhân điều chỉnh phác đồ/i)).toBeInTheDocument()
  })
})
