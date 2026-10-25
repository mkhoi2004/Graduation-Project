import {
  AlertCircle,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Ban,
  CheckCircle2,
  Clock,
  Eye,
  FileSpreadsheet,
  FileText,
  History,
  Info,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  cancelDocument,
  createIssue,
  createItem,
  createReceipt,
  createSupplier,
  fetchClinicContext,
  fetchDocuments,
  fetchItems,
  fetchSuppliers,
  postDocument,
  printDocument,
  readVietnameseCurrency,
  updateDocument,
  type ClinicContext,
  type StockDocument,
  type Supplier,
  type WarehouseItem,
} from './warehouse-api'
import { exportDocumentsToExcel } from './warehouse-excel'
import { WarehousePrintView } from './warehouse-print-view'

const money = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + ' đ'

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface ReceiptLineDraft {
  supplyCode: string
  inputQuantity: number
  inputUnit: string
  convertedQuantity: number
  conversionFactor: number
  batchNo: string
  expiryDate: string
  inputUnitPrice: number
  vatRate: number
}

interface IssueLineDraft {
  supplyCode: string
  inputQuantity: number
  inputUnit: string
  conversionFactor: number
  convertedQuantity: number
  manualBatchId?: number
  batchNo?: string
  expiryDate?: string
}

export function WarehouseTransactionsPage() {
  const [docs, setDocs] = useState<StockDocument[]>([])
  const [items, setItems] = useState<WarehouseItem[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [clinicContext, setClinicContext] = useState<ClinicContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Filters
  const [filterType, setFilterType] = useState<string>('ALL')
  const [filterStatus, setFilterStatus] = useState<string>('ALL')
  const [filterKeyword, setFilterKeyword] = useState<string>('')
  const [filterStartDate, setFilterStartDate] = useState<string>('')
  const [filterEndDate, setFilterEndDate] = useState<string>('')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const pageSize = 10

  // Modals
  const [receiptModalOpen, setReceiptModalOpen] = useState(false)
  const [editingDocId, setEditingDocId] = useState<number | null>(null)
  const [issueModalOpen, setIssueModalOpen] = useState(false)
  const [detailModalDoc, setDetailModalDoc] = useState<StockDocument | null>(null)
  const [cancelModalDoc, setCancelModalDoc] = useState<StockDocument | null>(null)
  const [cancelReason, setCancelReason] = useState('')
  const [printingDoc, setPrintingDoc] = useState<(StockDocument & { isCopy?: boolean }) | null>(null)

  // Quick modals
  const [newSupplierModalOpen, setNewSupplierModalOpen] = useState(false)
  const [newSupplierForm, setNewSupplierForm] = useState({ name: '', phone: '', address: '', taxCode: '' })
  const [newItemModalOpen, setNewItemModalOpen] = useState(false)
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    group: 'THUONG',
    baseUnit: 'Cái',
    minimumStock: 10,
    expiryWarningDays: 90,
  })

  // Receipt form state
  const [receiptSupplierId, setReceiptSupplierId] = useState<string>('')
  const [receiptReason, setReceiptReason] = useState<string>('Nhập mua vật tư y tế')
  const [receiptLines, setReceiptLines] = useState<ReceiptLineDraft[]>([])

  // Issue form state
  const [issueOutboundType, setIssueOutboundType] = useState<'PATIENT_USE' | 'INTERNAL' | 'DISPOSAL'>('PATIENT_USE')
  const [issuePatientId, setIssuePatientId] = useState<string>('')
  const [issueIntakeId, setIssueIntakeId] = useState<string>('')
  const [issueDoctorId, setIssueDoctorId] = useState<string>('')
  const [issueRoomId, setIssueRoomId] = useState<string>('')
  const [issueRecipientDept, setIssueRecipientDept] = useState<string>('Phòng khám điều trị')
  const [issueReason, setIssueReason] = useState<string>('')
  const [issueNonFefoReason, setIssueNonFefoReason] = useState<string>('')
  const [issueLines, setIssueLines] = useState<IssueLineDraft[]>([])

  // Load all initial data
  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      const [d, i, s, c] = await Promise.all([
        fetchDocuments({
          type: filterType === 'ALL' ? undefined : filterType,
          status: filterStatus === 'ALL' ? undefined : filterStatus,
          startDate: filterStartDate || undefined,
          endDate: filterEndDate || undefined,
        }),
        fetchItems(),
        fetchSuppliers(),
        fetchClinicContext().catch(() => null),
      ])
      setDocs(d)
      setItems(i)
      setSuppliers(s)
      if (c) setClinicContext(c)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể tải danh sách chứng từ.' })
    } finally {
      setLoading(false)
    }
  }, [filterType, filterStatus, filterStartDate, filterEndDate])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) loadData()
    })
    return () => {
      active = false
    }
  }, [loadData])

  // Filtered documents by keyword
  const filteredDocs = useMemo(() => {
    return docs.filter((d) => {
      if (!filterKeyword.trim()) return true
      const kw = filterKeyword.toLowerCase()
      const codeMatch = d.code.toLowerCase().includes(kw)
      const supplierMatch = d.supplier?.name.toLowerCase().includes(kw) ?? false
      const recipientMatch = d.recipientDepartment?.toLowerCase().includes(kw) ?? false
      const reasonMatch = d.reason?.toLowerCase().includes(kw) ?? false
      const lineMatch = d.lines.some((l) => l.supply?.name.toLowerCase().includes(kw) || l.supply?.code.toLowerCase().includes(kw))
      return codeMatch || supplierMatch || recipientMatch || reasonMatch || lineMatch
    })
  }, [docs, filterKeyword])

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredDocs.slice(start, start + pageSize)
  }, [filteredDocs, currentPage])

  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize))

  // Open Receipt Modal
  const openCreateReceipt = () => {
    setEditingDocId(null)
    const defaultSupplier = suppliers[0] ? String(suppliers[0].id) : ''
    setReceiptSupplierId(defaultSupplier)
    setReceiptReason('Nhập mua vật tư y tế')
    if (items.length > 0) {
      const first = items[0]
      setReceiptLines([
        {
          supplyCode: first.code,
          inputQuantity: 1,
          inputUnit: first.baseUnit,
          convertedQuantity: 1,
          conversionFactor: 1,
          batchNo: '',
          expiryDate: '',
          inputUnitPrice: 0,
          vatRate: 8,
        },
      ])
    } else {
      setReceiptLines([])
    }
    setReceiptModalOpen(true)
  }

  // Open Edit Receipt (Draft / Printed)
  const openEditReceipt = (doc: StockDocument) => {
    setEditingDocId(doc.id)
    setReceiptSupplierId(doc.supplierId ? String(doc.supplierId) : '')
    setReceiptReason(doc.reason || '')
    setReceiptLines(
      doc.lines.map((l) => ({
        supplyCode: l.supply.code,
        inputQuantity: Number(l.inputQuantity),
        inputUnit: l.inputUnit,
        convertedQuantity: Number(l.convertedQuantity),
        conversionFactor: Number(l.conversionFactor),
        batchNo: l.batchNo || '',
        expiryDate: l.expiryDate ? l.expiryDate.slice(0, 10) : '',
        inputUnitPrice: Number(l.inputUnitPrice),
        vatRate: Number(l.vatRate),
      })),
    )
    setReceiptModalOpen(true)
  }

  // Open Issue Modal
  const openCreateIssue = () => {
    setEditingDocId(null)
    setIssueOutboundType('PATIENT_USE')
    setIssuePatientId(clinicContext?.patients[0] ? String(clinicContext.patients[0].id) : '')
    setIssueDoctorId(clinicContext?.doctors[0] ? String(clinicContext.doctors[0].id) : '')
    setIssueRoomId(clinicContext?.rooms[0] ? String(clinicContext.rooms[0].id) : '')
    setIssueIntakeId(clinicContext?.activeIntakes[0] ? String(clinicContext.activeIntakes[0].id) : '')
    setIssueRecipientDept('Phòng khám điều trị')
    setIssueReason('')
    setIssueNonFefoReason('')

    if (items.length > 0) {
      const first = items[0]
      setIssueLines([
        {
          supplyCode: first.code,
          inputQuantity: 1,
          inputUnit: first.baseUnit,
          conversionFactor: 1,
          convertedQuantity: 1,
        },
      ])
    } else {
      setIssueLines([])
    }
    setIssueModalOpen(true)
  }

  // Handle Receipt line changes
  const updateReceiptLine = (index: number, field: keyof ReceiptLineDraft, value: any) => {
    setReceiptLines((prev) => {
      const next = [...prev]
      const current = { ...next[index], [field]: value }

      // When supply changes, update unit
      if (field === 'supplyCode') {
        const item = items.find((i) => i.code === value)
        if (item) {
          current.inputUnit = item.baseUnit
          current.convertedQuantity = current.inputQuantity
          current.conversionFactor = 1
        }
      }

      // If quantity changes, update convertedQuantity by factor
      if (field === 'inputQuantity') {
        const qty = Number(value) || 0
        current.convertedQuantity = Math.round(qty * current.conversionFactor * 10000) / 10000
      }

      // If user manually enters convertedQuantity, recalculate conversionFactor = convertedQuantity / inputQuantity
      if (field === 'convertedQuantity') {
        const convQty = Number(value) || 0
        current.conversionFactor =
          current.inputQuantity > 0 ? Math.round((convQty / current.inputQuantity) * 10000) / 10000 : 1
      }

      next[index] = current
      return next
    })
  }

  const addReceiptLine = () => {
    const first = items[0]
    if (!first) return
    setReceiptLines((prev) => [
      ...prev,
      {
        supplyCode: first.code,
        inputQuantity: 1,
        inputUnit: first.baseUnit,
        convertedQuantity: 1,
        conversionFactor: 1,
        batchNo: '',
        expiryDate: '',
        inputUnitPrice: 0,
        vatRate: 8,
      },
    ])
  }

  const removeReceiptLine = (index: number) => {
    setReceiptLines((prev) => prev.filter((_, i) => i !== index))
  }

  // Totals for Receipt
  const receiptTotals = useMemo(() => {
    let goods = 0
    let vat = 0
    for (const l of receiptLines) {
      const lineGoods = Math.round(Number(l.inputQuantity || 0) * Number(l.inputUnitPrice || 0))
      const lineVat = Math.round((lineGoods * Number(l.vatRate || 0)) / 100)
      goods += lineGoods
      vat += lineVat
    }
    const total = goods + vat
    return {
      goods,
      vat,
      total,
      inWords: readVietnameseCurrency(total),
    }
  }, [receiptLines])

  // Submit Receipt
  const handleSaveReceipt = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!receiptSupplierId) {
      setMessage({ type: 'error', text: 'Vui lòng chọn nhà cung cấp.' })
      return
    }
    if (!receiptLines.length) {
      setMessage({ type: 'error', text: 'Vui lòng thêm ít nhất một dòng vật tư.' })
      return
    }

    try {
      setBusy(true)
      const payload = {
        supplierId: Number(receiptSupplierId),
        reason: receiptReason,
        lines: receiptLines.map((l) => ({
          supplyCode: l.supplyCode,
          inputQuantity: Number(l.inputQuantity),
          inputUnit: l.inputUnit,
          conversionFactor: Number(l.conversionFactor),
          convertedQuantity: Number(l.convertedQuantity),
          batchNo: l.batchNo.trim() || undefined,
          expiryDate: l.expiryDate || undefined,
          inputUnitPrice: Number(l.inputUnitPrice),
          vatRate: Number(l.vatRate),
        })),
      }

      if (editingDocId) {
        await updateDocument(editingDocId, payload)
        setMessage({ type: 'success', text: 'Đã cập nhật phiếu nhập kho thành công.' })
      } else {
        await createReceipt(payload)
        setMessage({ type: 'success', text: 'Đã tạo phiếu nhập kho mới và chuyển sang Kế toán duyệt.' })
      }

      setReceiptModalOpen(false)
      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể lưu phiếu nhập kho.' })
    } finally {
      setBusy(false)
    }
  }

  // Handle Issue line changes
  const updateIssueLine = (index: number, field: keyof IssueLineDraft, value: any) => {
    setIssueLines((prev) => {
      const next = [...prev]
      const current = { ...next[index], [field]: value }

      if (field === 'supplyCode') {
        const item = items.find((i) => i.code === value)
        if (item) {
          current.inputUnit = item.baseUnit
          current.convertedQuantity = current.inputQuantity
          current.manualBatchId = undefined
          current.batchNo = undefined
          current.expiryDate = undefined
        }
      }

      if (field === 'inputQuantity') {
        const qty = Number(value) || 0
        current.convertedQuantity = qty
      }

      if (field === 'manualBatchId') {
        const numId = value ? Number(value) : undefined
        current.manualBatchId = numId
        if (numId) {
          const item = items.find((i) => i.code === current.supplyCode)
          const b = item?.inventoryBatches.find((x) => x.id === numId)
          current.batchNo = b?.batchNo
          current.expiryDate = b?.expiryDate
        } else {
          current.batchNo = undefined
          current.expiryDate = undefined
        }
      }

      next[index] = current
      return next
    })
  }

  const addIssueLine = () => {
    const first = items[0]
    if (!first) return
    setIssueLines((prev) => [
      ...prev,
      {
        supplyCode: first.code,
        inputQuantity: 1,
        inputUnit: first.baseUnit,
        conversionFactor: 1,
        convertedQuantity: 1,
      },
    ])
  }

  const removeIssueLine = (index: number) => {
    setIssueLines((prev) => prev.filter((_, i) => i !== index))
  }

  // Duplicate warning for PATIENT_USE
  const patientUseDuplicateWarning = useMemo(() => {
    if (issueOutboundType !== 'PATIENT_USE' || !issuePatientId) return null
    const matchedDocs = docs.filter(
      (d) =>
        d.type === 'OUT' &&
        d.outboundType === 'PATIENT_USE' &&
        d.status === 'POSTED' &&
        String(d.patientId) === String(issuePatientId) &&
        (!issueIntakeId || String(d.intakeId) === String(issueIntakeId)),
    )
    if (!matchedDocs.length) return null

    const issuedSupplyCodes = new Set(matchedDocs.flatMap((d) => d.lines.map((l) => l.supply?.code)))
    const duplicateSupplies = issueLines
      .filter((l) => issuedSupplyCodes.has(l.supplyCode))
      .map((l) => items.find((i) => i.code === l.supplyCode)?.name || l.supplyCode)

    if (duplicateSupplies.length > 0) {
      return `Cảnh báo: Bệnh nhân/lượt khám này đã có phiếu xuất đã ghi sổ cho vật tư: ${duplicateSupplies.join(', ')}. Hãy kiểm tra kỹ để tránh trừ kho trùng lặp!`
    }
    return null
  }, [issueOutboundType, issuePatientId, issueIntakeId, issueLines, docs, items])

  // Submit Issue
  const handleSaveIssue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!issueLines.length) {
      setMessage({ type: 'error', text: 'Vui lòng thêm ít nhất một dòng vật tư.' })
      return
    }

    if (issueOutboundType === 'PATIENT_USE' && (!issuePatientId || !issueDoctorId)) {
      setMessage({ type: 'error', text: 'Xuất dùng cho bệnh nhân bắt buộc chọn bệnh nhân và bác sĩ.' })
      return
    }

    if (issueOutboundType === 'DISPOSAL' && !issueReason.trim()) {
      setMessage({ type: 'error', text: 'Xuất hủy bắt buộc nhập lý do chi tiết.' })
      return
    }

    // Check non-FEFO reason if manual batches picked
    const hasManualBatch = issueLines.some((l) => l.manualBatchId)
    if (hasManualBatch && !issueNonFefoReason.trim()) {
      setMessage({
        type: 'error',
        text: 'Khi chọn lô xuất thủ công, bắt buộc nhập lý do xuất không theo FEFO/FIFO.',
      })
      return
    }

    try {
      setBusy(true)
      const payload = {
        outboundType: issueOutboundType,
        patientId: issueOutboundType === 'PATIENT_USE' && issuePatientId ? Number(issuePatientId) : undefined,
        intakeId: issueOutboundType === 'PATIENT_USE' && issueIntakeId ? Number(issueIntakeId) : undefined,
        doctorId: issueOutboundType === 'PATIENT_USE' && issueDoctorId ? Number(issueDoctorId) : undefined,
        roomId: issueOutboundType === 'PATIENT_USE' && issueRoomId ? Number(issueRoomId) : undefined,
        recipientDepartment: issueOutboundType === 'INTERNAL' ? issueRecipientDept : undefined,
        reason: issueReason,
        nonFefoReason: issueNonFefoReason.trim() || undefined,
        lines: issueLines.map((l) => ({
          supplyCode: l.supplyCode,
          inputQuantity: Number(l.inputQuantity),
          inputUnit: l.inputUnit,
          conversionFactor: 1,
          convertedQuantity: Number(l.convertedQuantity),
          manualBatchId: l.manualBatchId,
          batchNo: l.batchNo,
          expiryDate: l.expiryDate,
        })),
      }

      await createIssue(payload)
      setMessage({ type: 'success', text: 'Đã tạo phiếu xuất kho mới (Nháp).' })
      setIssueModalOpen(false)
      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể tạo phiếu xuất kho.' })
    } finally {
      setBusy(false)
    }
  }

  // Print Document
  const handlePrint = async (doc: StockDocument) => {
    try {
      setBusy(true)
      setMessage(null)
      const updated = await printDocument(doc.id)
      setPrintingDoc(updated)
      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể in phiếu.' })
    } finally {
      setBusy(false)
    }
  }

  // Post Document
  const handlePost = async (doc: StockDocument) => {
    if (doc.status !== 'PRINTED') {
      setMessage({
        type: 'error',
        text: `Phiếu ở trạng thái ${doc.status}. Bạn bắt buộc phải In Phiếu trước khi Ghi Sổ!`,
      })
      return
    }

    try {
      setBusy(true)
      setMessage(null)
      await postDocument(doc.id)
      setMessage({
        type: 'success',
        text: `Chứng từ ${doc.code} đã ghi sổ thành công. Tồn kho và sổ kế toán đã được cập nhật.`,
      })
      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể ghi sổ chứng từ.' })
    } finally {
      setBusy(false)
    }
  }

  // Cancel Document
  const handleCancel = async () => {
    if (!cancelModalDoc) return
    if (!cancelReason.trim()) {
      setMessage({ type: 'error', text: 'Bắt buộc nhập lý do hủy phiếu.' })
      return
    }

    try {
      setBusy(true)
      setMessage(null)
      await cancelDocument(cancelModalDoc.id, cancelReason.trim())
      setMessage({
        type: 'success',
        text: `Chứng từ ${cancelModalDoc.code} đã được hủy bỏ.`,
      })
      setCancelModalDoc(null)
      setCancelReason('')
      await loadData()
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể hủy chứng từ.' })
    } finally {
      setBusy(false)
    }
  }

  // Quick create supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplierForm.name.trim()) return
    try {
      const created = await createSupplier(newSupplierForm)
      setSuppliers((prev) => [...prev, created])
      setReceiptSupplierId(String(created.id))
      setNewSupplierModalOpen(false)
      setNewSupplierForm({ name: '', phone: '', address: '', taxCode: '' })
      setMessage({ type: 'success', text: `Đã tạo nhà cung cấp "${created.name}" thành công.` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể tạo nhà cung cấp.' })
    }
  }

  // Quick create supply item
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newItemForm.name.trim()) return
    try {
      const created = await createItem({
        name: newItemForm.name.trim(),
        group: newItemForm.group,
        baseUnit: newItemForm.baseUnit.trim(),
        minimumStock: Number(newItemForm.minimumStock),
        expiryWarningDays: Number(newItemForm.expiryWarningDays),
      })
      setItems((prev) => [...prev, created])
      setNewItemModalOpen(false)
      setNewItemForm({
        name: '',
        group: 'THUONG',
        baseUnit: 'Cái',
        minimumStock: 10,
        expiryWarningDays: 90,
      })
      setMessage({ type: 'success', text: `Đã tạo vật tư "${created.code} - ${created.name}" thành công.` })
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Không thể tạo vật tư mới.' })
    }
  }

  return (
    <section className="space-y-6">
      {/* Top Banner / Actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#6657e8]">
            Chứng từ kho · Tab 3
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-[-0.04em] text-slate-900">
            Quản lý Nhập / Xuất kho
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Lập phiếu nhập kho từ nhà cung cấp hoặc phiếu xuất kho (điều trị bệnh nhân, nội bộ, xuất hủy). In phiếu và ghi sổ theo chuẩn kế toán.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openCreateReceipt}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-[0.98]"
          >
            <ArrowDownToLine className="size-4" />
            + Nhập kho (MVT)
          </button>
          <button
            type="button"
            onClick={openCreateIssue}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5546e8] px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#5546e8]/25 transition hover:bg-[#4335d6] active:scale-[0.98]"
          >
            <ArrowUpFromLine className="size-4" />
            + Xuất kho (XVT)
          </button>
          <button
            type="button"
            onClick={() => exportDocumentsToExcel(filteredDocs)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            title="Xuất Excel danh sách chứng từ"
          >
            <FileSpreadsheet className="size-4 text-emerald-600" />
            Xuất Excel
          </button>
        </div>
      </div>

      {/* Message Banner */}
      {message && (
        <div
          role="alert"
          className={`flex items-start justify-between rounded-2xl border p-4 text-sm font-medium transition ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {message.type === 'success' ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="size-5 shrink-0 text-red-600" />
            )}
            <span>{message.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          {/* Keyword Search */}
          <div className="lg:col-span-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Tìm kiếm</label>
            <div className="relative mt-1.5">
              <Search className="absolute left-3.5 top-3.5 size-4 text-slate-400" />
              <input
                type="text"
                value={filterKeyword}
                onChange={(e) => {
                  setFilterKeyword(e.target.value)
                  setCurrentPage(1)
                }}
                placeholder="Mã phiếu, NCC, người nhận, tên vật tư..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[#5546e8] focus:bg-white focus:ring-2 focus:ring-[#5546e8]/10"
              />
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Loại chứng từ</label>
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value)
                setCurrentPage(1)
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-[#5546e8] focus:bg-white"
            >
              <option value="ALL">Tất cả loại (Nhập + Xuất)</option>
              <option value="IN">Chỉ Nhập kho (MVT)</option>
              <option value="OUT">Chỉ Xuất kho (XVT)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Trạng thái</label>
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value)
                setCurrentPage(1)
              }}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-[#5546e8] focus:bg-white"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="PENDING_APPROVAL">Chờ Kế toán duyệt (PENDING_APPROVAL)</option>
              <option value="POSTED">Đã ghi sổ / Đã duyệt (POSTED)</option>
              <option value="REJECTED">Kế toán từ chối (REJECTED)</option>
              <option value="PRINTED">Đã in (PRINTED)</option>
              <option value="DRAFT">Nháp (DRAFT)</option>
              <option value="CANCELLED">Đã hủy (CANCELLED)</option>
            </select>
          </div>

          {/* Date range & Reset */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Từ ngày</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => {
                  setFilterStartDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#5546e8] focus:bg-white"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Đến ngày</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => {
                  setFilterEndDate(e.target.value)
                  setCurrentPage(1)
                }}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2.5 py-2.5 text-xs text-slate-800 outline-none focus:border-[#5546e8] focus:bg-white"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterType('ALL')
                setFilterStatus('ALL')
                setFilterKeyword('')
                setFilterStartDate('')
                setFilterEndDate('')
                setCurrentPage(1)
                loadData()
              }}
              className="mt-6 rounded-xl border border-slate-200 p-2.5 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
              title="Làm mới bộ lọc"
            >
              <RefreshCw className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Danh sách chứng từ ({filteredDocs.length})
          </p>
          <span className="text-xs text-slate-400">
            Trang {currentPage} / {totalPages}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">Mã phiếu</th>
                <th className="p-4">Loại phiếu</th>
                <th className="p-4">Ngày lập</th>
                <th className="p-4">Đối tác / Nơi nhận</th>
                <th className="p-4 text-right">Tổng thanh toán</th>
                <th className="p-4 text-center">Trạng thái</th>
                <th className="p-4 text-center">Lần in</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <RefreshCw className="mx-auto size-6 animate-spin text-[#5546e8]" />
                    <p className="mt-2 text-xs">Đang tải danh sách chứng từ...</p>
                  </td>
                </tr>
              ) : paginatedDocs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    <FileText className="mx-auto size-8 text-slate-300" />
                    <p className="mt-2 font-medium">Không tìm thấy chứng từ nào phù hợp.</p>
                  </td>
                </tr>
              ) : (
                paginatedDocs.map((doc) => {
                  const isReceipt = doc.type === 'IN'
                  return (
                    <tr key={doc.id} className="transition hover:bg-slate-50/70">
                      {/* Code */}
                      <td className="p-4">
                        <button
                          type="button"
                          onClick={() => setDetailModalDoc(doc)}
                          className="font-mono font-bold text-[#5546e8] hover:underline"
                        >
                          {doc.code}
                        </button>
                      </td>

                      {/* Type */}
                      <td className="p-4">
                        <div className="flex flex-col items-start gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                              isReceipt
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            }`}
                          >
                            {isReceipt ? (
                              <>
                                <ArrowDownToLine className="size-3" /> Nhập kho
                              </>
                            ) : (
                              <>
                                <ArrowUpFromLine className="size-3" /> Xuất kho
                              </>
                            )}
                          </span>
                          {!isReceipt && doc.outboundType && (
                            <span className="text-[11px] text-slate-500 font-medium">
                              {doc.outboundType === 'PATIENT_USE'
                                ? 'Bệnh nhân'
                                : doc.outboundType === 'DISPOSAL'
                                ? 'Xuất hủy'
                                : 'Cấp nội bộ'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="p-4 text-xs text-slate-600">
                        {formatDateTime(doc.createdAt)}
                      </td>

                      {/* Partner / Recipient */}
                      <td className="p-4">
                        <div className="max-w-[220px] truncate text-slate-800 font-medium text-xs">
                          {isReceipt
                            ? doc.supplier?.name || '—'
                            : doc.recipientDepartment || (doc.patientId ? `BN ID: ${doc.patientId}` : '—')}
                        </div>
                        {doc.reason && (
                          <p className="max-w-[220px] truncate text-[11px] text-slate-400">
                            {doc.reason}
                          </p>
                        )}
                      </td>

                      {/* Total Amount */}
                      <td className="p-4 text-right font-mono font-bold text-slate-900">
                        {money(doc.totalAmount)}
                      </td>

                      {/* Status */}
                      <td className="p-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${
                            doc.status === 'POSTED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : doc.status === 'PENDING_APPROVAL'
                              ? 'bg-amber-100 text-amber-800'
                              : doc.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-800'
                              : doc.status === 'PRINTED'
                              ? 'bg-blue-100 text-blue-800'
                              : doc.status === 'CANCELLED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {doc.status === 'POSTED' && <CheckCircle2 className="size-3 text-emerald-600" />}
                          {doc.status === 'PENDING_APPROVAL' && <Clock className="size-3 text-amber-600" />}
                          {doc.status === 'REJECTED' && <Ban className="size-3 text-rose-600" />}
                          {doc.status === 'PRINTED' && <Printer className="size-3 text-blue-600" />}
                          {doc.status === 'CANCELLED' && <Ban className="size-3 text-red-600" />}
                          {doc.status === 'DRAFT' && <Clock className="size-3 text-slate-400" />}
                          {doc.status === 'POSTED'
                            ? 'Đã ghi sổ'
                            : doc.status === 'PENDING_APPROVAL'
                            ? 'Chờ Kế toán duyệt'
                            : doc.status === 'REJECTED'
                            ? 'Kế toán từ chối'
                            : doc.status === 'PRINTED'
                            ? 'Đã in'
                            : doc.status === 'CANCELLED'
                            ? 'Đã hủy'
                            : 'Nháp'}
                        </span>
                      </td>

                      {/* Print count */}
                      <td className="p-4 text-center text-xs">
                        {doc.printCount > 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold ${
                              doc.printCount > 1
                                ? 'bg-amber-100 text-amber-800 font-bold'
                                : 'text-slate-600'
                            }`}
                          >
                            {doc.printCount} lần {doc.printCount > 1 && '(BẢN SAO)'}
                          </span>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View details */}
                          <button
                            type="button"
                            onClick={() => setDetailModalDoc(doc)}
                            className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                            title="Xem chi tiết"
                          >
                            <Eye className="size-4" />
                          </button>

                          {/* Edit (only if DRAFT, PRINTED, or PENDING_APPROVAL) */}
                          {(doc.status === 'DRAFT' || doc.status === 'PRINTED' || doc.status === 'PENDING_APPROVAL') && isReceipt && (
                            <button
                              type="button"
                              onClick={() => openEditReceipt(doc)}
                              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                              title="Chỉnh sửa phiếu (Nếu đã in, sẽ quay về nháp)"
                            >
                              <Pencil className="size-4" />
                            </button>
                          )}

                          {/* Print document */}
                          {doc.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handlePrint(doc)}
                              className="rounded-lg border border-blue-200 bg-blue-50/50 p-2 text-blue-700 hover:bg-blue-100"
                              title="In phiếu (Chuyển trạng thái sang Đã in)"
                            >
                              <Printer className="size-4" />
                            </button>
                          )}

                          {/* Post document */}
                          {doc.status === 'PRINTED' && (
                            <button
                              type="button"
                              onClick={() => handlePost(doc)}
                              className="rounded-lg bg-emerald-600 p-2 text-white shadow-sm hover:bg-emerald-700"
                              title="Ghi sổ chứng từ vào kho"
                            >
                              <CheckCircle2 className="size-4" />
                            </button>
                          )}

                          {isReceipt && doc.status === 'PENDING_APPROVAL' && (
                            <span
                              className="rounded-lg bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700 border border-amber-200"
                              title="Phiếu nhập kho này đang chờ Kế toán duyệt tại màn hình /accounting"
                            >
                              Chờ duyệt
                            </span>
                          )}

                          {/* Cancel document */}
                          {doc.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => {
                                setCancelModalDoc(doc)
                                setCancelReason('')
                              }}
                              className="rounded-lg border border-red-200 p-2 text-red-600 hover:bg-red-50"
                              title="Hủy chứng từ"
                            >
                              <Ban className="size-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-500">
              Hiển thị {(currentPage - 1) * pageSize + 1} -{' '}
              {Math.min(currentPage * pageSize, filteredDocs.length)} trên tổng số{' '}
              {filteredDocs.length} chứng từ
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Trước
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentPage(i + 1)}
                  className={`size-8 rounded-lg text-xs font-bold ${
                    currentPage === i + 1
                      ? 'bg-[#5546e8] text-white'
                      : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* RECEIPT MODAL (NHẬP KHO) */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="relative my-8 w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  Phiếu Nhập Kho (MVT)
                </span>
                <h2 className="text-xl font-black text-slate-900">
                  {editingDocId ? 'Chỉnh sửa phiếu nhập kho' : 'Lập phiếu nhập kho mới'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReceipt} className="mt-5 space-y-6">
              {/* Header Info */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Supplier selection */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Nhà cung cấp <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setNewSupplierModalOpen(true)}
                      className="text-xs font-bold text-[#5546e8] hover:underline"
                    >
                      + Thêm NCC
                    </button>
                  </div>
                  <select
                    required
                    value={receiptSupplierId}
                    onChange={(e) => setReceiptSupplierId(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#5546e8]"
                  >
                    <option value="">-- Chọn nhà cung cấp --</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.code} · {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reason */}
                <div className="lg:col-span-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Lý do / Diễn giải nhập kho
                  </label>
                  <input
                    type="text"
                    value={receiptReason}
                    onChange={(e) => setReceiptReason(e.target.value)}
                    placeholder="Nhập mua vật tư theo hóa đơn..."
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-[#5546e8]"
                  />
                </div>
              </div>

              {/* Lines Table */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Danh mục vật tư nhập kho ({receiptLines.length})
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setNewItemModalOpen(true)}
                      className="text-xs font-bold text-[#5546e8] hover:underline"
                    >
                      + Tạo vật tư mới (VT-xxxx)
                    </button>
                    <button
                      type="button"
                      onClick={addReceiptLine}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100"
                    >
                      <Plus className="size-3.5" /> Thêm dòng
                    </button>
                  </div>
                </div>

                <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="p-3">Vật tư &amp; Nhóm</th>
                        <th className="p-3 w-24">SL nhập</th>
                        <th className="p-3 w-24">ĐVT nhập</th>
                        <th className="p-3 w-28">SL quy đổi (ĐVCB)</th>
                        <th className="p-3 w-24">Hệ số</th>
                        <th className="p-3 w-28">Số lô</th>
                        <th className="p-3 w-32">Hạn dùng</th>
                        <th className="p-3 w-28 text-right">Đơn giá (chưa VAT)</th>
                        <th className="p-3 w-24 text-center">VAT (%)</th>
                        <th className="p-3 w-28 text-right">Thành tiền</th>
                        <th className="p-3 w-10 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receiptLines.map((line, idx) => {
                        const item = items.find((i) => i.code === line.supplyCode)
                        const isVoCam = item?.group === 'VO_CAM'
                        const isThuong = item?.group === 'THUONG'

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            {/* Material selection */}
                            <td className="p-2.5">
                              <select
                                value={line.supplyCode}
                                onChange={(e) => updateReceiptLine(idx, 'supplyCode', e.target.value)}
                                className="w-full min-w-[180px] rounded-lg border border-slate-200 p-2 text-xs font-semibold"
                              >
                                {items.map((i) => (
                                  <option key={i.id} value={i.code}>
                                    {i.code} · {i.name} [{i.group}]
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Input qty */}
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0.0001"
                                step="any"
                                required
                                value={line.inputQuantity}
                                onChange={(e) => updateReceiptLine(idx, 'inputQuantity', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 p-2 text-right font-semibold"
                              />
                            </td>

                            {/* Input unit */}
                            <td className="p-2.5">
                              <input
                                type="text"
                                required
                                value={line.inputUnit}
                                onChange={(e) => updateReceiptLine(idx, 'inputUnit', e.target.value)}
                                placeholder="Hộp"
                                className="w-full rounded-lg border border-slate-200 p-2"
                              />
                            </td>

                            {/* Converted quantity (manual input per spec) */}
                            <td className="p-2.5">
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="0.0001"
                                  step="any"
                                  required
                                  value={line.convertedQuantity}
                                  onChange={(e) => updateReceiptLine(idx, 'convertedQuantity', e.target.value)}
                                  className="w-full rounded-lg border border-slate-200 p-2 text-right font-semibold"
                                />
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {item?.baseUnit}
                                </span>
                              </div>
                            </td>

                            {/* Conversion factor (auto) */}
                            <td className="p-2.5 font-mono text-center text-xs font-semibold text-slate-600">
                              {line.conversionFactor}
                            </td>

                            {/* Batch No */}
                            <td className="p-2.5">
                              <input
                                type="text"
                                required={isVoCam}
                                value={line.batchNo}
                                onChange={(e) => updateReceiptLine(idx, 'batchNo', e.target.value)}
                                placeholder={isVoCam ? 'Bắt buộc' : 'Tùy chọn'}
                                className={`w-full rounded-lg border p-2 text-xs font-mono ${
                                  isVoCam && !line.batchNo ? 'border-amber-400 bg-amber-50/50' : 'border-slate-200'
                                }`}
                              />
                            </td>

                            {/* Expiry Date */}
                            <td className="p-2.5">
                              <input
                                type="date"
                                required={isVoCam || isThuong}
                                value={line.expiryDate}
                                onChange={(e) => updateReceiptLine(idx, 'expiryDate', e.target.value)}
                                className={`w-full rounded-lg border p-2 text-xs ${
                                  (isVoCam || isThuong) && !line.expiryDate
                                    ? 'border-amber-400 bg-amber-50/50'
                                    : 'border-slate-200'
                                }`}
                              />
                            </td>

                            {/* Unit Price */}
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="0"
                                step="1000"
                                value={line.inputUnitPrice}
                                onChange={(e) => updateReceiptLine(idx, 'inputUnitPrice', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 p-2 text-right font-mono"
                              />
                            </td>

                            {/* VAT% */}
                            <td className="p-2.5">
                              <div className="flex flex-col gap-1 items-center">
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={line.vatRate}
                                  onChange={(e) => updateReceiptLine(idx, 'vatRate', e.target.value)}
                                  className="w-16 rounded-lg border border-slate-200 p-1 text-center font-mono text-xs"
                                />
                                <div className="flex gap-0.5">
                                  {[0, 5, 8, 10].map((v) => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => updateReceiptLine(idx, 'vatRate', v)}
                                      className={`rounded px-1 text-[10px] font-bold ${
                                        line.vatRate === v
                                          ? 'bg-[#5546e8] text-white'
                                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                      }`}
                                    >
                                      {v}%
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </td>

                            {/* Total line amount */}
                            <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                              {money(
                                Math.round(
                                  line.inputQuantity *
                                    line.inputUnitPrice *
                                    (1 + (line.vatRate || 0) / 100),
                                ),
                              )}
                            </td>

                            {/* Delete line */}
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeReceiptLine(idx)}
                                className="rounded p-1 text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals Summary */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
                <div className="grid gap-2 sm:grid-cols-3 text-right">
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Tiền hàng (chưa VAT):</span>
                    <p className="font-mono text-base font-bold text-slate-800">
                      {money(receiptTotals.goods)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Tiền thuế GTGT (VAT):</span>
                    <p className="font-mono text-base font-bold text-slate-800">
                      {money(receiptTotals.vat)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-medium">Tổng thanh toán:</span>
                    <p className="font-mono text-xl font-black text-[#5546e8]">
                      {money(receiptTotals.total)}
                    </p>
                  </div>
                </div>

                <div className="mt-3 border-t border-slate-200/60 pt-3 text-xs italic text-slate-600">
                  <span className="font-bold not-italic text-slate-800">Bằng chữ:</span>{' '}
                  {receiptTotals.inWords}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#5546e8] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#5546e8]/25 hover:bg-[#4335d6] disabled:opacity-50"
                >
                  {busy ? 'Đang lưu...' : 'Lưu & Chuyển Kế toán duyệt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ISSUE MODAL (XUẤT KHO) */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="relative my-8 w-full max-w-5xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Phiếu Xuất Kho (XVT)
                </span>
                <h2 className="text-xl font-black text-slate-900">Lập phiếu xuất kho mới</h2>
              </div>
              <button
                type="button"
                onClick={() => setIssueModalOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIssue} className="mt-5 space-y-6">
              {/* Outbound Type Selector */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hình thức xuất kho <span className="text-red-500">*</span>
                </label>
                <div className="mt-2 grid grid-cols-3 gap-3">
                  {[
                    { id: 'PATIENT_USE', label: 'Dùng cho bệnh nhân', desc: 'Gắn theo ca điều trị / bác sĩ' },
                    { id: 'INTERNAL', label: 'Cấp phát nội bộ', desc: 'Cho phòng khám / khoa phòng' },
                    { id: 'DISPOSAL', label: 'Xuất hủy vật tư', desc: 'Hỏng, vỡ, hết hạn sử dụng' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setIssueOutboundType(type.id as any)}
                      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition ${
                        issueOutboundType === type.id
                          ? 'border-[#5546e8] bg-indigo-50/50 shadow-sm'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <span
                        className={`text-sm font-bold ${
                          issueOutboundType === type.id ? 'text-[#5546e8]' : 'text-slate-800'
                        }`}
                      >
                        {type.label}
                      </span>
                      <span className="mt-1 text-xs text-slate-500">{type.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Conditional Fields based on outboundType */}
              {issueOutboundType === 'PATIENT_USE' && (
                <div className="rounded-2xl border border-indigo-100 bg-indigo-50/30 p-5 space-y-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-[#5546e8]">
                    Thông tin ca điều trị &amp; Bệnh nhân
                  </h4>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Patient */}
                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Bệnh nhân <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={issuePatientId}
                        onChange={(e) => setIssuePatientId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold"
                      >
                        <option value="">-- Chọn bệnh nhân --</option>
                        {clinicContext?.patients.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} · {p.fullName}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Doctor */}
                    <div>
                      <label className="text-xs font-bold text-slate-700">
                        Bác sĩ sử dụng <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={issueDoctorId}
                        onChange={(e) => setIssueDoctorId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold"
                      >
                        <option value="">-- Chọn bác sĩ --</option>
                        {clinicContext?.doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName} ({d.username})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Clinic Room */}
                    <div>
                      <label className="text-xs font-bold text-slate-700">Phòng khám / Ghế</label>
                      <select
                        value={issueRoomId}
                        onChange={(e) => setIssueRoomId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold"
                      >
                        <option value="">-- Chọn phòng khám --</option>
                        {clinicContext?.rooms.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Active Intake */}
                    <div>
                      <label className="text-xs font-bold text-slate-700">Lượt tiếp nhận</label>
                      <select
                        value={issueIntakeId}
                        onChange={(e) => setIssueIntakeId(e.target.value)}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-semibold"
                      >
                        <option value="">-- Không gắn lượt cụ thể --</option>
                        {clinicContext?.activeIntakes.map((intake) => (
                          <option key={intake.id} value={intake.id}>
                            {intake.code} · {intake.patient.fullName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Duplicate warning banner */}
                  {patientUseDuplicateWarning && (
                    <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs font-medium text-amber-800">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                      <span>{patientUseDuplicateWarning}</span>
                    </div>
                  )}
                </div>
              )}

              {issueOutboundType === 'INTERNAL' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Nơi / Khoa phòng nhận <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={issueRecipientDept}
                      onChange={(e) => setIssueRecipientDept(e.target.value)}
                      placeholder="Phòng khám 1, Phòng Vô trùng, Bộ phận Lễ tân..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#5546e8]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Lý do cấp phát
                    </label>
                    <input
                      type="text"
                      value={issueReason}
                      onChange={(e) => setIssueReason(e.target.value)}
                      placeholder="Cấp phát vật tư tiêu hao định kỳ..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-[#5546e8]"
                    />
                  </div>
                </div>
              )}

              {issueOutboundType === 'DISPOSAL' && (
                <div className="rounded-2xl border border-red-100 bg-red-50/30 p-5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-red-700">
                    <Info className="size-4" />
                    Quy định xuất hủy vật tư y tế
                  </div>
                  <p className="text-xs text-slate-600">
                    Xuất hủy chỉ áp dụng cho vật tư bị hỏng, vỡ, hoặc đã quá hạn sử dụng. Bạn được phép chọn xuất các lô đã hết hạn sử dụng. Bắt buộc nhập lý do chi tiết để phục vụ kiểm toán.
                  </p>
                  <div>
                    <label className="text-xs font-bold text-slate-700">
                      Lý do xuất hủy chi tiết <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={issueReason}
                      onChange={(e) => setIssueReason(e.target.value)}
                      placeholder="Hết hạn sử dụng / vỡ lọ trong quá trình bảo quản..."
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none focus:border-red-500"
                    />
                  </div>
                </div>
              )}

              {/* Lines Table */}
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
                    Danh mục vật tư xuất kho ({issueLines.length})
                  </h3>
                  <button
                    type="button"
                    onClick={addIssueLine}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-[#5546e8] hover:bg-indigo-100"
                  >
                    <Plus className="size-3.5" /> Thêm dòng
                  </button>
                </div>

                <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="p-3">Vật tư &amp; Tồn kho</th>
                        <th className="p-3 w-28">Số lượng xuất</th>
                        <th className="p-3 w-24">ĐVT</th>
                        <th className="p-3">Lựa chọn lô xuất</th>
                        <th className="p-3 w-10 text-center">Xóa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {issueLines.map((line, idx) => {
                        const item = items.find((i) => i.code === line.supplyCode)
                        const inStock = item?.availableQuantity ?? 0
                        const isOverStock = line.inputQuantity > inStock

                        return (
                          <tr key={idx} className="hover:bg-slate-50/60">
                            {/* Material selection */}
                            <td className="p-2.5">
                              <select
                                value={line.supplyCode}
                                onChange={(e) => updateIssueLine(idx, 'supplyCode', e.target.value)}
                                className="w-full min-w-[200px] rounded-lg border border-slate-200 p-2 text-xs font-semibold"
                              >
                                {items.map((i) => (
                                  <option key={i.id} value={i.code}>
                                    {i.code} · {i.name} (Tồn: {i.availableQuantity} {i.baseUnit})
                                  </option>
                                ))}
                              </select>
                              {isOverStock && (
                                <p className="mt-1 text-[11px] font-bold text-red-600">
                                  Không đủ tồn kho! Tồn hiện tại: {inStock} {item?.baseUnit}.
                                </p>
                              )}
                            </td>

                            {/* Qty */}
                            <td className="p-2.5">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                required
                                value={line.inputQuantity}
                                onChange={(e) => updateIssueLine(idx, 'inputQuantity', e.target.value)}
                                className={`w-full rounded-lg border p-2 text-right font-semibold ${
                                  isOverStock ? 'border-red-400 bg-red-50 text-red-700' : 'border-slate-200'
                                }`}
                              />
                            </td>

                            {/* Unit */}
                            <td className="p-2.5 font-semibold text-slate-700">
                              {item?.baseUnit || line.inputUnit}
                            </td>

                            {/* Batch selection */}
                            <td className="p-2.5">
                              <select
                                value={line.manualBatchId || ''}
                                onChange={(e) => updateIssueLine(idx, 'manualBatchId', e.target.value)}
                                className="w-full rounded-lg border border-slate-200 p-2 text-xs font-medium"
                              >
                                <option value="">Tự động xuất theo FEFO / FIFO</option>
                                {item?.inventoryBatches
                                  .filter((b) => issueOutboundType === 'DISPOSAL' || b.quantity > 0)
                                  .map((b) => (
                                    <option key={b.id} value={b.id}>
                                      Lô: {b.batchNo || '—'} · HSD: {formatDate(b.expiryDate)} · SL:{' '}
                                      {b.quantity} (Giá vốn: {money(b.unitCost)})
                                    </option>
                                  ))}
                              </select>
                            </td>

                            {/* Delete line */}
                            <td className="p-2.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeIssueLine(idx)}
                                className="rounded p-1 text-slate-400 hover:text-red-600"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Non-FEFO Reason if any manual batch is picked */}
              {issueLines.some((l) => l.manualBatchId) && (
                <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4">
                  <label className="text-xs font-bold text-amber-900">
                    Lý do chọn xuất không theo FEFO/FIFO <span className="text-red-600">*</span>
                  </label>
                  <p className="mt-0.5 text-xs text-amber-700">
                    Theo quy định, hệ thống mặc định ưu tiên lô hết hạn trước (FEFO). Khi bạn chỉ định lô cụ thể, bắt buộc ghi rõ lý do.
                  </p>
                  <input
                    type="text"
                    required
                    value={issueNonFefoReason}
                    onChange={(e) => setIssueNonFefoReason(e.target.value)}
                    placeholder="Chỉ định dùng riêng cho ca cấy ghép / bệnh nhân có chỉ định đặc biệt..."
                    className="mt-2 w-full rounded-xl border border-amber-300 bg-white p-2.5 text-xs text-slate-900 outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setIssueModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="rounded-xl bg-[#5546e8] px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#5546e8]/25 hover:bg-[#4335d6] disabled:opacity-50"
                >
                  {busy ? 'Đang lưu...' : 'Lưu phiếu xuất nháp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT DETAIL MODAL */}
      {detailModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="relative my-8 w-full max-w-4xl rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#5546e8]">
                  Chi tiết chứng từ kho
                </span>
                <h2 className="text-xl font-black text-slate-900">{detailModalDoc.code}</h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailModalDoc(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:text-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-5 space-y-6 max-h-[75vh] overflow-y-auto pr-1">
              {/* Header Meta */}
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl bg-slate-50 p-4 text-xs">
                <div>
                  <span className="text-slate-400 font-medium">Loại phiếu:</span>
                  <p className="font-bold text-slate-800">
                    {detailModalDoc.type === 'IN' ? 'Nhập kho (MVT)' : 'Xuất kho (XVT)'}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Trạng thái:</span>
                  <p className="font-bold text-slate-800">{detailModalDoc.status}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Ngày lập:</span>
                  <p className="font-semibold text-slate-800">
                    {formatDateTime(detailModalDoc.createdAt)}
                  </p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Đối tác / Nơi nhận:</span>
                  <p className="font-semibold text-slate-800">
                    {detailModalDoc.supplier?.name ||
                      detailModalDoc.recipientDepartment ||
                      (detailModalDoc.patientId ? `BN ID: ${detailModalDoc.patientId}` : '—')}
                  </p>
                </div>
                {detailModalDoc.reason && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 font-medium">Lý do:</span>
                    <p className="font-semibold text-slate-800">{detailModalDoc.reason}</p>
                  </div>
                )}
                {detailModalDoc.contentHash && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-400 font-medium">Hash bảo mật (SHA-256):</span>
                    <p className="font-mono text-[11px] text-slate-600 break-all">
                      {detailModalDoc.contentHash}
                    </p>
                  </div>
                )}
              </div>

              {/* Lines Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Dòng chi tiết ({detailModalDoc.lines.length})
                </h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                      <tr>
                        <th className="p-3">Mã VT</th>
                        <th className="p-3">Tên vật tư</th>
                        <th className="p-3 text-right">SL nhập/xuất</th>
                        <th className="p-3 text-right">SL quy đổi</th>
                        <th className="p-3 text-center">Số lô</th>
                        <th className="p-3 text-center">Hạn dùng</th>
                        <th className="p-3 text-right">Đơn giá</th>
                        <th className="p-3 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {detailModalDoc.lines.map((l) => (
                        <tr key={l.id}>
                          <td className="p-3 font-mono font-bold text-slate-800">{l.supply?.code}</td>
                          <td className="p-3 font-medium text-slate-900">{l.supply?.name}</td>
                          <td className="p-3 text-right font-semibold">
                            {l.inputQuantity} {l.inputUnit}
                          </td>
                          <td className="p-3 text-right">
                            {l.convertedQuantity} {l.supply?.baseUnit}
                          </td>
                          <td className="p-3 text-center font-mono">{l.batchNo || '—'}</td>
                          <td className="p-3 text-center">{formatDate(l.expiryDate)}</td>
                          <td className="p-3 text-right font-mono">
                            {l.inputUnitPrice ? money(l.inputUnitPrice) : '—'}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-900">
                            {money(l.totalAmount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t bg-slate-50 font-bold">
                      <tr>
                        <td colSpan={7} className="p-3 text-right uppercase text-slate-700">
                          Tổng cộng:
                        </td>
                        <td className="p-3 text-right font-mono text-sm text-[#5546e8]">
                          {money(detailModalDoc.totalAmount)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Stock Allocations if posted */}
              {detailModalDoc.type === 'OUT' && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                    Lô tồn kho đã xuất (FEFO/FIFO)
                  </h4>
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                        <tr>
                          <th className="p-3">Vật tư</th>
                          <th className="p-3 text-center">Số lô</th>
                          <th className="p-3 text-right">Số lượng trừ kho</th>
                          <th className="p-3 text-right">Giá vốn lô</th>
                          <th className="p-3 text-right">Tổng giá vốn</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {detailModalDoc.lines.flatMap((line) =>
                          (line.allocations || []).map((alloc) => (
                            <tr key={alloc.id}>
                              <td className="p-3 font-medium text-slate-800">{line.supply?.name}</td>
                              <td className="p-3 text-center font-mono">{alloc.batch?.batchNo || '—'}</td>
                              <td className="p-3 text-right font-semibold">
                                {alloc.quantity} {line.supply?.baseUnit}
                              </td>
                              <td className="p-3 text-right font-mono">{money(alloc.unitCost)}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-900">
                                {money(alloc.amount)}
                              </td>
                            </tr>
                          )),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Print and Audit History */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Print Logs */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-700">
                    <History className="size-4 text-[#5546e8]" />
                    Lịch sử in phiếu ({detailModalDoc.printLogs?.length ?? 0})
                  </h5>
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto text-xs">
                    {(detailModalDoc.printLogs || []).map((p, idx) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-slate-700"
                      >
                        <span>
                          Lần {idx + 1} {p.isCopy && '· BẢN SAO'}
                        </span>
                        <span className="text-slate-400">{formatDateTime(p.printedAt)}</span>
                      </div>
                    ))}
                    {!detailModalDoc.printLogs?.length && (
                      <p className="text-slate-400 italic">Chưa có lượt in nào.</p>
                    )}
                  </div>
                </div>

                {/* Audit Logs */}
                <div className="rounded-2xl border border-slate-200 p-4">
                  <h5 className="flex items-center gap-1.5 text-xs font-bold uppercase text-slate-700">
                    <History className="size-4 text-emerald-600" />
                    Nhật ký kiểm toán ({detailModalDoc.auditLogs?.length ?? 0})
                  </h5>
                  <div className="mt-3 space-y-2 max-h-40 overflow-y-auto text-xs">
                    {(detailModalDoc.auditLogs || []).map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between rounded-lg bg-slate-50 p-2 text-slate-700"
                      >
                        <span className="font-semibold text-slate-800">{a.action}</span>
                        <span className="text-slate-400">{formatDateTime(a.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t pt-4">
              <button
                type="button"
                onClick={() => setDetailModalDoc(null)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
              {detailModalDoc.status !== 'CANCELLED' && (
                <button
                  type="button"
                  onClick={() => {
                    handlePrint(detailModalDoc)
                    setDetailModalDoc(null)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100"
                >
                  <Printer className="size-4" /> In phiếu
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-red-100 text-red-600">
                <Ban className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Hủy chứng từ {cancelModalDoc.code}
                </h3>
                <p className="text-xs text-slate-500">
                  Trạng thái hiện tại: {cancelModalDoc.status}
                </p>
              </div>
            </div>

            {cancelModalDoc.status === 'POSTED' && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
                <strong className="block font-bold">Cảnh báo chứng từ đã ghi sổ:</strong>
                Việc hủy chứng từ đã ghi sổ sẽ tự động sinh bút toán đảo ngược trên sổ kho và hoàn trả tồn kho theo quy tắc an toàn. Bắt buộc có lý do chính đáng!
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Lý do hủy chứng từ <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do chi tiết..."
                className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-red-500"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelModalDoc(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Không hủy
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleCancel}
                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? 'Đang xử lý...' : 'Xác nhận hủy phiếu'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CREATE SUPPLIER MODAL */}
      {newSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-slate-900">Thêm nhà cung cấp mới</h3>
              <button
                type="button"
                onClick={() => setNewSupplierModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSupplier} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Tên nhà cung cấp *</label>
                <input
                  required
                  value={newSupplierForm.name}
                  onChange={(e) => setNewSupplierForm((f) => ({ ...f, name: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Mã số thuế</label>
                <input
                  value={newSupplierForm.taxCode}
                  onChange={(e) => setNewSupplierForm((f) => ({ ...f, taxCode: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Số điện thoại</label>
                <input
                  value={newSupplierForm.phone}
                  onChange={(e) => setNewSupplierForm((f) => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Địa chỉ</label>
                <input
                  value={newSupplierForm.address}
                  onChange={(e) => setNewSupplierForm((f) => ({ ...f, address: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setNewSupplierModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5546e8] px-4 py-2 text-xs font-bold text-white shadow"
                >
                  Lưu nhà cung cấp
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK CREATE SUPPLY ITEM MODAL */}
      {newItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#5546e8]">
                  Mã VT tự sinh (VT-xxxx)
                </span>
                <h3 className="text-base font-bold text-slate-900">Tạo vật tư mới</h3>
              </div>
              <button
                type="button"
                onClick={() => setNewItemModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700">Tên vật tư *</label>
                <input
                  required
                  value={newItemForm.name}
                  onChange={(e) => setNewItemForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ví dụ: Chỉ tự tiêu Vicryl 4/0"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Nhóm vật tư *</label>
                <select
                  value={newItemForm.group}
                  onChange={(e) => setNewItemForm((f) => ({ ...f, group: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs font-semibold"
                >
                  <option value="THUONG">VTYT Thường</option>
                  <option value="VO_CAM">VTYT Vô Cảm</option>
                  <option value="VAN_PHONG">Văn Phòng Phẩm</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700">Đơn vị cơ bản (ĐVCB) *</label>
                <input
                  required
                  value={newItemForm.baseUnit}
                  onChange={(e) => setNewItemForm((f) => ({ ...f, baseUnit: e.target.value }))}
                  placeholder="Cái, Ống, Lọ, Chai, Tép..."
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-bold text-slate-700">Tồn tối thiểu</label>
                  <input
                    type="number"
                    min="0"
                    value={newItemForm.minimumStock}
                    onChange={(e) =>
                      setNewItemForm((f) => ({ ...f, minimumStock: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700">Báo hạn dùng (ngày)</label>
                  <input
                    type="number"
                    min="1"
                    value={newItemForm.expiryWarningDays}
                    onChange={(e) =>
                      setNewItemForm((f) => ({ ...f, expiryWarningDays: Number(e.target.value) }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setNewItemModalOpen(false)}
                  className="rounded-xl border px-4 py-2 text-xs font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-[#5546e8] px-4 py-2 text-xs font-bold text-white shadow"
                >
                  Lưu vật tư
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT VIEW MODAL */}
      {printingDoc && (
        <WarehousePrintView
          document={printingDoc}
          onClose={() => setPrintingDoc(null)}
          onExportExcel={() => exportDocumentsToExcel([printingDoc])}
        />
      )}
    </section>
  )
}
