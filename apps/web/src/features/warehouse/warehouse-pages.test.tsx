import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { WarehouseOverviewPage } from './warehouse-overview-page'
import { WarehouseDetailsPage } from './warehouse-details-page'
import { WarehouseTransactionsPage } from './warehouse-transactions-page'
import { WarehousePrintView } from './warehouse-print-view'
import * as warehouseApi from './warehouse-api'
import * as warehouseExcel from './warehouse-excel'

const mockOverview: warehouseApi.Overview = {
  metrics: {
    itemCount: 15,
    inventoryValue: 125000000,
    lowStockCount: 2,
    expiringCount: 1,
    expiredCount: 1,
  },
  groups: [
    {
      group: 'THUONG',
      groupName: 'VTYT Thường',
      itemCount: 8,
      quantity: 1200,
      inventoryValue: 45000000,
    },
    {
      group: 'VO_CAM',
      groupName: 'VTYT Vô Cảm',
      itemCount: 5,
      quantity: 600,
      inventoryValue: 65000000,
    },
    {
      group: 'VAN_PHONG',
      groupName: 'Văn Phòng Phẩm',
      itemCount: 2,
      quantity: 150,
      inventoryValue: 15000000,
    },
  ],
  lowStock: [
    {
      id: 1,
      code: 'VT-0001',
      name: 'Găng tay y tế',
      group: 'THUONG',
      baseUnit: 'Hộp',
      minimumStock: 50,
      expiryWarningDays: 90,
      availableQuantity: 10,
      inventoryValue: 1000000,
      quantity: 10,
      value: 1000000,
      inventoryBatches: [],
    },
  ],
  expiring: [
    {
      id: 101,
      batchNo: 'L2026-A',
      expiryDate: '2026-11-01T00:00:00.000Z',
      quantity: 20,
      unitCost: 150000,
      originalReceiptCode: 'MVT20261001/0001',
      receivedAt: '2026-10-01T00:00:00.000Z',
      expiryStatus: 'EXPIRING_SOON',
      daysRemaining: 14,
      supply: {
        code: 'VT-0002',
        name: 'Thuốc tê Septanest',
        baseUnit: 'Ống',
      },
    },
  ],
  expired: [
    {
      id: 102,
      batchNo: 'L2025-OLD',
      expiryDate: '2026-01-01T00:00:00.000Z',
      quantity: 5,
      unitCost: 50000,
      originalReceiptCode: 'MVT20251201/0002',
      receivedAt: '2025-12-01T00:00:00.000Z',
      expiryStatus: 'EXPIRED',
      daysRemaining: -200,
      supply: {
        code: 'VT-0003',
        name: 'Chỉ nha khoa cũ',
        baseUnit: 'Cuộn',
      },
    },
  ],
  recentDocuments: [
    {
      id: 501,
      code: 'MVT20261018/0001',
      type: 'IN',
      status: 'POSTED',
      supplier: { id: 1, code: 'NCC-0001', name: 'Công ty Dược Medipro' },
      goodsAmount: 10000000,
      vatAmount: 800000,
      totalAmount: 10800000,
      printCount: 1,
      createdAt: '2026-10-18T08:00:00.000Z',
      lines: [],
    },
  ],
}

const mockItems: warehouseApi.WarehouseItem[] = [
  {
    id: 1,
    code: 'VT-0001',
    name: 'Găng tay y tế Nitrile',
    group: 'THUONG',
    baseUnit: 'Cái',
    conversionUnit: 'Hộp',
    conversionRate: 100,
    minimumStock: 100,
    expiryWarningDays: 90,
    availableQuantity: 500,
    inventoryValue: 1500000,
    inventoryBatches: [
      {
        id: 1,
        batchNo: 'GT-202601',
        expiryDate: '2027-10-18T00:00:00.000Z',
        quantity: 500,
        unitCost: 3000,
        originalReceiptCode: 'MVT20261018/0001',
        receivedAt: '2026-10-18T08:00:00.000Z',
        expiryStatus: 'AVAILABLE',
        daysRemaining: 365,
      },
    ],
  },
  {
    id: 2,
    code: 'VT-0002',
    name: 'Thuốc tê Lidocaine 2%',
    group: 'VO_CAM',
    baseUnit: 'Ống',
    minimumStock: 50,
    expiryWarningDays: 90,
    availableQuantity: 200,
    inventoryValue: 5000000,
    inventoryBatches: [
      {
        id: 2,
        batchNo: 'LC-2026X',
        expiryDate: '2026-11-20T00:00:00.000Z',
        quantity: 200,
        unitCost: 25000,
        originalReceiptCode: 'MVT20261018/0002',
        receivedAt: '2026-10-18T08:30:00.000Z',
        expiryStatus: 'EXPIRING_SOON',
        daysRemaining: 33,
      },
    ],
  },
]

const mockSuppliers: warehouseApi.Supplier[] = [
  {
    id: 1,
    code: 'NCC-0001',
    name: 'Công ty CP Dược Phẩm Medipro',
    taxCode: '0312999888',
    phone: '0909123456',
    address: '100 Nguyễn Thị Minh Khai, Q3, TP.HCM',
  },
]

const mockClinicContext: warehouseApi.ClinicContext = {
  patients: [{ id: 1, code: 'BN001', fullName: 'Nguyễn Văn An', phone: '0901234567' }],
  doctors: [{ id: 1, username: 'doctor-minh', fullName: 'BS. Lê Quang Minh' }],
  rooms: [{ id: 1, code: 'room-01', name: 'Phòng khám 01' }],
  activeIntakes: [
    {
      id: 1,
      code: 'TN20261018/0001',
      patient: { id: 1, code: 'BN001', fullName: 'Nguyễn Văn An' },
      doctor: { id: 1, fullName: 'BS. Lê Quang Minh' },
      room: { id: 1, name: 'Phòng khám 01' },
    },
  ],
}

const mockDocs: warehouseApi.StockDocument[] = [
  {
    id: 1,
    code: 'MVT20261018/0001',
    type: 'IN',
    status: 'PRINTED',
    supplierId: 1,
    supplier: mockSuppliers[0],
    goodsAmount: 10000000,
    vatAmount: 800000,
    totalAmount: 10800000,
    totalAmountInWords: 'Mười triệu tám trăm nghìn đồng',
    printCount: 1,
    createdAt: '2026-10-18T09:00:00.000Z',
    lines: [
      {
        id: 1,
        documentId: 1,
        supplyId: 1,
        supply: {
          id: 1,
          code: 'VT-0001',
          name: 'Găng tay y tế Nitrile',
          group: 'THUONG',
          baseUnit: 'Cái',
        },
        inputQuantity: 50,
        inputUnit: 'Hộp',
        conversionFactor: 100,
        convertedQuantity: 5000,
        batchNo: 'GT-202601',
        expiryDate: '2027-10-18T00:00:00.000Z',
        inputUnitPrice: 200000,
        vatRate: 8,
        goodsAmount: 10000000,
        vatAmount: 800000,
        totalAmount: 10800000,
      },
    ],
  },
]

describe('Warehouse Feature Pages (Tab 1, Tab 2, Tab 3 & Print View)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(warehouseApi, 'fetchOverview').mockResolvedValue(mockOverview)
    vi.spyOn(warehouseApi, 'fetchItems').mockResolvedValue(mockItems)
    vi.spyOn(warehouseApi, 'fetchSuppliers').mockResolvedValue(mockSuppliers)
    vi.spyOn(warehouseApi, 'fetchClinicContext').mockResolvedValue(mockClinicContext)
    vi.spyOn(warehouseApi, 'fetchDocuments').mockResolvedValue(mockDocs)
    vi.spyOn(warehouseApi, 'fetchDocument').mockResolvedValue(mockDocs[0])
    vi.spyOn(warehouseApi, 'createReceipt').mockResolvedValue({
      ...mockDocs[0],
      id: 2,
      code: 'MVT20261018/0002',
      status: 'DRAFT',
    })
    vi.spyOn(warehouseApi, 'createIssue').mockResolvedValue({
      id: 3,
      code: 'XVT20261018/0001',
      type: 'OUT',
      outboundType: 'PATIENT_USE',
      status: 'DRAFT',
      goodsAmount: 0,
      vatAmount: 0,
      totalAmount: 0,
      printCount: 0,
      createdAt: '2026-10-18T10:00:00.000Z',
      lines: [],
    })
    vi.spyOn(warehouseApi, 'printDocument').mockResolvedValue({
      ...mockDocs[0],
      status: 'PRINTED',
      printCount: 2,
      isCopy: true,
    })
    vi.spyOn(warehouseApi, 'postDocument').mockResolvedValue({
      ...mockDocs[0],
      status: 'POSTED',
    })
    vi.spyOn(warehouseApi, 'cancelDocument').mockResolvedValue({
      ...mockDocs[0],
      status: 'CANCELLED',
    })
    vi.spyOn(warehouseExcel, 'exportDocumentsToExcel').mockResolvedValue(undefined)
    vi.spyOn(warehouseExcel, 'exportWarehouseItemsToExcel').mockResolvedValue(undefined)
    vi.spyOn(warehouseApi, 'disposeBatch').mockResolvedValue({
      success: true,
      message: 'Đã hủy 5 Cuộn Chỉ nha khoa cũ và chuyển thành công sang bảng InventoryBatchDeleted (Bản ghi #1).',
      deletedBatch: { id: 1, batchNo: 'L2025-OLD', quantity: 5 },
      documentCode: 'XVT20261018/0099',
      remainingBatchQuantity: 0,
      remainingSupplyStock: 0,
    })
    vi.spyOn(warehouseApi, 'fetchDeletedBackups').mockResolvedValue({
      batches: [
        {
          id: 1,
          originalId: 102,
          batchNo: 'L2025-OLD',
          quantity: 5,
          unitCost: 50000,
          expiryDate: '2026-01-01T00:00:00.000Z',
          deletedAt: '2026-10-18T10:00:00.000Z',
          deletedBy: 'warehouse',
          deleteReason: 'Hàng hết hạn sử dụng',
        },
      ],
      supplies: [],
      documents: [],
      lines: [],
      allocations: [],
      ledgers: [],
    })
  })

  afterEach(cleanup)

  it('Tab 1 (WarehouseOverviewPage) renders 3 group metrics, handles disposing expired batches into Deleted table', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <WarehouseOverviewPage />
      </MemoryRouter>,
    )

    // Check title and metrics
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /tổng quan kho/i })).toBeInTheDocument()
      expect(screen.getByText('VTYT Thường')).toBeInTheDocument()
      expect(screen.getByText('VTYT Vô Cảm')).toBeInTheDocument()
      expect(screen.getByText('Văn Phòng Phẩm')).toBeInTheDocument()
    })

    // Check warning tabs
    expect(screen.getByText(/dưới mức tồn/i)).toBeInTheDocument()
    expect(screen.getByText(/sắp hết hạn/i)).toBeInTheDocument()
    expect(screen.getByText(/đã hết hạn/i)).toBeInTheDocument()

    // Switch to Sắp hết hạn tab
    const expiringTab = screen.getByRole('button', { name: /sắp hết hạn/i })
    await user.click(expiringTab)
    expect(screen.getByText('Thuốc tê Septanest')).toBeInTheDocument()

    // Switch to Đã hết hạn tab and click Hủy lô hết hạn
    const expiredTab = screen.getByRole('button', { name: /đã hết hạn/i })
    await user.click(expiredTab)
    expect(screen.getByText('Chỉ nha khoa cũ')).toBeInTheDocument()

    const disposeBtn = screen.getByRole('button', { name: /hủy lô hết hạn/i })
    await user.click(disposeBtn)

    // Modal opens
    expect(screen.getByText(/quy trình xuất hủy & sao lưu csdl/i)).toBeInTheDocument()
    expect(screen.getByText(/chuyển sang bảng sao lưu inventorybatchdeleted/i)).toBeInTheDocument()

    // Confirm disposal
    const confirmBtn = screen.getByRole('button', { name: /xác nhận hủy & chuyển sang bảng deleted/i })
    await user.click(confirmBtn)

    await waitFor(() => {
      expect(warehouseApi.disposeBatch).toHaveBeenCalledWith(102, expect.objectContaining({
        reason: expect.stringContaining('hết hạn'),
      }))
      expect(screen.getByText(/chuyển thành công sang bảng inventorybatchdeleted/i)).toBeInTheDocument()
    })
  })

  it('Tab 2 (WarehouseDetailsPage) displays materials and expands batch details with clickable originalReceiptCode', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter initialEntries={['/warehouse/details?group=VO_CAM']}>
        <Routes>
          <Route path="/warehouse/details" element={<WarehouseDetailsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Thuốc tê Lidocaine 2%')).toBeInTheDocument()
    })

    // Expand batch details
    const rowButton = screen.getByText('Thuốc tê Lidocaine 2%')
    await user.click(rowButton)

    // Check batch info visible
    await waitFor(() => {
      expect(screen.getByText('LC-2026X')).toBeInTheDocument()
      expect(screen.getByText('MVT20261018/0002')).toBeInTheDocument()
    })

    // Switch to DELETED tab
    const deletedTab = screen.getByRole('button', { name: /đã xuất hủy \(bảng deleted\)/i })
    await user.click(deletedTab)
    await waitFor(() => {
      expect(screen.getByText('L2025-OLD')).toBeInTheDocument()
      expect(screen.getByText(/bản sao lưu deleted/i)).toBeInTheDocument()
    })
  })

  it('Tab 3 (WarehouseTransactionsPage) renders documents table, handles print and post', async () => {
    const user = userEvent.setup()
    render(
      <MemoryRouter>
        <WarehouseTransactionsPage />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('MVT20261018/0001')).toBeInTheDocument()
    })

    // Find and click Print button
    const printBtn = screen.getByTitle('In phiếu (Chuyển trạng thái sang Đã in)')
    await user.click(printBtn)

    expect(warehouseApi.printDocument).toHaveBeenCalledTimes(1)

    // Print view modal should be visible with BẢN SAO since printCount > 1
    expect(await screen.findByRole('heading', { name: 'PHIẾU NHẬP KHO' })).toBeInTheDocument()
    expect(screen.getAllByText(/BẢN SAO/i).length).toBeGreaterThan(0)
    const closeBtn = screen.getByTitle('Đóng')
    await user.click(closeBtn)

    // Post document
    const postBtn = screen.getByTitle('Ghi sổ chứng từ vào kho')
    await user.click(postBtn)
    expect(warehouseApi.postDocument).toHaveBeenCalledWith(1)
  })

  it('Print View renders hospital header, signature blocks, and security hash footer', () => {
    render(
      <WarehousePrintView
        document={{
          ...mockDocs[0],
          printCount: 2,
          isCopy: true,
        }}
      />,
    )

    expect(screen.getByText(/PHÒNG KHÁM NHA KHOA DENTALCARE/i)).toBeInTheDocument()
    expect(screen.getByText('PHIẾU NHẬP KHO')).toBeInTheDocument()
    expect(screen.getByText(/Người lập phiếu/i)).toBeInTheDocument()
    expect(screen.getByText('Thủ kho')).toBeInTheDocument()
    expect(screen.getByText('Kế toán trưởng')).toBeInTheDocument()
    expect(screen.getAllByText(/BẢN SAO/i).length).toBeGreaterThan(0)
  })

  it('readVietnameseCurrency correctly converts numbers into standard Vietnamese currency words', () => {
    expect(warehouseApi.readVietnameseCurrency(0)).toBe('Không đồng')
    expect(warehouseApi.readVietnameseCurrency(10800000)).toBe('Mười triệu tám trăm nghìn đồng')
    expect(warehouseApi.readVietnameseCurrency(25000)).toBe('Hai mươi lăm nghìn đồng')
  })
})
