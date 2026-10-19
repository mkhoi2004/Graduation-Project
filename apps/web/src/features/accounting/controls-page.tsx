import { useEffect, useState, type FormEvent } from 'react'
import {
  CheckCircle2,
  Clock,
  History,
  Lock,
  RotateCcw,
  Scale,
} from 'lucide-react'
import {
  approveRefund,
  confirmReconciliation,
  createReconciliation,
  fetchAuditLogs,
  fetchPeriodLocks,
  fetchReconciliations,
  fetchRefunds,
  lockPeriod,
} from './accounting-api'
import { formatCurrency, formatDate, formatDateTime } from './accounting-format'
import type {
  AccountingAuditLog,
  AccountingPeriodLock,
  CashReconciliation,
  RefundRequest,
} from './accounting-types'
import { Card, inputClass, Message, Modal, PageHeading, selectClass } from './accounting-ui'
import { getSession } from '@/lib/auth-session'
import { clinicRooms } from '../reception/reception-data'

export function AccountingControlsPage() {
  const session = getSession()
  const isAdmin = session?.user?.role === 'ADMIN'

  const [activeTab, setActiveTab] = useState<'RECONCILE' | 'LOCKS' | 'REFUNDS' | 'AUDIT'>('RECONCILE')
  const [reconciliations, setReconciliations] = useState<CashReconciliation[]>([])
  const [periodLocks, setPeriodLocks] = useState<AccountingPeriodLock[]>([])
  const [refunds, setRefunds] = useState<RefundRequest[]>([])
  const [auditLogs, setAuditLogs] = useState<AccountingAuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Reconcile modal
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false)
  const [reconcileDate, setReconcileDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [countedBalance, setCountedBalance] = useState<number | string>('')
  const [reconcileRoomId, setReconcileRoomId] = useState('')
  const [reconcileReason, setReconcileReason] = useState('')

  // Lock modal
  const [isLockModalOpen, setIsLockModalOpen] = useState(false)
  const [lockMonth, setLockMonth] = useState<number>(() => new Date().getMonth() + 1)
  const [lockYear, setLockYear] = useState<number>(() => new Date().getFullYear())
  const [lockReason, setLockReason] = useState('')

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const [recs, locks, refs, logs] = await Promise.all([
        fetchReconciliations(),
        fetchPeriodLocks(),
        fetchRefunds(),
        fetchAuditLogs(),
      ])
      setReconciliations(recs)
      setPeriodLocks(locks)
      setRefunds(refs)
      setAuditLogs(logs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải dữ liệu kiểm soát.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    Promise.all([
      fetchReconciliations(),
      fetchPeriodLocks(),
      fetchRefunds(),
      fetchAuditLogs(),
    ])
      .then(([recs, locks, refs, logs]) => {
        if (!active) return
        setReconciliations(recs)
        setPeriodLocks(locks)
        setRefunds(refs)
        setAuditLogs(logs)
        setLoading(false)
      })
      .catch((e: Error) => {
        if (!active) return
        setError(e.message || 'Không thể tải dữ liệu kiểm soát.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Submit Reconcile
  async function handleCreateReconciliation(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await createReconciliation({
        businessDate: reconcileDate,
        roomId: reconcileRoomId ? Number(reconcileRoomId) : undefined,
        countedBalance: Number(countedBalance),
        reason: reconcileReason || undefined,
      })
      setMessage('Đã lập biên bản kiểm quỹ tiền mặt thành công. Chờ người thứ 2 xác nhận.')
      setIsReconcileModalOpen(false)
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi lập biên bản kiểm quỹ.')
    }
  }

  // Confirm Reconcile
  async function handleConfirmReconcile(id: number) {
    setError('')
    setMessage('')
    try {
      await confirmReconciliation(id)
      setMessage('Đã xác nhận biên bản kiểm quỹ tiền mặt thành công.')
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi xác nhận kiểm quỹ.')
    }
  }

  // Submit Lock Period
  async function handleLockPeriod(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    setMessage('')
    try {
      await lockPeriod({
        month: Number(lockMonth),
        year: Number(lockYear),
        reason: lockReason,
      })
      setMessage(`Đã khóa thành công kỳ kế toán Tháng ${lockMonth}/${lockYear}.`)
      setIsLockModalOpen(false)
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi khóa kỳ kế toán.')
    }
  }

  // Approve Refund
  async function handleApproveRefund(id: number) {
    setError('')
    setMessage('')
    try {
      await approveRefund(id)
      setMessage('Đã duyệt yêu cầu hoàn tiền và sinh bút toán đảo ngược thành công.')
      void loadData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi duyệt hoàn tiền.')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeading
        title="Kiểm soát kế toán &amp; Quản trị rủi ro"
        description="Kiểm quỹ tiền mặt cuối ngày, chốt khóa kỳ kế toán, phê duyệt hoàn tiền độc lập và theo dõi nhật ký kiểm toán bất biến."
      />

      {message && <Message value={message} />}
      {error && <Message value={error} error />}

      {/* TABS */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('RECONCILE')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'RECONCILE'
              ? 'border-[#5546e8] text-[#5546e8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Scale className="size-4" />
          <span>Kiểm quỹ tiền mặt ({reconciliations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('LOCKS')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'LOCKS'
              ? 'border-[#5546e8] text-[#5546e8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Lock className="size-4" />
          <span>Khóa kỳ kế toán ({periodLocks.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('REFUNDS')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'REFUNDS'
              ? 'border-[#5546e8] text-[#5546e8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <RotateCcw className="size-4" />
          <span>Duyệt hoàn tiền ({refunds.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('AUDIT')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'AUDIT'
              ? 'border-[#5546e8] text-[#5546e8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="size-4" />
          <span>Nhật ký kiểm toán ({auditLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: KIỂM QUỸ TIỀN MẶT */}
      {activeTab === 'RECONCILE' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Biên bản kiểm kê số dư tiền mặt cuối ngày
              </h2>
              <p className="text-xs text-slate-500">
                Số cuối ngày trước là số đầu ngày sau · Tách người kiểm đếm và người xác nhận
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsReconcileModalOpen(true)}
              className="rounded-xl bg-[#5546e8] px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#4335d6]"
            >
              Lập biên bản kiểm quỹ
            </button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Ngày kiểm</th>
                    <th className="p-3">Phòng khám</th>
                    <th className="p-3 text-right">Số dư đầu ngày</th>
                    <th className="p-3 text-right">Số dư sổ sách</th>
                    <th className="p-3 text-right">Số thực tế kiểm</th>
                    <th className="p-3 text-right">Chênh lệch</th>
                    <th className="p-3">Lý do chênh lệch</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    <th className="p-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reconciliations.map((rec) => {
                    const isBalanced = rec.differenceAmount === 0
                    const isConfirmed = !!rec.confirmedAt
                    return (
                      <tr key={rec.id} className="hover:bg-slate-50/70">
                        <td className="p-3 font-semibold text-slate-900">
                          {formatDate(rec.businessDate)}
                        </td>
                        <td className="p-3 text-slate-600">
                          {clinicRooms.find((r) => String(r.id) === String(rec.roomId))?.name ?? 'Toàn phòng khám'}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-600">
                          {formatCurrency(rec.openingBalance)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {formatCurrency(rec.calculatedBalance)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-[#5546e8]">
                          {formatCurrency(rec.countedBalance)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span
                            className={
                              isBalanced
                                ? 'text-emerald-600'
                                : rec.differenceAmount > 0
                                  ? 'text-blue-600'
                                  : 'text-rose-600'
                            }
                          >
                            {rec.differenceAmount > 0 ? '+' : ''}
                            {formatCurrency(rec.differenceAmount)}
                          </span>
                        </td>
                        <td className="p-3 max-w-[200px] truncate text-slate-600" title={rec.reason}>
                          {rec.reason || (isBalanced ? 'Cân khớp hoàn toàn' : '—')}
                        </td>
                        <td className="p-3 text-center">
                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              <CheckCircle2 className="size-3" />
                              Đã xác nhận
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              <Clock className="size-3" />
                              Chờ người duyệt
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {!isConfirmed && (
                            <button
                              type="button"
                              onClick={() => handleConfirmReconcile(rec.id)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700"
                            >
                              Xác nhận duyệt
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {!loading && reconciliations.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Chưa có biên bản kiểm quỹ tiền mặt nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: KHÓA KỲ KẾ TOÁN */}
      {activeTab === 'LOCKS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Danh mục kỳ kế toán đã khóa sổ</h2>
              <p className="text-xs text-slate-500">
                Sau khi khóa kỳ, không thể thêm/sửa chứng từ ở kỳ cũ; mọi điều chỉnh phải thực hiện ở kỳ mới
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => setIsLockModalOpen(true)}
                className="rounded-xl border border-indigo-200 bg-white px-4 py-2 text-xs font-bold text-indigo-600 shadow-sm hover:bg-indigo-50"
              >
                Khóa kỳ kế toán
              </button>
            )}
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Kỳ kế toán</th>
                    <th className="p-3">Thời gian khóa</th>
                    <th className="p-3">Lý do khóa kỳ</th>
                    <th className="p-3 text-center">Trạng thái kỳ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {periodLocks.map((lock) => (
                    <tr key={lock.id} className="hover:bg-slate-50/70">
                      <td className="p-3 font-bold text-slate-900">
                        Tháng {String(lock.month).padStart(2, '0')}/{lock.year}
                      </td>
                      <td className="p-3 text-slate-600">{formatDateTime(lock.lockedAt)}</td>
                      <td className="p-3 text-slate-700">{lock.reason}</td>
                      <td className="p-3 text-center">
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-bold text-rose-700">
                          <Lock className="size-3" />
                          Đã chốt khóa sổ
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!loading && periodLocks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        Chưa có kỳ kế toán nào được khóa.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: DUYỆT HOÀN TIỀN */}
      {activeTab === 'REFUNDS' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Yêu cầu hoàn tiền &amp; Đảo khoản thu (Nguyên tắc tách quyền)
            </h2>
            <p className="text-xs text-slate-500">
              Chỉ Quản trị viên / Quản lý được duyệt; người duyệt phải khác người tạo yêu cầu
            </p>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Mã yêu cầu &amp; Ngày</th>
                    <th className="p-3">Khoản thu gốc</th>
                    <th className="p-3">Bệnh nhân</th>
                    <th className="p-3 text-right">Số tiền hoàn</th>
                    <th className="p-3">Lý do xin hoàn</th>
                    <th className="p-3 text-center">Trạng thái</th>
                    <th className="p-3 text-center">Phê duyệt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {refunds.map((ref) => {
                    const isPending = ref.status === 'PENDING_APPROVAL'
                    return (
                      <tr key={ref.id} className="hover:bg-slate-50/70">
                        <td className="p-3">
                          <p className="font-mono font-bold text-slate-900">REF-{ref.id}</p>
                          <p className="text-[10px] text-slate-400">{formatDate(ref.createdAt)}</p>
                        </td>
                        <td className="p-3 font-mono text-slate-700">
                          ID #{ref.originalEntryId}
                        </td>
                        <td className="p-3 font-medium text-slate-900">
                          Bệnh nhân #{ref.patientId}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">
                          {formatCurrency(ref.amount)}
                        </td>
                        <td className="p-3 max-w-[240px] truncate text-slate-600" title={ref.reason}>
                          {ref.reason}
                        </td>
                        <td className="p-3 text-center">
                          {isPending ? (
                            <span className="inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                              Chờ Admin duyệt
                            </span>
                          ) : (
                            <span className="inline-block rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              Đã xuất hoàn tiền
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {isPending && isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleApproveRefund(ref.id)}
                              className="rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-bold text-white shadow-sm hover:bg-emerald-700"
                            >
                              Duyệt hoàn tiền
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}

                  {!loading && refunds.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        Không có yêu cầu hoàn tiền nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: NHẬT KÝ KIỂM TOÁN (AUDIT LOG) */}
      {activeTab === 'AUDIT' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Nhật ký kiểm toán kế toán bất biến (Audit Log)
            </h2>
            <p className="text-xs text-slate-500">
              Ghi lại mọi thay đổi thuế, khóa kỳ, duyệt hoàn tiền và đảo nghiệp vụ
            </p>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
                  <tr>
                    <th className="p-3">Thời gian</th>
                    <th className="p-3">Thao tác</th>
                    <th className="p-3">Thực thể</th>
                    <th className="p-3">Người thực hiện</th>
                    <th className="p-3">Lý do / Diễn giải</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/70">
                      <td className="p-3 text-slate-500 font-mono text-[11px]">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="p-3 font-semibold text-slate-900">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px]">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600">
                        {log.entityType} #{log.entityId}
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        User #{log.actorId ?? 'Hệ thống'}
                      </td>
                      <td className="p-3 text-slate-600">{log.reason || '—'}</td>
                    </tr>
                  ))}

                  {!loading && auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400">
                        Chưa có sự kiện kiểm toán nào.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL LẬP BIÊN BẢN KIỂM QUÝ */}
      <Modal
        title="Lập biên bản kiểm quỹ tiền mặt"
        isOpen={isReconcileModalOpen}
        onClose={() => setIsReconcileModalOpen(false)}
      >
        <form onSubmit={handleCreateReconciliation} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Ngày kiểm quỹ:
              </label>
              <input
                type="date"
                required
                value={reconcileDate}
                onChange={(e) => setReconcileDate(e.target.value)}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Phòng khám kiểm đếm:
              </label>
              <select
                value={reconcileRoomId}
                onChange={(e) => setReconcileRoomId(e.target.value)}
                className={selectClass}
              >
                <option value="">Toàn phòng khám (Quầy chính)</option>
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
              Số dư tiền mặt thực tế khi đếm quỹ (VND):
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              required
              placeholder="VD: 19400000"
              value={countedBalance}
              onChange={(e) => setCountedBalance(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Lý do chênh lệch (nếu số thực tế lệch sổ sách):
            </label>
            <textarea
              rows={2}
              value={reconcileReason}
              onChange={(e) => setReconcileReason(e.target.value)}
              placeholder="Ghi rõ lý do nếu số tiền mặt thực tế lệch với số tính toán..."
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsReconcileModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-[#5546e8] px-5 py-2 text-xs font-bold text-white hover:bg-[#4335d6]"
            >
              Lập biên bản
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL KHÓA KỲ KẾ TOÁN */}
      <Modal
        title="Khóa kỳ kế toán (Chỉ Quản trị viên)"
        isOpen={isLockModalOpen}
        onClose={() => setIsLockModalOpen(false)}
      >
        <form onSubmit={handleLockPeriod} className="space-y-4">
          <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 text-xs text-rose-800">
            <p className="font-bold">Cảnh báo khóa kỳ kế toán:</p>
            <p className="mt-0.5">
              Sau khi khóa kỳ, toàn bộ chứng từ thuộc tháng đã khóa sẽ bị đóng băng. Bất kỳ sự điều chỉnh nào cũng chỉ được phép ghi nhận ở kỳ kế toán đang mở.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Tháng khóa:</label>
              <select
                value={lockMonth}
                onChange={(e) => setLockMonth(Number(e.target.value))}
                className={selectClass}
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Năm khóa:</label>
              <input
                type="number"
                min="2020"
                max="2099"
                required
                value={lockYear}
                onChange={(e) => setLockYear(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Lý do chốt khóa kỳ (Bắt buộc):
            </label>
            <textarea
              required
              rows={2}
              value={lockReason}
              onChange={(e) => setLockReason(e.target.value)}
              placeholder="VD: Chốt sổ sách tháng theo biên bản họp ban giám đốc..."
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsLockModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700"
            >
              Xác nhận khóa kỳ
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
