import { useEffect, useState } from 'react'
import {
  Building2,
  CheckCircle2,
  Clock,
  Eye,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react'
import {
  approveWarehouseReceipt,
  fetchWarehouseReceipts,
  rejectWarehouseReceipt,
} from './accounting-api'
import { formatCurrency, formatDateTime } from './accounting-format'
import type { WarehouseReceiptDocument } from './accounting-types'
import { Card, Message, Modal, PageHeading } from './accounting-ui'

export function AccountingWarehouseReceiptsPage() {
  const [documents, setDocuments] = useState<WarehouseReceiptDocument[]>([])
  const [counts, setCounts] = useState({ pending: 0, posted: 0, rejected: 0, total: 0 })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  // Filters
  const [statusFilter, setStatusFilter] = useState<'PENDING_APPROVAL' | 'POSTED' | 'REJECTED' | 'ALL'>('PENDING_APPROVAL')
  const [search, setSearch] = useState('')

  // Modals
  const [approveModalDoc, setApproveModalDoc] = useState<WarehouseReceiptDocument | null>(null)
  const [rejectModalDoc, setRejectModalDoc] = useState<WarehouseReceiptDocument | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [detailModalDoc, setDetailModalDoc] = useState<WarehouseReceiptDocument | null>(null)

  const loadData = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetchWarehouseReceipts({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search: search.trim() || undefined,
      })
      setDocuments(res.documents)
      setCounts(res.counts)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể tải danh sách phiếu nhập kho.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    fetchWarehouseReceipts({
      status: statusFilter === 'ALL' ? undefined : statusFilter,
      search: search.trim() || undefined,
    })
      .then((res) => {
        if (!active) return
        setDocuments(res.documents)
        setCounts(res.counts)
        setLoading(false)
      })
      .catch((e) => {
        if (!active) return
        setError(e.message || 'Không thể tải danh sách phiếu nhập kho.')
        setLoading(false)
      })
    return () => {
      active = false
    }
  }, [statusFilter, search])

  // Approve action
  const handleApprove = async () => {
    if (!approveModalDoc) return
    try {
      setBusy(true)
      setMessage('')
      setError('')
      const updated = await approveWarehouseReceipt(approveModalDoc.id)
      setApproveModalDoc(null)
      setMessage(`Đã phê duyệt thành công phiếu nhập kho ${updated.code}! Các món hàng đã chính thức được nhập kho và ghi nhận công nợ.`)
      await loadData()
    } catch (e: any) {
      setError(e.message || 'Không thể duyệt phiếu nhập kho.')
    } finally {
      setBusy(false)
    }
  }

  // Reject action
  const handleReject = async () => {
    if (!rejectModalDoc) return
    if (!rejectReason.trim()) {
      setError('Bắt buộc phải nhập lý do từ chối phiếu nhập kho.')
      return
    }
    try {
      setBusy(true)
      setMessage('')
      setError('')
      const updated = await rejectWarehouseReceipt(rejectModalDoc.id, rejectReason.trim())
      setRejectModalDoc(null)
      setRejectReason('')
      setMessage(`Đã từ chối phiếu nhập kho ${updated.code}. Số lượng hàng không được nhập kho.`)
      await loadData()
    } catch (e: any) {
      setError(e.message || 'Không thể từ chối phiếu nhập kho.')
    } finally {
      setBusy(false)
    }
  }

  // Quick print handler
  const handlePrint = (doc: WarehouseReceiptDocument) => {
    window.open(`/warehouse/print/${doc.id}`, '_blank')
  }

  // Compute pending total value
  const pendingTotalValue = documents
    .filter((d) => d.status === 'PENDING_APPROVAL')
    .reduce((sum, d) => sum + (d.totalAmount || 0), 0)

  return (
    <div className="space-y-6">
      <PageHeading
        title="Duyệt phiếu nhập kho"
        description="Kiểm tra danh mục hàng hóa, số lượng, đơn giá và phê duyệt các phiếu nhập kho từ bộ phận Kho trước khi chính thức ghi nhận vào kho và sổ kế toán."
        action={
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        }
      />

      {message && <Message value={message} />}
      {error && <Message value={error} error />}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-amber-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Chờ duyệt</p>
            <span className="grid size-9 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Clock className="size-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{counts.pending}</p>
          <p className="mt-1 text-xs text-amber-700 font-medium">Phiếu cần Kế toán kiểm tra & duyệt</p>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Đã duyệt (Đã nhập)</p>
            <span className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="size-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{counts.posted}</p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">Đã ghi sổ kho & công nợ NCC</p>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Bị từ chối</p>
            <span className="grid size-9 place-items-center rounded-xl bg-rose-50 text-rose-600">
              <XCircle className="size-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{counts.rejected}</p>
          <p className="mt-1 text-xs text-rose-700 font-medium">Không hợp lệ hoặc sai giá</p>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tiền hàng chờ duyệt</p>
            <span className="grid size-9 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <PackageCheck className="size-5" />
            </span>
          </div>
          <p className="mt-2 text-2xl font-black text-indigo-700">{formatCurrency(pendingTotalValue)}</p>
          <p className="mt-1 text-xs text-slate-500">Tổng giá trị thanh toán chờ duyệt</p>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Tabs */}
          <div className="flex flex-wrap gap-1.5 rounded-xl bg-slate-100 p-1">
            {[
              { key: 'PENDING_APPROVAL', label: 'Chờ duyệt', count: counts.pending },
              { key: 'POSTED', label: 'Đã duyệt', count: counts.posted },
              { key: 'REJECTED', label: 'Bị từ chối', count: counts.rejected },
              { key: 'ALL', label: 'Tất cả', count: counts.total },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key as any)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  statusFilter === key
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <span>{label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] ${
                    statusFilter === key ? 'bg-indigo-100 text-[#5546e8]' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-2.5 size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm mã MVT, nhà cung cấp, vật tư..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs font-medium outline-none focus:border-[#5546e8] focus:bg-white"
            />
          </div>
        </div>
      </Card>

      {/* Document List */}
      {loading ? (
        <Card className="py-16 text-center text-slate-400">
          <RefreshCw className="mx-auto size-8 animate-spin text-slate-300" />
          <p className="mt-3 text-sm font-medium">Đang tải danh sách phiếu nhập kho...</p>
        </Card>
      ) : documents.length === 0 ? (
        <Card className="py-16 text-center text-slate-400">
          <PackageCheck className="mx-auto size-12 text-slate-300" />
          <p className="mt-3 text-base font-bold text-slate-700">Không có phiếu nhập kho nào</p>
          <p className="mt-1 text-xs text-slate-400">
            {statusFilter === 'PENDING_APPROVAL'
              ? 'Hiện tại không có phiếu nhập nào đang chờ Kế toán duyệt.'
              : 'Không tìm thấy phiếu nhập kho phù hợp với điều kiện lọc.'}
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => {
            const isPending = doc.status === 'PENDING_APPROVAL'
            const isPosted = doc.status === 'POSTED'
            const isRejected = doc.status === 'REJECTED'

            return (
              <Card
                key={doc.id}
                className={`overflow-hidden transition hover:shadow-md ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-200'
                    : isPosted
                    ? 'border-emerald-200'
                    : 'border-slate-200'
                }`}
              >
                {/* Document Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-base font-black text-slate-900">{doc.code}</span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isPending
                          ? 'bg-amber-100 text-amber-800'
                          : isPosted
                          ? 'bg-emerald-100 text-emerald-800'
                          : isRejected
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {isPending && <Clock className="size-3" />}
                      {isPosted && <CheckCircle2 className="size-3" />}
                      {isRejected && <XCircle className="size-3" />}
                      {isPending
                        ? 'Chờ Kế toán duyệt'
                        : isPosted
                        ? 'Đã duyệt & Đã nhập kho'
                        : isRejected
                        ? 'Kế toán từ chối'
                        : doc.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Lập lúc: <b>{formatDateTime(doc.createdAt)}</b></span>
                    {doc.postedAt && (
                      <span className="text-emerald-700">· Duyệt lúc: <b>{formatDateTime(doc.postedAt)}</b></span>
                    )}
                  </div>
                </div>

                {/* Supplier & Header details */}
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-xs">
                  <div>
                    <span className="text-slate-400">Nhà cung cấp:</span>
                    <p className="font-bold text-slate-900 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="size-3.5 text-slate-400" />
                      {doc.supplier?.name || 'Chưa chọn'}
                    </p>
                    {doc.supplier?.taxCode && (
                      <p className="text-[11px] text-slate-500">MST: {doc.supplier.taxCode}</p>
                    )}
                  </div>

                  <div>
                    <span className="text-slate-400">Số lượng danh mục:</span>
                    <p className="font-bold text-slate-900 mt-0.5">
                      {doc.lines?.length || 0} mặt hàng
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Tổng số lượng: {doc.lines?.reduce((s, l) => s + (l.inputQuantity || 0), 0)}
                    </p>
                  </div>

                  <div>
                    <span className="text-slate-400">Ghi chú / Lý do nhập:</span>
                    <p className="font-medium text-slate-800 mt-0.5 italic">
                      {doc.reason || 'Không có ghi chú'}
                    </p>
                  </div>

                  <div className="text-right sm:text-left lg:text-right">
                    <span className="text-slate-400">Tổng tiền thanh toán:</span>
                    <p className="text-lg font-black text-[#5546e8] mt-0.5">
                      {formatCurrency(doc.totalAmount)}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      (Tiền hàng: {formatCurrency(doc.goodsAmount)} + VAT: {formatCurrency(doc.vatAmount)})
                    </p>
                  </div>
                </div>

                {/* Line Items Table Preview */}
                <div className="mt-4 overflow-x-auto rounded-xl border border-slate-100 bg-slate-50/50">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500">
                        <th className="p-2 font-bold">Mã & Tên vật tư</th>
                        <th className="p-2 font-bold">Phân nhóm</th>
                        <th className="p-2 text-right font-bold">Số lượng</th>
                        <th className="p-2 text-right font-bold">Đơn vị</th>
                        <th className="p-2 text-right font-bold">Đơn giá nhập</th>
                        <th className="p-2 text-center font-bold">VAT%</th>
                        <th className="p-2 text-right font-bold">Thành tiền</th>
                        <th className="p-2 font-bold">Số lô & HSD</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {doc.lines?.map((line) => (
                        <tr key={line.id} className="hover:bg-slate-50/70">
                          <td className="p-2">
                            <span className="font-bold text-slate-900">{line.supply?.name}</span>
                            <span className="ml-1.5 font-mono text-[11px] text-slate-400">({line.supply?.code})</span>
                          </td>
                          <td className="p-2">
                            <span
                              className={`inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold ${
                                line.supply?.group === 'THUONG'
                                  ? 'bg-blue-50 text-blue-700'
                                  : line.supply?.group === 'VO_CAM'
                                  ? 'bg-purple-50 text-purple-700'
                                  : 'bg-amber-50 text-amber-700'
                              }`}
                            >
                              {line.supply?.group === 'THUONG'
                                ? 'VTTH thường'
                                : line.supply?.group === 'VO_CAM'
                                ? 'VTTH vô cảm'
                                : 'Văn phòng phẩm'}
                            </span>
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-slate-900">
                            {line.inputQuantity}
                          </td>
                          <td className="p-2 text-right text-slate-600">
                            {line.inputUnit}
                          </td>
                          <td className="p-2 text-right font-mono text-slate-700">
                            {formatCurrency(line.inputUnitPrice)}
                          </td>
                          <td className="p-2 text-center font-mono text-slate-600">
                            {line.vatRate}%
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-[#5546e8]">
                            {formatCurrency(line.totalAmount)}
                          </td>
                          <td className="p-2 text-[11px] text-slate-600">
                            {line.batchNo ? <span>Lô: <b>{line.batchNo}</b></span> : <span className="text-slate-400">Không lô</span>}
                            {line.expiryDate && (
                              <span className="ml-2 text-slate-500">
                                HSD: {line.expiryDate.slice(0, 10)}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Amount in words */}
                {doc.totalAmountInWords && (
                  <p className="mt-2 text-[11px] italic text-slate-500">
                    Bằng chữ: <b>{doc.totalAmountInWords}</b>
                  </p>
                )}

                {/* Bottom Actions Bar */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setDetailModalDoc(doc)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="size-3.5" /> Xem chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrint(doc)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <Printer className="size-3.5" /> In phiếu MVT
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {isPending && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setRejectModalDoc(doc)
                            setRejectReason('')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-700 shadow-sm hover:bg-rose-100"
                        >
                          <XCircle className="size-4" /> Từ chối nhập kho
                        </button>
                        <button
                          type="button"
                          onClick={() => setApproveModalDoc(doc)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700"
                        >
                          <CheckCircle2 className="size-4" /> Phê duyệt & Nhập kho
                        </button>
                      </>
                    )}

                    {isPosted && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                        <CheckCircle2 className="size-4" /> Đã hoàn tất nhập kho
                      </span>
                    )}

                    {isRejected && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                        <XCircle className="size-4" /> Phiếu đã bị từ chối
                      </span>
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* APPROVE CONFIRM MODAL */}
      {approveModalDoc && (
        <Modal
          isOpen={true}
          title={`Phê duyệt phiếu nhập kho ${approveModalDoc.code}`}
          onClose={() => !busy && setApproveModalDoc(null)}
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 text-xs text-emerald-900 space-y-1.5">
              <p className="font-bold text-sm text-emerald-800">
                Xác nhận duyệt nhập kho:
              </p>
              <p>
                Sau khi Kế toán phê duyệt, hệ thống sẽ:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>Cộng số lượng của <b>{approveModalDoc.lines?.length || 0} mặt hàng</b> vào tồn kho khả dụng.</li>
                <li>Tạo các lô hàng (`InventoryBatch`) tương ứng kèm hạn sử dụng.</li>
                <li>Tự động ghi nhận công nợ phải trả Nhà cung cấp <b>{approveModalDoc.supplier?.name}</b> với số tiền <b>{formatCurrency(approveModalDoc.totalAmount)}</b>.</li>
                <li>Chuyển trạng thái phiếu sang <b>POSTED (Thành công)</b>.</li>
              </ul>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Mã chứng từ:</span>
                <b className="font-mono text-slate-800">{approveModalDoc.code}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nhà cung cấp:</span>
                <b className="text-slate-800">{approveModalDoc.supplier?.name}</b>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tổng thanh toán:</span>
                <b className="text-emerald-700 text-sm font-black">{formatCurrency(approveModalDoc.totalAmount)}</b>
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setApproveModalDoc(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleApprove}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/25 hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <CheckCircle2 className="size-3.5" />}
                {busy ? 'Đang duyệt...' : 'Xác nhận duyệt nhập kho'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* REJECT MODAL */}
      {rejectModalDoc && (
        <Modal
          isOpen={true}
          title={`Từ chối phiếu nhập kho ${rejectModalDoc.code}`}
          onClose={() => !busy && setRejectModalDoc(null)}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleReject()
            }}
            className="space-y-4"
          >
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-4 text-xs text-rose-900 space-y-1">
              <p className="font-bold text-sm text-rose-800">
                Lưu ý khi từ chối phiếu nhập kho:
              </p>
              <p>
                Phiếu nhập sẽ bị chuyển sang trạng thái <b>Bị từ chối (REJECTED)</b>. Hàng hóa sẽ <b>không được nhập vào kho</b> và không phát sinh công nợ phải trả.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Lý do từ chối <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ví dụ: Sai đơn giá so với hợp đồng, số lượng thừa so với đơn đặt hàng..."
                className="mt-1 w-full rounded-xl border border-slate-200 p-3 text-xs outline-none focus:border-rose-500 focus:ring-2 focus:ring-rose-500/10"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setRejectModalDoc(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={busy || !rejectReason.trim()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white shadow-lg shadow-rose-600/25 hover:bg-rose-700 disabled:opacity-50"
              >
                {busy ? <RefreshCw className="size-3.5 animate-spin" /> : <XCircle className="size-3.5" />}
                {busy ? 'Đang xử lý...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DETAIL MODAL */}
      {detailModalDoc && (
        <Modal
          isOpen={true}
          title={`Chi tiết chứng từ ${detailModalDoc.code}`}
          onClose={() => setDetailModalDoc(null)}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400">Nhà cung cấp:</span>
                <p className="font-bold text-slate-900">{detailModalDoc.supplier?.name}</p>
                <p className="text-[11px] text-slate-500">MST: {detailModalDoc.supplier?.taxCode || 'N/A'}</p>
                <p className="text-[11px] text-slate-500">SĐT: {detailModalDoc.supplier?.phone || 'N/A'}</p>
              </div>
              <div className="text-right">
                <span className="text-slate-400">Trạng thái:</span>
                <p className="font-bold text-slate-900">{detailModalDoc.status}</p>
                <p className="text-[11px] text-slate-500">Ngày tạo: {formatDateTime(detailModalDoc.createdAt)}</p>
                {detailModalDoc.postedAt && (
                  <p className="text-[11px] text-emerald-700">Ngày duyệt: {formatDateTime(detailModalDoc.postedAt)}</p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                Danh sách {detailModalDoc.lines?.length || 0} mặt hàng nhập
              </h4>
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600">
                    <tr>
                      <th className="p-2">Vật tư</th>
                      <th className="p-2 text-right">SL nhập</th>
                      <th className="p-2 text-right">Quy đổi</th>
                      <th className="p-2 text-right">Đơn giá</th>
                      <th className="p-2 text-center">VAT%</th>
                      <th className="p-2 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detailModalDoc.lines?.map((l) => (
                      <tr key={l.id}>
                        <td className="p-2">
                          <p className="font-bold text-slate-900">{l.supply?.name}</p>
                          <p className="text-[10px] text-slate-400">{l.supply?.code} · {l.supply?.group}</p>
                        </td>
                        <td className="p-2 text-right font-mono">{l.inputQuantity} {l.inputUnit}</td>
                        <td className="p-2 text-right font-mono">{l.convertedQuantity} {l.supply?.baseUnit}</td>
                        <td className="p-2 text-right font-mono">{formatCurrency(l.inputUnitPrice)}</td>
                        <td className="p-2 text-center font-mono">{l.vatRate}%</td>
                        <td className="p-2 text-right font-mono font-bold text-[#5546e8]">{formatCurrency(l.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit log list if available */}
            {detailModalDoc.auditLogs && detailModalDoc.auditLogs.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Nhật ký kiểm toán
                </h4>
                <div className="space-y-1.5 text-xs">
                  {detailModalDoc.auditLogs.map((log) => (
                    <div key={log.id} className="flex justify-between rounded-lg bg-slate-50 p-2 text-slate-700">
                      <span className="font-semibold">{log.action}</span>
                      <span className="text-slate-400">{formatDateTime(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDetailModalDoc(null)}
                className="rounded-xl border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
