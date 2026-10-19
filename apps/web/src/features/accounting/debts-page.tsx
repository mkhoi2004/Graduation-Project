import { useEffect, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  Building2,
  Search,
  User,
} from 'lucide-react'
import { fetchDebts, payDebt } from './accounting-api'
import {
  debtTypeLabel,
  formatCurrency,
  formatDate,
} from './accounting-format'
import type { Debt } from './accounting-types'
import { Card, inputClass, Message, Modal, PageHeading, selectClass } from './accounting-ui'

export function AccountingDebtsPage() {
  const [rows, setRows] = useState<Debt[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Filters
  const [debtTypeFilter, setDebtTypeFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [ageBucketFilter, setAgeBucketFilter] = useState<string>('')
  const [searchTerm, setSearchTerm] = useState('')

  // Payment modal state
  const [selectedDebt, setSelectedDebt] = useState<Debt | null>(null)
  const [paymentAmount, setPaymentAmount] = useState<number | string>('')
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'TRANSFER' | 'CARD'>('TRANSFER')
  const [transactionCode, setTransactionCode] = useState('')
  const [defaultDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isPayModalOpen, setIsPayModalOpen] = useState(false)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchDebts({ type: debtTypeFilter || undefined })
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách công nợ.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    fetchDebts({ type: debtTypeFilter || undefined })
      .then((data) => {
        if (!active) return
        setRows(data)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (!active) return
        setError(e.message || 'Không thể tải danh sách công nợ.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [debtTypeFilter])

  // Open Payment modal
  const openPayModal = (debt: Debt) => {
    setSelectedDebt(debt)
    setPaymentAmount(debt.remainingAmount)
    setPaymentMethod('TRANSFER')
    setTransactionCode('')
    setPaymentDate(defaultDate)
    setIsPayModalOpen(true)
  }

  // Handle Payment Submit
  async function handlePaymentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!selectedDebt) return
    setError('')
    setMessage('')

    const amt = Number(paymentAmount)
    if (amt <= 0 || amt > selectedDebt.remainingAmount) {
      setError(`Số tiền thanh toán phải từ 1 đến ${formatCurrency(selectedDebt.remainingAmount)}.`)
      return
    }

    try {
      await payDebt(selectedDebt.id, {
        amount: amt,
        method: paymentMethod,
        transactionCode: transactionCode || undefined,
        effectiveDate: paymentDate,
      })
      setMessage(
        `Đã ghi nhận thanh toán ${formatCurrency(amt)} cho khoản nợ ${selectedDebt.sourceCode}.`,
      )
      setIsPayModalOpen(false)
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xử lý thanh toán công nợ.')
    }
  }

  // Filtered rows
  const filteredRows = rows.filter((r) => {
    if (statusFilter && r.status !== statusFilter) return false
    if (ageBucketFilter && r.ageBucket !== ageBucketFilter) return false
    if (searchTerm) {
      const s = searchTerm.toLowerCase()
      const matchCode = r.sourceCode.toLowerCase().includes(s)
      if (!matchCode) return false
    }
    return true
  })

  // Metrics
  const totalReceivable = rows
    .filter((r) => r.debtType === 'PATIENT_RECEIVABLE')
    .reduce((sum, r) => sum + r.remainingAmount, 0)
  const totalPayable = rows
    .filter((r) => r.debtType === 'SUPPLIER_PAYABLE')
    .reduce((sum, r) => sum + r.remainingAmount, 0)
  const totalOverdue = rows
    .filter((r) => r.ageBucket !== '0-30')
    .reduce((sum, r) => sum + r.remainingAmount, 0)

  // Aging counts
  const agingTotals = {
    '0-30': rows.filter((r) => r.ageBucket === '0-30').reduce((s, r) => s + r.remainingAmount, 0),
    '31-60': rows.filter((r) => r.ageBucket === '31-60').reduce((s, r) => s + r.remainingAmount, 0),
    '61-90': rows.filter((r) => r.ageBucket === '61-90').reduce((s, r) => s + r.remainingAmount, 0),
    '>90': rows.filter((r) => r.ageBucket === '>90').reduce((s, r) => s + r.remainingAmount, 0),
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Quản trị công nợ &amp; Tuổi nợ"
        description="Theo dõi chi tiết khoản phải thu từ bệnh nhân và khoản phải trả cho nhà cung cấp/labo theo từng đợt đối chiếu."
      />

      {message && <Message value={message} />}
      {error && <Message value={error} error />}

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>TỔNG PHẢI THU BỆNH NHÂN</span>
            <User className="size-4 text-indigo-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-600">
            {formatCurrency(totalReceivable)}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            Từ ca khám hoàn thành hoặc hợp đồng trả góp
          </p>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>TỔNG PHẢI TRẢ NCC &amp; LABO</span>
            <Building2 className="size-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-amber-600">{formatCurrency(totalPayable)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Lấy từ các phiếu nhập kho hoặc gia công phục hình
          </p>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
            <span>CÔNG NỢ QUÁ HẠN (&gt; 30 NGÀY)</span>
            <AlertCircle className="size-4 text-rose-600" />
          </div>
          <p className="mt-2 text-2xl font-black text-rose-600">{formatCurrency(totalOverdue)}</p>
          <p className="mt-1 text-[11px] text-slate-400">Cần kế toán đôn đốc hoặc gia hạn kỳ</p>
        </Card>
      </div>

      {/* AGING BUCKETS FILTER CARDS */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { key: '0-30', label: '0 – 30 NGÀY', sub: 'Trong hạn', color: 'emerald' },
          { key: '31-60', label: '31 – 60 NGÀY', sub: 'Chậm thanh toán', color: 'amber' },
          { key: '61-90', label: '61 – 90 NGÀY', sub: 'Cảnh báo thu hồi', color: 'orange' },
          { key: '>90', label: '> 90 NGÀY', sub: 'Quá hạn nghiêm trọng', color: 'rose' },
        ].map((item) => {
          const isSelected = ageBucketFilter === item.key
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setAgeBucketFilter(isSelected ? '' : item.key)}
              className={`rounded-xl border p-3.5 text-center transition ${
                isSelected
                  ? 'border-[#5546e8] bg-indigo-50/50 shadow-sm ring-2 ring-[#5546e8]/20'
                  : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <p className="text-xs font-bold text-slate-800">{item.label}</p>
              <p className="text-[11px] text-slate-400">{item.sub}</p>
              <p className="mt-1 font-mono text-base font-black text-slate-900">
                {formatCurrency(agingTotals[item.key as keyof typeof agingTotals])}
              </p>
            </button>
          )
        })}
      </div>

      {/* FILTER BAR */}
      <Card>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 size-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm mã công nợ / chứng từ..."
              className={`${inputClass} pl-9`}
            />
          </div>

          <div>
            <select
              value={debtTypeFilter}
              onChange={(e) => setDebtTypeFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">Tất cả loại công nợ</option>
              <option value="PATIENT_RECEIVABLE">Phải thu bệnh nhân</option>
              <option value="SUPPLIER_PAYABLE">Phải trả nhà cung cấp / Labo</option>
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={selectClass}
            >
              <option value="">Tất cả trạng thái nợ</option>
              <option value="UNPAID">Chưa thanh toán</option>
              <option value="PARTIALLY_PAID">Thanh toán một phần</option>
              <option value="PAID">Đã tất toán</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500">
              Có <strong>{filteredRows.length}</strong> khoản nợ
            </span>
            {(debtTypeFilter || statusFilter || ageBucketFilter || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setDebtTypeFilter('')
                  setStatusFilter('')
                  setAgeBucketFilter('')
                  setSearchTerm('')
                }}
                className="text-xs font-bold text-[#5546e8] hover:underline"
              >
                Đặt lại bộ lọc
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* TABLE */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
              <tr>
                <th className="p-3">Mã &amp; Loại công nợ</th>
                <th className="p-3">Đối tượng</th>
                <th className="p-3">Ngày phát sinh</th>
                <th className="p-3">Hạn thanh toán</th>
                <th className="p-3 text-center">Tuổi nợ</th>
                <th className="p-3 text-right">Nợ gốc</th>
                <th className="p-3 text-right">Đã trả</th>
                <th className="p-3 text-right">Còn lại</th>
                <th className="p-3 text-center">Trạng thái</th>
                <th className="p-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.map((row) => {
                const isReceivable = row.debtType === 'PATIENT_RECEIVABLE'
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    {/* Mã & Loại */}
                    <td className="p-3">
                      <p className="font-mono font-bold text-slate-900">{row.sourceCode}</p>
                      <span
                        className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-[9px] font-bold ${
                          isReceivable
                            ? 'bg-indigo-50 text-indigo-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {debtTypeLabel(row.debtType)}
                      </span>
                    </td>

                    {/* Đối tượng */}
                    <td className="p-3">
                      {row.patientId && (
                        <p className="font-medium text-slate-900">Bệnh nhân #{row.patientId}</p>
                      )}
                      {row.supplierId && (
                        <p className="font-medium text-slate-900">Nhà cung cấp #{row.supplierId}</p>
                      )}
                      <p className="text-[10px] text-slate-400">Nguồn: {row.sourceType}</p>
                    </td>

                    {/* Ngày phát sinh */}
                    <td className="p-3 text-slate-600">{formatDate(row.effectiveDate)}</td>

                    {/* Hạn thanh toán */}
                    <td className="p-3 text-slate-600">{formatDate(row.dueDate)}</td>

                    {/* Tuổi nợ */}
                    <td className="p-3 text-center">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                          row.ageBucket === '0-30'
                            ? 'bg-emerald-50 text-emerald-700'
                            : row.ageBucket === '31-60'
                              ? 'bg-amber-50 text-amber-700'
                              : row.ageBucket === '61-90'
                                ? 'bg-orange-50 text-orange-700'
                                : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {row.ageBucket} ngày
                      </span>
                    </td>

                    {/* Nợ gốc */}
                    <td className="p-3 text-right font-mono text-slate-700">
                      {formatCurrency(row.principalAmount)}
                    </td>

                    {/* Đã trả */}
                    <td className="p-3 text-right font-mono text-emerald-600">
                      {formatCurrency(row.paidAmount)}
                    </td>

                    {/* Còn lại */}
                    <td className="p-3 text-right font-mono text-sm font-extrabold text-slate-900">
                      {formatCurrency(row.remainingAmount)}
                    </td>

                    {/* Trạng thái */}
                    <td className="p-3 text-center">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                          row.remainingAmount === 0
                            ? 'bg-emerald-100 text-emerald-800'
                            : row.paidAmount > 0
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {row.remainingAmount === 0
                          ? 'Đã tất toán'
                          : row.paidAmount > 0
                            ? 'Một phần'
                            : 'Chưa trả'}
                      </span>
                    </td>

                    {/* Thao tác */}
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        disabled={row.remainingAmount === 0}
                        onClick={() => openPayModal(row)}
                        className="rounded-lg bg-[#5546e8] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#4335d6] disabled:bg-slate-200 disabled:text-slate-400"
                      >
                        {isReceivable ? 'Thu tiền' : 'Thanh toán'}
                      </button>
                    </td>
                  </tr>
                )
              })}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-slate-400">
                    Không có khoản công nợ nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* MODAL THANH TOÁN CÔNG NỢ */}
      <Modal
        title={`Xử lý thanh toán công nợ - ${selectedDebt?.sourceCode}`}
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Khoản mục:</span>
              <span className="font-bold text-slate-800">
                {debtTypeLabel(selectedDebt?.debtType ?? '')}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-200/60">
              <span className="text-slate-500">Tổng nợ gốc:</span>
              <span className="font-mono font-medium text-slate-800">
                {formatCurrency(selectedDebt?.principalAmount ?? 0)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-200/60">
              <span className="text-slate-500">Đã thanh toán trước đó:</span>
              <span className="font-mono text-emerald-600 font-medium">
                {formatCurrency(selectedDebt?.paidAmount ?? 0)}
              </span>
            </div>
            <div className="flex justify-between py-1 border-t border-slate-200 font-bold text-slate-900">
              <span>Số nợ còn lại:</span>
              <span className="font-mono text-base text-[#5546e8]">
                {formatCurrency(selectedDebt?.remainingAmount ?? 0)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Số tiền thanh toán (VND):
              </label>
              <input
                type="number"
                min="1"
                max={selectedDebt?.remainingAmount ?? 0}
                required
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Hình thức thanh toán:
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as any)}
                className={selectClass}
              >
                <option value="TRANSFER">Chuyển khoản ngân hàng</option>
                <option value="CASH">Tiền mặt tại quỹ</option>
                <option value="CARD">Thẻ POS</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Mã giao dịch ngân hàng / POS:
              </label>
              <input
                type="text"
                value={transactionCode}
                onChange={(e) => setTransactionCode(e.target.value)}
                placeholder="VD: FT26101988210"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Ngày thực hiện:
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsPayModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#5546e8] px-5 py-2 text-xs font-bold text-white shadow-md shadow-[#5546e8]/20 hover:bg-[#4335d6]"
            >
              Xác nhận thanh toán
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
