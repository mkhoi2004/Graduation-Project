import { useEffect, useState, type FormEvent } from 'react'
import {
  FileWarning,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react'
import { createInvoice, fetchPendingStockDocuments, fetchSupplierInvoices } from './accounting-api'
import { formatCurrency, formatDate } from './accounting-format'
import type { PendingStockDocument, SupplierInvoice } from './accounting-types'
import { Card, inputClass, Message, Modal, PageHeading, selectClass } from './accounting-ui'

const CLINIC_INFO = {
  name: 'PHÒNG KHÁM NHA KHOA DENTALKHOI',
  taxCode: '0312345678',
  address: '123 Đường 3/2, Phường 11, Quận 10, TP. Hồ Chí Minh',
}

export function AccountingInvoicesPage() {
  const [invoices, setInvoices] = useState<SupplierInvoice[]>([])
  const [pendingDocs, setPendingDocs] = useState<PendingStockDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Modal form state
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [series, setSeries] = useState('')
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [supplierTaxCode, setSupplierTaxCode] = useState('')
  const [buyerName, setBuyerName] = useState(CLINIC_INFO.name)
  const [buyerTaxCode, setBuyerTaxCode] = useState(CLINIC_INFO.taxCode)
  const [buyerAddress, setBuyerAddress] = useState(CLINIC_INFO.address)
  const [goodsAmount, setGoodsAmount] = useState<number | string>('')
  const [taxAmount, setTaxAmount] = useState<number | string>('')
  const [selectedStockDocIds, setSelectedStockDocIds] = useState<number[]>([])
  const [differenceNote, setDifferenceNote] = useState('')

  // Search filter
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [invList, pendList] = await Promise.all([
        fetchSupplierInvoices(),
        fetchPendingStockDocuments(),
      ])
      setInvoices(invList)
      setPendingDocs(pendList)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách hóa đơn.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([
      fetchSupplierInvoices(),
      fetchPendingStockDocuments(),
    ])
      .then(([invList, pendList]) => {
        if (!active) return
        setInvoices(invList)
        setPendingDocs(pendList)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (!active) return
        setError(e.message || 'Không thể tải danh sách hóa đơn.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Check validity
  const isInvoiceValid =
    buyerTaxCode.trim() === CLINIC_INFO.taxCode &&
    buyerName.trim().toUpperCase() === CLINIC_INFO.name.toUpperCase()

  // Calculate selected stock docs total
  const selectedDocsTotal = pendingDocs
    .filter((doc) => selectedStockDocIds.includes(doc.id))
    .reduce((sum, doc) => sum + doc.totalAmount, 0)

  const invoiceTotal = Number(goodsAmount || 0) + Number(taxAmount || 0)
  const hasDifference =
    selectedStockDocIds.length > 0 && Math.abs(invoiceTotal - selectedDocsTotal) > 0

  // Open modal
  const openCreateModal = (prefillDocId?: number) => {
    setInvoiceNumber('')
    setSeries('')
    setInvoiceDate(new Date().toISOString().slice(0, 10))
    setSupplierTaxCode('')
    setBuyerName(CLINIC_INFO.name)
    setBuyerTaxCode(CLINIC_INFO.taxCode)
    setBuyerAddress(CLINIC_INFO.address)
    setGoodsAmount('')
    setTaxAmount('')
    setDifferenceNote('')
    if (prefillDocId) {
      setSelectedStockDocIds([prefillDocId])
      const found = pendingDocs.find((d) => d.id === prefillDocId)
      if (found) {
        setGoodsAmount(Math.round(found.totalAmount / 1.1))
        setTaxAmount(found.totalAmount - Math.round(found.totalAmount / 1.1))
      }
    } else {
      setSelectedStockDocIds([])
    }
    setIsModalOpen(true)
  }

  // Submit invoice
  async function handleSubmitInvoice(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')

    if (selectedStockDocIds.length === 0) {
      setError('Vui lòng chọn ít nhất một phiếu nhập kho liên kết.')
      return
    }

    if (hasDifference && !differenceNote.trim()) {
      setError('Tổng tiền hóa đơn lệch với phiếu nhập kho. Bắt buộc nhập giải trình chênh lệch.')
      return
    }

    try {
      await createInvoice({
        invoiceNumber: invoiceNumber.trim(),
        series: series.trim(),
        invoiceDate,
        supplierTaxCode: supplierTaxCode.trim(),
        buyerName: buyerName.trim(),
        buyerTaxCode: buyerTaxCode.trim(),
        buyerAddress: buyerAddress.trim(),
        goodsAmount: Number(goodsAmount),
        taxAmount: Number(taxAmount),
        totalAmount: invoiceTotal,
        documentStatus: isInvoiceValid ? 'VALID' : 'INVALID',
        differenceNote: differenceNote.trim() || undefined,
        stockDocumentIds: selectedStockDocIds,
      })

      setMessage('Đã lưu và đối chiếu hóa đơn nhà cung cấp thành công.')
      setIsModalOpen(false)
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lưu hóa đơn.')
    }
  }

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    if (statusFilter && inv.documentStatus !== statusFilter) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      const matchNum = inv.invoiceNumber.toLowerCase().includes(s)
      const matchSeries = inv.series.toLowerCase().includes(s)
      const matchSupplier = (inv.supplierTaxCode ?? '').toLowerCase().includes(s)
      if (!matchNum && !matchSeries && !matchSupplier) return false
    }
    return true
  })

  // Overdue pending docs (> 7 days)
  const overdueDocs = pendingDocs.filter((d) => d.isOverdue)

  return (
    <div className="space-y-6">
      <PageHeading
        title="Hóa đơn nhà cung cấp &amp; Đối chiếu phiếu nhập"
        description="Đối chiếu quan hệ nhiều-nhiều giữa hóa đơn tài chính và các phiếu nhập kho đã ghi sổ; phát hiện hóa đơn sai pháp nhân và nhắc nhở phiếu chờ hóa đơn."
        action={
          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5546e8] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#5546e8]/20 transition hover:bg-[#4335d6]"
          >
            <Plus className="size-4" />
            <span>Thêm hóa đơn NCC</span>
          </button>
        }
      />

      {message && <Message value={message} />}
      {error && <Message value={error} error />}

      {/* OVERDUE PENDING WARNING BANNER */}
      {overdueDocs.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <FileWarning className="size-5 text-amber-600" />
            <span>CẢNH BÁO: Có {overdueDocs.length} phiếu nhập kho &quot;Chờ hóa đơn&quot; quá 7 ngày!</span>
          </div>
          <p className="mt-1 text-slate-600">
            Kế toán cần liên hệ nhà cung cấp yêu cầu xuất hóa đơn tài chính kịp thời để đảm bảo chi phí hợp lệ được khấu trừ:
          </p>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {overdueDocs.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between rounded-xl border border-amber-200 bg-white p-2.5 shadow-xs"
              >
                <div>
                  <p className="font-mono font-bold text-slate-900">{doc.code}</p>
                  <p className="text-[11px] text-slate-500">{doc.supplierName}</p>
                  <p className="text-[10px] font-bold text-rose-600">
                    Đã chờ {doc.daysWaiting} ngày (Quá hạn 7 ngày)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openCreateModal(doc.id)}
                  className="rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-amber-700"
                >
                  Nhập HĐ
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FILTER BAR */}
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm số hóa đơn, ký hiệu, MST NCC..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">Tất cả trạng thái chứng từ</option>
              <option value="VALID">Hóa đơn đúng (Khớp tên &amp; MST)</option>
              <option value="INVALID">Hóa đơn sai (Sai tên / MST)</option>
              <option value="PENDING">Chờ đối chiếu</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Có <strong>{filteredInvoices.length}</strong> hóa đơn nhà cung cấp
            </span>
            {(searchTerm || statusFilter) && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('')
                }}
                className="text-xs font-bold text-[#5546e8] hover:underline"
              >
                Đặt lại
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* INVOICES TABLE */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="p-3">Hóa đơn &amp; Ngày</th>
                <th className="p-3">Nhà cung cấp</th>
                <th className="p-3">Bên mua trên HĐ</th>
                <th className="p-3 text-right">Tiền hàng</th>
                <th className="p-3 text-right">Thuế GTGT</th>
                <th className="p-3 text-right">Tổng thanh toán</th>
                <th className="p-3 text-center">Trạng thái HĐ</th>
                <th className="p-3">Phiếu nhập kho liên kết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((inv) => {
                const isValid = inv.documentStatus === 'VALID'
                return (
                  <tr key={inv.id} className="hover:bg-slate-50/70">
                    {/* Hóa đơn & Ngày */}
                    <td className="p-3">
                      <p className="font-mono font-bold text-slate-900">
                        {inv.series} - {inv.invoiceNumber}
                      </p>
                      <p className="text-[11px] text-slate-400">{formatDate(inv.invoiceDate)}</p>
                    </td>

                    {/* NCC */}
                    <td className="p-3">
                      <p className="font-medium text-slate-900">MST: {inv.supplierTaxCode}</p>
                      <p className="text-[11px] text-slate-400">ID NCC: #{inv.supplierId ?? '—'}</p>
                    </td>

                    {/* Bên mua */}
                    <td className="p-3">
                      <p className="font-semibold text-slate-800">{inv.buyerName || '—'}</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        MST: {inv.buyerTaxCode || '—'}
                      </p>
                    </td>

                    {/* Tiền hàng */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {formatCurrency(inv.goodsAmount)}
                    </td>

                    {/* Thuế GTGT */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {formatCurrency(inv.taxAmount)}
                    </td>

                    {/* Tổng tiền */}
                    <td className="p-3 text-right font-mono text-sm font-extrabold text-[#5546e8]">
                      {formatCurrency(inv.totalAmount)}
                    </td>

                    {/* Trạng thái */}
                    <td className="p-3 text-center">
                      {isValid ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                          <ShieldCheck className="size-3" />
                          Hóa đơn đúng
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700"
                          title={inv.differenceNote || 'Sai thông tin tên/MST bên mua'}
                        >
                          <ShieldAlert className="size-3" />
                          Hóa đơn sai
                        </span>
                      )}
                      {inv.differenceNote && (
                        <p className="mt-1 max-w-[180px] truncate text-[10px] italic text-rose-600" title={inv.differenceNote}>
                          {inv.differenceNote}
                        </p>
                      )}
                    </td>

                    {/* Phiếu nhập kho liên kết */}
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {inv.stockDocuments?.map((sd) => (
                          <span
                            key={sd.stockDocumentId}
                            className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-800"
                          >
                            {sd.code}
                          </span>
                        ))}
                        {(!inv.stockDocuments || inv.stockDocuments.length === 0) && (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!loading && filteredInvoices.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Chưa có hóa đơn nhà cung cấp nào.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL THÊM HÓA ĐƠN NCC */}
      <Modal
        title="Thêm và đối chiếu hóa đơn nhà cung cấp"
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmitInvoice} className="space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-3 text-xs">
            <p className="font-bold text-indigo-900">Quy tắc đối soát hóa đơn:</p>
            <p className="mt-0.5 text-indigo-700">
              Hệ thống tự động kiểm tra Tên &amp; MST bên mua với thông tin pháp nhân đăng ký của phòng khám. Nếu không khớp sẽ cảnh báo Hóa đơn sai.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Ký hiệu mẫu số:
              </label>
              <input
                type="text"
                required
                value={series}
                onChange={(e) => setSeries(e.target.value)}
                placeholder="VD: 1C26TAA"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Số hóa đơn (7 chữ số):
              </label>
              <input
                type="text"
                required
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="VD: 0001425"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Ngày lập hóa đơn:
              </label>
              <input
                type="date"
                required
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Mã số thuế bên bán (Nhà cung cấp):
            </label>
            <input
              type="text"
              required
              value={supplierTaxCode}
              onChange={(e) => setSupplierTaxCode(e.target.value)}
              placeholder="VD: 0309988771"
              className={inputClass}
            />
          </div>

          {/* Thông tin bên mua */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800">Thông tin bên mua trên hóa đơn:</span>
              {isInvoiceValid ? (
                <span className="flex items-center gap-1 font-bold text-emerald-700">
                  <ShieldCheck className="size-3.5" /> Khớp pháp nhân phòng khám
                </span>
              ) : (
                <span className="flex items-center gap-1 font-bold text-rose-600">
                  <ShieldAlert className="size-3.5" /> Không khớp (Sẽ ghi nhận Hóa đơn sai)
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] text-slate-500">Tên đơn vị mua:</label>
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] text-slate-500">MST bên mua:</label>
                <input
                  type="text"
                  required
                  value={buyerTaxCode}
                  onChange={(e) => setBuyerTaxCode(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-[11px] text-slate-500">Địa chỉ bên mua:</label>
              <input
                type="text"
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          {/* Chọn phiếu nhập kho */}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Liên kết các phiếu nhập kho:
            </label>
            <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 p-2 space-y-1.5">
              {pendingDocs.map((doc) => {
                const isChecked = selectedStockDocIds.includes(doc.id)
                return (
                  <label
                    key={doc.id}
                    className={`flex cursor-pointer items-center justify-between rounded-lg p-2 text-xs transition ${
                      isChecked ? 'bg-indigo-50 border border-indigo-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedStockDocIds([...selectedStockDocIds, doc.id])
                          } else {
                            setSelectedStockDocIds(selectedStockDocIds.filter((id) => id !== doc.id))
                          }
                        }}
                        className="rounded text-[#5546e8]"
                      />
                      <span className="font-mono font-bold text-slate-900">{doc.code}</span>
                      <span className="text-slate-500">({doc.supplierName})</span>
                    </div>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(doc.totalAmount)}
                    </span>
                  </label>
                )
              })}
              {pendingDocs.length === 0 && (
                <p className="py-2 text-center text-xs text-slate-400">
                  Không có phiếu nhập kho nào đang chờ hóa đơn.
                </p>
              )}
            </div>
          </div>

          {/* Tiền hàng & Tiền thuế */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Tiền hàng chưa thuế (VND):
              </label>
              <input
                type="number"
                min="0"
                required
                value={goodsAmount}
                onChange={(e) => setGoodsAmount(e.target.value)}
                placeholder="VD: 5000000"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Tiền thuế GTGT (VND):
              </label>
              <input
                type="number"
                min="0"
                required
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                placeholder="VD: 500000"
                className={inputClass}
              />
            </div>
          </div>

          {/* Total summary & Difference check */}
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">Tổng tiền hóa đơn:</span>
              <span className="font-mono font-bold text-[#5546e8]">{formatCurrency(invoiceTotal)}</span>
            </div>
            <div className="flex justify-between py-0.5 border-t border-slate-200/60">
              <span className="text-slate-500">Tổng tiền các phiếu nhập đã chọn:</span>
              <span className="font-mono font-bold text-slate-800">{formatCurrency(selectedDocsTotal)}</span>
            </div>
            {hasDifference && (
              <div className="mt-1 pt-1 border-t border-rose-200 text-rose-600 font-bold flex justify-between">
                <span>Chênh lệch phát sinh:</span>
                <span className="font-mono">{formatCurrency(Math.abs(invoiceTotal - selectedDocsTotal))}</span>
              </div>
            )}
          </div>

          {/* Difference Note */}
          {hasDifference && (
            <div>
              <label className="mb-1 block text-xs font-semibold text-rose-700">
                Giải trình lý do lệch tiền (Bắt buộc):
              </label>
              <textarea
                required
                rows={2}
                value={differenceNote}
                onChange={(e) => setDifferenceNote(e.target.value)}
                placeholder="VD: Chiết khấu thương mại thanh toán sớm 5%, hoặc phát sinh phí vận chuyển ngoài hợp đồng..."
                className={`${inputClass} border-rose-300 focus:border-rose-500`}
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#5546e8] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#5546e8]/20 hover:bg-[#4335d6]"
            >
              Lưu &amp; Hoàn tất đối chiếu
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
