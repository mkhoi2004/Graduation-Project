import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  PackageOpen,
  ShieldAlert,
  Trash2,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { disposeBatch, fetchOverview, type Overview } from './warehouse-api'

const formatMoney = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + ' đ'

export function WarehouseOverviewPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState('')
  const [warningTab, setWarningTab] = useState<'LOW_STOCK' | 'EXPIRING' | 'EXPIRED'>('LOW_STOCK')
  const [disposingBatch, setDisposingBatch] = useState<Overview['expired'][number] | null>(null)
  const [disposeReason, setDisposeReason] = useState('Sản phẩm quá hạn sử dụng, xuất hủy chuyển bảng Deleted.')
  const [disposingLoading, setDisposingLoading] = useState(false)
  const [disposalSuccessMsg, setDisposalSuccessMsg] = useState('')

  useEffect(() => {
    fetchOverview()
      .then(setData)
      .catch((e: Error) => setError(e.message))
  }, [])

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
        <p className="font-bold">Lỗi tải dữ liệu kho</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="h-8 w-48 rounded-xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-slate-200" />
          ))}
        </div>
      </div>
    )
  }

  const lowStock = data.lowStock ?? []
  const expiring = data.expiring ?? []
  const expired = data.expired ?? []
  const groups = data.groups ?? []
  const recentDocuments = data.recentDocuments ?? []
  const metrics = data.metrics ?? {
    itemCount: 0,
    inventoryValue: 0,
    lowStockCount: lowStock.length,
    expiringCount: expiring.length,
    expiredCount: expired.length,
  }

  const cards = [
    {
      label: 'Tổng mã vật tư',
      value: String(metrics.itemCount),
      icon: Boxes,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      label: 'Tổng giá trị tồn kho',
      value: formatMoney(metrics.inventoryValue),
      icon: CircleDollarSign,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Cảnh báo sắp hết hàng',
      value: `${metrics.lowStockCount ?? lowStock.length} mặt hàng`,
      icon: PackageOpen,
      color: 'bg-amber-50 text-amber-600',
    },
    {
      label: 'Cảnh báo hạn dùng',
      value: `${metrics.expiringCount ?? expiring.length} sắp hết / ${metrics.expiredCount ?? expired.length} đã hết`,
      icon: CalendarClock,
      color: 'bg-rose-50 text-rose-600',
    },
  ]

  const onGroupClick = (groupKey: string) => {
    navigate(`/warehouse/details?group=${groupKey}`)
  }

  return (
    <section className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-[.2em] text-[#6657e8]">Kho vật tư y tế</p>
        <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-slate-900">Tổng quan kho</h1>
        <p className="mt-1 text-sm text-slate-500">
          Theo dõi tổng giá trị tài sản kho, cơ cấu theo 3 nhóm vật tư và kiểm soát hạn dùng.
        </p>
      </div>

      {disposalSuccessMsg && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
            <span>{disposalSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setDisposalSuccessMsg('')}
            className="text-emerald-600 hover:text-emerald-900"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* 4 Thẻ chỉ số chính */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, color }) => (
          <article
            key={label}
            className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
            <div className={`grid size-11 place-items-center rounded-2xl ${color}`}>
              <Icon className="size-5" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
          </article>
        ))}
      </div>

      {/* Cơ cấu 3 nhóm vật tư (Bấm vào để chuyển sang Tab 2) */}
      <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cơ cấu tồn kho theo 3 nhóm vật tư</h2>
            <p className="text-xs text-slate-500">
              Nhấp vào một nhóm bất kỳ để xem danh sách chi tiết và phân bổ lô tương ứng.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {groups.map((g) => (
            <button
              key={g.group}
              type="button"
              onClick={() => onGroupClick(g.group)}
              className="group relative flex flex-col justify-between rounded-2xl border border-slate-200 p-5 text-left transition hover:border-[#6657e8] hover:bg-[#fafaff] hover:shadow-md"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700 group-hover:bg-[#5546e8] group-hover:text-white">
                    {g.group === 'THUONG' ? 'VTYT thường' : g.group === 'VO_CAM' ? 'Thuốc vô cảm' : 'Văn phòng phẩm'}
                  </span>
                  <ArrowRight className="size-4 text-slate-400 transition group-hover:translate-x-1 group-hover:text-[#5546e8]" />
                </div>
                <h3 className="mt-4 text-base font-bold text-slate-900">{g.groupName}</h3>
                <p className="mt-1 text-xs text-slate-500">{g.itemCount} danh mục vật tư</p>
              </div>

              <div className="mt-6 border-t border-slate-100 pt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Tổng tồn khả dụng:</span>
                  <b className="text-slate-800">{new Intl.NumberFormat('vi-VN').format(g.quantity)}</b>
                </div>
                <div className="mt-1 flex items-center justify-between text-sm">
                  <span className="text-slate-500">Tổng giá trị tồn:</span>
                  <b className="font-bold text-[#5546e8]">{formatMoney(g.inventoryValue)}</b>
                </div>
              </div>
            </button>
          ))}
        </div>
      </article>

      {/* Cảnh báo tồn kho & Chứng từ mới nhất */}
      <div className="grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        {/* Cột Cảnh báo */}
        <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Cảnh báo tồn kho & hạn dùng</h2>
            <div className="flex gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setWarningTab('LOW_STOCK')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  warningTab === 'LOW_STOCK' ? 'bg-white text-amber-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Dưới mức tồn ({lowStock.length})
              </button>
              <button
                type="button"
                onClick={() => setWarningTab('EXPIRING')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  warningTab === 'EXPIRING' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sắp hết hạn ({expiring.length})
              </button>
              <button
                type="button"
                onClick={() => setWarningTab('EXPIRED')}
                className={`rounded-lg px-3 py-1.5 transition ${
                  warningTab === 'EXPIRED' ? 'bg-white text-red-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Đã hết hạn ({expired.length})
              </button>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            {warningTab === 'LOW_STOCK' && (
              <>
                {!lowStock.length ? (
                  <p className="py-10 text-center text-sm text-slate-400">Không có vật tư nào dưới mức tồn tối thiểu.</p>
                ) : (
                  lowStock.map((item) => (
                    <div
                      key={`low-${item.id}`}
                      className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/60 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="size-5 shrink-0 text-amber-600" />
                        <div>
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-xs text-slate-500">Mã: {item.code} · Tối thiểu: {item.minimumStock} {item.baseUnit}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-amber-700">
                          {item.quantity} / {item.minimumStock} {item.baseUnit}
                        </p>
                        <p className="text-xs text-slate-500">{formatMoney(item.value)}</p>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {warningTab === 'EXPIRING' && (
              <>
                {!expiring.length ? (
                  <p className="py-10 text-center text-sm text-slate-400">Không có lô vật tư nào sắp hết hạn trong 90 ngày tới.</p>
                ) : (
                  expiring.map((b) => (
                    <div
                      key={`exp-${b.id}`}
                      className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50/60 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <CalendarClock className="size-5 shrink-0 text-rose-600" />
                        <div>
                          <p className="font-semibold text-slate-900">{b.supply.name}</p>
                          <p className="text-xs text-slate-500">
                            Số lô: <b className="text-slate-700">{b.batchNo || 'Không số lô'}</b> · Còn: {b.daysRemaining} ngày
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-bold text-rose-700">
                          HSD: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('vi-VN') : '—'}
                        </span>
                        <p className="mt-1 text-xs text-slate-600">
                          Tồn lô: <b>{b.quantity}</b> {b.supply.baseUnit}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}

            {warningTab === 'EXPIRED' && (
              <>
                {!expired.length ? (
                  <p className="py-10 text-center text-sm text-slate-400">Không có lô vật tư nào bị quá hạn sử dụng.</p>
                ) : (
                  expired.map((b) => (
                    <div
                      key={`expired-${b.id}`}
                      className="flex items-center justify-between rounded-2xl border border-red-300 bg-red-100/70 p-4"
                    >
                      <div className="flex items-center gap-3">
                        <ShieldAlert className="size-5 shrink-0 text-red-600" />
                        <div>
                          <p className="font-bold text-red-950">{b.supply.name}</p>
                          <p className="text-xs text-red-800">
                            Số lô: <b>{b.batchNo || 'Không số lô'}</b> · Hết hạn từ: {b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('vi-VN') : '—'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="rounded-full bg-red-200 px-2.5 py-1 text-xs font-bold text-red-900">
                          CẦN XUẤT HỦY
                        </span>
                        <p className="mt-1 text-xs font-bold text-red-950">
                          Tồn: {b.quantity} {b.supply.baseUnit}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setDisposingBatch(b)
                            setDisposeReason(`Hủy do hết hạn sử dụng lô ${b.batchNo || 'Không số lô'}, chuyển sang bảng Deleted`)
                          }}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm transition hover:bg-red-700"
                        >
                          <Trash2 className="size-3" />
                          Hủy lô hết hạn
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </>
            )}
          </div>
        </article>

        {/* Cột Chứng từ mới nhất */}
        <article className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-base font-bold text-slate-900">Chứng từ kho gần nhất</h2>
            <button
              type="button"
              onClick={() => navigate('/warehouse/transactions')}
              className="text-xs font-bold text-[#5546e8] hover:underline"
            >
              Xem tất cả
            </button>
          </div>

          <div className="mt-4 divide-y divide-slate-100">
            {!recentDocuments.length ? (
              <p className="py-10 text-center text-sm text-slate-400">Chưa có chứng từ nào được lập.</p>
            ) : (
              recentDocuments.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          doc.type === 'IN' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {doc.type === 'IN' ? 'Nhập kho' : 'Xuất kho'}
                      </span>
                      <b className="text-xs text-slate-900">{doc.code}</b>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">
                      {doc.supplier?.name || doc.recipientDepartment || doc.reason || 'Chứng từ nội bộ'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-900">{formatMoney(doc.totalAmount)}</p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        doc.status === 'POSTED'
                          ? 'bg-emerald-50 text-emerald-700'
                          : doc.status === 'PRINTED'
                          ? 'bg-blue-50 text-blue-700'
                          : doc.status === 'CANCELLED'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {doc.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </article>
      </div>

      {/* Modal Hủy lô hết hạn / hư hỏng */}
      {disposingBatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div className="flex items-center gap-2 text-red-600">
                <Trash2 className="size-5" />
                <h3 className="font-bold">Hủy sản phẩm hư hỏng / hết hạn</h3>
              </div>
              <button
                type="button"
                onClick={() => setDisposingBatch(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-900">
                <p className="font-bold">⚠️ Quy trình xuất hủy & sao lưu CSDL:</p>
                <p className="mt-1">
                  Khi xác nhận hủy, số lượng tồn kho sẽ được trừ khỏi hệ thống và thông tin chi tiết lô hàng
                  sẽ được <b>tự động chuyển sang bảng sao lưu InventoryBatchDeleted</b> theo quy định kiểm toán.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                <p>Vật tư: <b className="text-slate-900">{disposingBatch.supply.name}</b></p>
                <p>Số lô: <b className="font-mono text-slate-900">{disposingBatch.batchNo || 'Không số lô'}</b></p>
                <p>Số lượng hủy: <b className="text-red-600 font-bold">{disposingBatch.quantity} {disposingBatch.supply.baseUnit}</b></p>
                <p>Hạn dùng: <b>{disposingBatch.expiryDate ? new Date(disposingBatch.expiryDate).toLocaleDateString('vi-VN') : '—'}</b></p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700">Lý do hủy (Lưu vào bảng Deleted):</label>
                <textarea
                  value={disposeReason}
                  onChange={(e) => setDisposeReason(e.target.value)}
                  rows={3}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-red-500"
                  placeholder="Nhập lý do tiêu hủy sản phẩm..."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDisposingBatch(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  disabled={disposingLoading || !disposeReason.trim()}
                  onClick={async () => {
                    setDisposingLoading(true)
                    try {
                      const res = await disposeBatch(disposingBatch.id, {
                        reason: disposeReason.trim(),
                      })
                      setDisposalSuccessMsg(res.message)
                      setDisposingBatch(null)
                      const refreshed = await fetchOverview()
                      setData(refreshed)
                    } catch (err: any) {
                      alert(err.message || 'Lỗi khi hủy lô sản phẩm.')
                    } finally {
                      setDisposingLoading(false)
                    }
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                  {disposingLoading ? 'Đang chuyển sang bảng Deleted...' : 'Xác nhận hủy & Chuyển sang bảng Deleted'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
