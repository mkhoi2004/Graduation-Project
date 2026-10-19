import { useEffect, useState, type FormEvent } from 'react'
import {
  Coins,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react'
import {
  confirmTax,
  createExpense,
  createRefund,
  fetchCash,
  fetchLosses,
} from './accounting-api'
import {
  categoryLabel,
  documentStatusBadge,
  formatCurrency,
  formatDate,
  methodLabel,
} from './accounting-format'
import type { AccountingEntry } from './accounting-types'
import { Card, inputClass, Message, Modal, PageHeading, selectClass } from './accounting-ui'
import { AccountingPrintView } from './accounting-print-view'
import { clinicRooms } from '../reception/reception-data'

export function AccountingCashPage() {
  const [activeTab, setActiveTab] = useState<'CASH' | 'LOSS'>('CASH')
  const [rows, setRows] = useState<AccountingEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Filters
  const [searchTerm, setSearchTerm] = useState('')
  const [directionFilter, setDirectionFilter] = useState<'ALL' | 'IN' | 'OUT'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [roomFilter, setRoomFilter] = useState('')

  // Modals state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState<AccountingEntry | null>(null)
  const [printEntry, setPrintEntry] = useState<AccountingEntry | null>(null)

  // Tax form state
  const [taxRateInput, setTaxRateInput] = useState<number | string>(0)
  const [taxAmountInput, setTaxAmountInput] = useState<number | string>(0)
  const [taxReason, setTaxReason] = useState('')

  // Refund form state
  const [refundAmount, setRefundAmount] = useState<number | string>('')
  const [refundReason, setRefundReason] = useState('')

  const [todayDate] = useState(() => new Date().toISOString().slice(0, 10))

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      if (activeTab === 'CASH') {
        const data = await fetchCash({
          roomId: roomFilter ? Number(roomFilter) : undefined,
          category: categoryFilter || undefined,
          paymentMethod: methodFilter || undefined,
        })
        setRows(data)
      } else {
        const data = await fetchLosses({
          roomId: roomFilter ? Number(roomFilter) : undefined,
        })
        setRows(data)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải sổ giao dịch.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    const promise =
      activeTab === 'CASH'
        ? fetchCash({
            roomId: roomFilter ? Number(roomFilter) : undefined,
            category: categoryFilter || undefined,
            paymentMethod: methodFilter || undefined,
          })
        : fetchLosses({
            roomId: roomFilter ? Number(roomFilter) : undefined,
          })

    promise
      .then((data) => {
        if (!active) return
        setRows(data)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (!active) return
        setError(e.message || 'Không thể tải sổ giao dịch.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [activeTab, roomFilter, categoryFilter, methodFilter])

  // Submit Expense
  async function handleCreateExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    const form = new FormData(e.currentTarget)
    const category = form.get('category') as string
    const method = form.get('method') as string
    const amount = Number(form.get('amount'))
    const effectiveDate = form.get('effectiveDate') as string
    const transactionCode = (form.get('transactionCode') as string) || undefined
    const reason = form.get('reason') as string
    const roomId = form.get('roomId') ? Number(form.get('roomId')) : undefined

    try {
      await createExpense({
        category,
        amount,
        method,
        effectiveDate,
        transactionCode,
        roomId,
        reason,
      })
      setMessage('Đã ghi nhận khoản chi thành công và tạo số phiếu chi PC.')
      setIsExpenseModalOpen(false)
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi ghi nhận khoản chi.')
    }
  }

  // Open Tax Modal
  const openTaxModal = (entry: AccountingEntry) => {
    setSelectedEntry(entry)
    setTaxRateInput(entry.taxRate ?? 0)
    setTaxAmountInput(entry.taxAmount ?? 0)
    setTaxReason('')
    setIsTaxModalOpen(true)
  }

  // Submit Tax Confirmation
  async function handleConfirmTax(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedEntry) return
    setError('')
    setMessage('')
    try {
      await confirmTax(selectedEntry.id, {
        taxRate: Number(taxRateInput) || undefined,
        taxAmount: Number(taxAmountInput) || undefined,
        reason: taxReason || undefined,
      })
      setMessage(`Đã xác nhận thuế GTGT cho chứng từ ${selectedEntry.sourceCode}.`)
      setIsTaxModalOpen(false)
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xác nhận thuế.')
    }
  }

  // Open Refund Modal
  const openRefundModal = (entry: AccountingEntry) => {
    setSelectedEntry(entry)
    setRefundAmount(entry.totalAmount)
    setRefundReason('')
    setIsRefundModalOpen(true)
  }

  // Submit Refund Request
  async function handleCreateRefund(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedEntry) return
    setError('')
    setMessage('')
    try {
      await createRefund({
        originalEntryId: selectedEntry.id,
        amount: Number(refundAmount),
        reason: refundReason,
      })
      setMessage(
        `Đã tạo yêu cầu hoàn tiền cho chứng từ ${selectedEntry.sourceCode}. Chờ Admin duyệt.`,
      )
      setIsRefundModalOpen(false)
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi gửi yêu cầu hoàn tiền.')
    }
  }

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    if (directionFilter !== 'ALL' && r.direction !== directionFilter) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      const matchCode = r.sourceCode.toLowerCase().includes(s)
      const matchReason = (r.reason ?? '').toLowerCase().includes(s)
      const matchTx = (r.transactionCode ?? '').toLowerCase().includes(s)
      if (!matchCode && !matchReason && !matchTx) return false
    }
    return true
  })

  // Summary counts
  const totalIn = filteredRows
    .filter((r) => r.direction === 'IN')
    .reduce((sum, r) => sum + r.totalAmount, 0)
  const totalOut = filteredRows
    .filter((r) => r.direction === 'OUT')
    .reduce((sum, r) => sum + r.totalAmount, 0)

  return (
    <div className="space-y-6">
      <PageHeading
        title="Quản lý thu chi &amp; Sổ dòng tiền"
        description="Mỗi dòng là một khoản tiền thực tế, lưu trữ độc lập thuế suất nhập tay và liên kết hai chiều với chứng từ gốc."
        action={
          <button
            type="button"
            onClick={() => setIsExpenseModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#5546e8] px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-[#5546e8]/20 transition hover:bg-[#4335d6]"
          >
            <Plus className="size-4" />
            <span>Lập phiếu chi tiền</span>
          </button>
        }
      />

      {message && <Message value={message} />}
      {error && <Message value={error} error />}

      {/* TABS SWITCH */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('CASH')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'CASH'
              ? 'border-[#5546e8] text-[#5546e8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="size-4" />
          <span>Sổ dòng tiền (Thực thu &amp; Thực chi)</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('LOSS')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'LOSS'
              ? 'border-rose-600 text-rose-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trash2 className="size-4" />
          <span>Tổn thất (Không dòng tiền - Xuất hủy)</span>
        </button>
      </div>

      {/* FILTER CONTROLS */}
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Search text */}
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã số, lý do, mã GD..."
              className={`${inputClass} pl-9`}
            />
          </div>

          {/* Direction */}
          {activeTab === 'CASH' && (
            <div>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value as any)}
                className={selectClass}
              >
                <option value="ALL">Tất cả chiều (Vào &amp; Ra)</option>
                <option value="IN">Chỉ tiền vào (Thu)</option>
                <option value="OUT">Chỉ tiền ra (Chi)</option>
              </select>
            </div>
          )}

          {/* Category */}
          {activeTab === 'CASH' && (
            <div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">Tất cả nhóm</option>
                <optgroup label="Khoản tiền vào">
                  <option value="PATIENT_ADVANCE">Tạm ứng tiếp nhận</option>
                  <option value="TREATMENT_REVENUE">Thu dịch vụ điều trị</option>
                  <option value="COSMETIC_REVENUE">Thu thẩm mỹ &amp; Phục hình</option>
                  <option value="DEPOSIT_REVENUE">Thu cọc điều trị</option>
                  <option value="RETAIL_REVENUE">Thu bán lẻ</option>
                </optgroup>
                <optgroup label="Khoản tiền ra">
                  <option value="MATERIAL_PAYMENT">Chi vật tư y tế</option>
                  <option value="LABO_PAYMENT">Chi labo phục hình</option>
                  <option value="ADMIN_EXPENSE">Chi hành chính</option>
                  <option value="SALARY">Chi lương</option>
                  <option value="CARD_FEE">Phí thẻ POS</option>
                  <option value="REFUND">Hoàn tiền (đảo)</option>
                </optgroup>
              </select>
            </div>
          )}

          {/* Payment Method */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">Tất cả hình thức</option>
              <option value="CASH">Tiền mặt</option>
              <option value="TRANSFER">Chuyển khoản</option>
              <option value="CARD">Thẻ POS</option>
              <option value="MOMO">Ví MoMo</option>
            </select>
          </div>

          {/* Room */}
          <div>
            <select
              value={roomFilter}
              onChange={(e) => setRoomFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">Tất cả phòng khám</option>
              {clinicRooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Totals banner */}
        {activeTab === 'CASH' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500">
              Hiển thị <strong>{filteredRows.length}</strong> khoản giao dịch
            </span>
            <div className="flex items-center gap-4">
              <span>
                Tổng thu:{' '}
                <strong className="font-mono text-emerald-600">+{formatCurrency(totalIn)}</strong>
              </span>
              <span>
                Tổng chi:{' '}
                <strong className="font-mono text-rose-600">−{formatCurrency(totalOut)}</strong>
              </span>
              <span>
                Chênh lệch dòng tiền:{' '}
                <strong
                  className={`font-mono ${totalIn - totalOut >= 0 ? 'text-[#5546e8]' : 'text-rose-600'}`}
                >
                  {formatCurrency(totalIn - totalOut)}
                </strong>
              </span>
            </div>
          </div>
        )}
      </Card>

      {/* TABLE */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="p-3">Ngày &amp; Mã số</th>
                <th className="p-3">Nhóm giao dịch</th>
                <th className="p-3">Nội dung / Lý do</th>
                <th className="p-3">Hình thức</th>
                <th className="p-3 text-right">Tiền chưa thuế</th>
                <th className="p-3 text-right">Thuế GTGT</th>
                <th className="p-3 text-right">Tổng tiền</th>
                <th className="p-3 text-center">Chứng từ</th>
                <th className="p-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const docBadge = documentStatusBadge(row.documentStatus)
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    {/* Ngày & Mã số */}
                    <td className="p-3">
                      <p className="font-mono font-bold text-slate-900">{row.sourceCode}</p>
                      <p className="text-[11px] text-slate-400">{formatDate(row.effectiveDate)}</p>
                    </td>

                    {/* Nhóm */}
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {row.direction === 'IN' && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                            +
                          </span>
                        )}
                        {row.direction === 'OUT' && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">
                            −
                          </span>
                        )}
                        {row.direction === 'NONE' && (
                          <span className="flex size-5 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-500">
                            •
                          </span>
                        )}
                        <span className="font-medium text-slate-800">
                          {categoryLabel(row.category)}
                        </span>
                      </div>
                    </td>

                    {/* Nội dung */}
                    <td className="p-3">
                      <p className="max-w-[240px] truncate text-slate-700" title={row.reason}>
                        {row.reason || '—'}
                      </p>
                      {row.transactionCode && (
                        <p className="font-mono text-[10px] text-slate-400">
                          Mã GD: {row.transactionCode}
                        </p>
                      )}
                    </td>

                    {/* Hình thức */}
                    <td className="p-3 text-slate-700">{methodLabel(row.paymentMethod)}</td>

                    {/* Tiền chưa thuế */}
                    <td className="p-3 text-right font-mono text-slate-600">
                      {formatCurrency(row.preTaxAmount)}
                    </td>

                    {/* Thuế GTGT */}
                    <td className="p-3 text-right">
                      {row.taxConfirmedAt ? (
                        <div>
                          <p className="font-mono font-bold text-slate-800">
                            {formatCurrency(row.taxAmount)}
                          </p>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700">
                            {row.taxRate ? `${row.taxRate}%` : '0%'}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => openTaxModal(row)}
                          className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 hover:bg-amber-100"
                        >
                          Xác nhận thuế
                        </button>
                      )}
                    </td>

                    {/* Tổng tiền */}
                    <td className="p-3 text-right font-mono text-sm font-extrabold">
                      <span
                        className={
                          row.direction === 'IN'
                            ? 'text-emerald-600'
                            : row.direction === 'OUT'
                              ? 'text-rose-600'
                              : 'text-slate-700'
                        }
                      >
                        {row.direction === 'OUT' ? '−' : row.direction === 'IN' ? '+' : ''}
                        {formatCurrency(row.totalAmount)}
                      </span>
                    </td>

                    {/* Trạng thái chứng từ */}
                    <td className="p-3 text-center">
                      <span
                        className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${docBadge.className}`}
                      >
                        {docBadge.label}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPrintEntry(row)}
                          title="In phiếu khổ A5"
                          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-[#5546e8]"
                        >
                          <Printer className="size-3.5" />
                        </button>

                        {row.direction === 'IN' && row.category !== 'REFUND' && (
                          <button
                            type="button"
                            onClick={() => openRefundModal(row)}
                            title="Yêu cầu hoàn tiền (dòng đảo)"
                            className="rounded-lg border border-amber-200 bg-white p-1.5 text-amber-600 shadow-sm transition hover:bg-amber-50"
                          >
                            <RotateCcw className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Không có khoản giao dịch nào phù hợp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL LẬP PHIẾU CHI */}
      <Modal
        title="Lập phiếu chi tiền mới (PC)"
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
      >
        <form onSubmit={handleCreateExpense} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Khoản mục chi:
              </label>
              <select name="category" required className={selectClass}>
                <option value="MATERIAL_PAYMENT">Chi vật tư y tế (trả NCC)</option>
                <option value="LABO_PAYMENT">Chi labo phục hình</option>
                <option value="ADMIN_EXPENSE">Chi hành chính (điện, nước, mặt bằng)</option>
                <option value="SALARY">Chi lương nhân viên</option>
                <option value="CARD_FEE">Phí thanh toán thẻ POS</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Phương thức chi:
              </label>
              <select name="method" required className={selectClass}>
                <option value="TRANSFER">Chuyển khoản ngân hàng</option>
                <option value="CASH">Tiền mặt tại quỹ</option>
                <option value="CARD">Thẻ thanh toán</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Số tiền chi (VND):
              </label>
              <input
                name="amount"
                type="number"
                min="1000"
                step="1000"
                required
                placeholder="VD: 1500000"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Ngày thực chi:
              </label>
              <input
                name="effectiveDate"
                type="date"
                required
                defaultValue={todayDate}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Mã giao dịch ngân hàng (nếu CK/Thẻ):
              </label>
              <input
                name="transactionCode"
                type="text"
                placeholder="VD: FT26101999231"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Phòng khám phát sinh:
              </label>
              <select name="roomId" className={selectClass}>
                <option value="">Chi toàn phòng khám</option>
                {clinicRooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Lý do chi chi tiết:
            </label>
            <textarea
              name="reason"
              required
              rows={2}
              placeholder="Ghi rõ nội dung và mục đích chi..."
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#5546e8] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#5546e8]/20 hover:bg-[#4335d6]"
            >
              Lưu &amp; Cấp số phiếu chi
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL XÁC NHẬN THUẾ GTGT */}
      <Modal
        title={`Xác nhận thuế GTGT cho ${selectedEntry?.sourceCode}`}
        isOpen={isTaxModalOpen}
        onClose={() => setIsTaxModalOpen(false)}
      >
        <form onSubmit={handleConfirmTax} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Tiền chưa thuế gốc:</span>
              <span className="font-mono font-bold text-slate-900">
                {formatCurrency(selectedEntry?.preTaxAmount ?? 0)}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-slate-500">Tổng tiền thanh toán:</span>
              <span className="font-mono font-bold text-[#5546e8]">
                {formatCurrency(selectedEntry?.totalAmount ?? 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Thuế suất (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={taxRateInput}
                onChange={(e) => {
                  const r = Number(e.target.value)
                  setTaxRateInput(e.target.value)
                  if (selectedEntry) {
                    setTaxAmountInput(Math.round((selectedEntry.preTaxAmount * r) / 100))
                  }
                }}
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
                value={taxAmountInput}
                onChange={(e) => {
                  const amt = Number(e.target.value)
                  setTaxAmountInput(e.target.value)
                  if (selectedEntry && selectedEntry.preTaxAmount > 0) {
                    setTaxRateInput(Number(((amt / selectedEntry.preTaxAmount) * 100).toFixed(2)))
                  }
                }}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Ghi chú xác nhận thuế:
            </label>
            <textarea
              value={taxReason}
              onChange={(e) => setTaxReason(e.target.value)}
              placeholder="VD: Dịch vụ y tế không chịu thuế theo quy định..."
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsTaxModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#5546e8] px-5 py-2 text-xs font-bold text-white hover:bg-[#4335d6]"
            >
              Xác nhận &amp; Lưu vết Audit
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL HOÀN TIỀN */}
      <Modal
        title={`Yêu cầu hoàn tiền (Dòng đảo) - ${selectedEntry?.sourceCode}`}
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
      >
        <form onSubmit={handleCreateRefund} className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800">
            <p className="font-bold">Quy định hoàn tiền:</p>
            <p className="mt-1">
              Hoàn tiền được ghi nhận dưới dạng dòng đảo ngược (không sửa dòng cũ), bắt buộc có lý do
              và phải được Quản lý / Admin duyệt trước khi xuất quỹ.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Số tiền yêu cầu hoàn (VND):
            </label>
            <input
              type="number"
              min="1"
              max={selectedEntry?.totalAmount ?? 0}
              required
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Lý do hoàn tiền (Bắt buộc):
            </label>
            <textarea
              required
              rows={3}
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Ghi rõ lý do bệnh nhân hủy dịch vụ / ngừng khám..."
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRefundModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-600 px-5 py-2 text-xs font-bold text-white hover:bg-amber-700"
            >
              Gửi yêu cầu hoàn tiền
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL PRINT PREVIEW A5 */}
      {printEntry && (
        <AccountingPrintView
          entry={printEntry}
          onClose={() => setPrintEntry(null)}
        />
      )}
    </div>
  )
}
