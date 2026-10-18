import {
  CheckCircle2,
  ChevronDown,
  FileSpreadsheet,
  History,
  Layers,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  disposeBatch,
  fetchClinicContext,
  fetchDeletedBackups,
  fetchDocument,
  fetchItems,
  fetchUsage,
  type ClinicContext,
  type StockDocument,
  type UsageItem,
  type WarehouseItem,
} from './warehouse-api'
import { exportUsageHistoryToExcel, exportWarehouseItemsToExcel } from './warehouse-excel'

const formatMoney = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + ' đ'

export function WarehouseDetailsPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // Sub-tabs: Danh mục & Lô, Lịch sử sử dụng phòng khám, hoặc Đã xuất hủy (Bảng Deleted)
  const [activeSubTab, setActiveSubTab] = useState<'INVENTORY' | 'USAGE' | 'DELETED'>('INVENTORY')
  const [deletedBatches, setDeletedBatches] = useState<any[]>([])
  const [disposingBatch, setDisposingBatch] = useState<{
    id: number
    batchNo?: string
    supplyName: string
    quantity: number
    baseUnit: string
    expiryDate?: string
  } | null>(null)
  const [disposeReason, setDisposeReason] = useState('Sản phẩm hư hỏng hoặc quá hạn sử dụng, tiêu hủy chuyển bảng Deleted.')
  const [disposingLoading, setDisposingLoading] = useState(false)
  const [disposalSuccessMsg, setDisposalSuccessMsg] = useState('')

  // Data states
  const [items, setItems] = useState<WarehouseItem[]>([])
  const [usages, setUsages] = useState<UsageItem[]>([])
  const [clinicContext, setClinicContext] = useState<ClinicContext | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Filters
  const [search, setSearch] = useState('')
  const selectedGroup = searchParams.get('group') ?? ''
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [selectedRoomId, setSelectedRoomId] = useState<string>('')
  const [expiryStatusFilter, setExpiryStatusFilter] = useState<string>('')

  // Expanded item row in inventory table
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null)

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<StockDocument | null>(null)

  // Pagination
  const [page, setPage] = useState(1)
  const pageSize = 12

  const handleGroupChange = (newGroup: string) => {
    setPage(1)
    if (newGroup) {
      setSearchParams({ group: newGroup })
    } else {
      setSearchParams({})
    }
  }

  // Load clinic context
  useEffect(() => {
    fetchClinicContext()
      .then(setClinicContext)
      .catch((e: Error) => console.error('Failed to load clinic context', e))
  }, [])

  useEffect(() => {
    let active = true
    Promise.resolve().then(() => {
      if (active) setLoading(true)
    })
    if (activeSubTab === 'INVENTORY') {
      fetchItems(search, selectedGroup)
        .then((data) => {
          if (active) setItems(data)
        })
        .catch((e: Error) => {
          if (active) setError(e.message)
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    } else if (activeSubTab === 'USAGE') {
      fetchUsage({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        doctorId: selectedDoctorId ? Number(selectedDoctorId) : undefined,
        roomId: selectedRoomId ? Number(selectedRoomId) : undefined,
        supplyCode: search || undefined,
      })
        .then((data) => {
          if (active) setUsages(data)
        })
        .catch((e: Error) => {
          if (active) setError(e.message)
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    } else {
      fetchDeletedBackups()
        .then((data) => {
          if (active) setDeletedBatches(data.batches || [])
        })
        .catch((e: Error) => {
          if (active) setError(e.message)
        })
        .finally(() => {
          if (active) setLoading(false)
        })
    }
    return () => {
      active = false
    }
  }, [activeSubTab, search, selectedGroup, startDate, endDate, selectedDoctorId, selectedRoomId])

  // Filtered Inventory items
  const filteredItems = useMemo(() => {
    let list = items
    if (expiryStatusFilter) {
      list = list.filter((i) =>
        i.inventoryBatches.some((b) => b.expiryStatus === expiryStatusFilter),
      )
    }
    return list
  }, [items, expiryStatusFilter])

  // Pagination slices
  const totalPages = Math.max(
    1,
    Math.ceil((activeSubTab === 'INVENTORY' ? filteredItems.length : usages.length) / pageSize),
  )
  const paginatedItems = useMemo(() => {
    const start = (page - 1) * pageSize
    return filteredItems.slice(start, start + pageSize)
  }, [filteredItems, page, pageSize])

  const paginatedUsages = useMemo(() => {
    const start = (page - 1) * pageSize
    return usages.slice(start, start + pageSize)
  }, [usages, page, pageSize])

  // View document details by code
  const openReceiptDoc = async (code?: string) => {
    if (!code || code === 'SEED-OPENING') return
    try {
      // Find document by matching code via fetchDocuments
      const { fetchDocuments } = await import('./warehouse-api')
      const docs = await fetchDocuments()
      const found = docs.find((d) => d.code === code)
      if (found) {
        const full = await fetchDocument(found.id)
        setPreviewDoc(full)
      } else {
        alert(`Chứng từ gốc ${code} không tồn tại hoặc đã lưu trữ.`)
      }
    } catch (e: any) {
      alert(e.message || 'Không thể xem chứng từ gốc')
    }
  }

  return (
    <section className="space-y-6">
      {/* Header & Sub-tab navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.2em] text-[#6657e8]">Chi tiết danh mục & lô</p>
          <h1 className="mt-1 text-3xl font-bold tracking-[-.04em] text-slate-900">Quản lý chi tiết kho</h1>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-3">
          {activeSubTab === 'INVENTORY' ? (
            <button
              type="button"
              onClick={() => exportWarehouseItemsToExcel(filteredItems)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              Xuất Excel tồn kho
            </button>
          ) : (
            <button
              type="button"
              onClick={() => exportUsageHistoryToExcel(usages)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <FileSpreadsheet className="size-4 text-emerald-600" />
              Xuất Excel lịch sử dùng
            </button>
          )}
        </div>
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

      {/* Sub-tab Switcher: Danh mục & Lô / Lịch sử sử dụng phòng khám */}
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('INVENTORY')
            setPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition ${
            activeSubTab === 'INVENTORY'
              ? 'border-[#6657e8] text-[#5546e8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="size-4" />
          Phần trên: Danh mục vật tư & Tồn theo lô ({filteredItems.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('USAGE')
            setPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition ${
            activeSubTab === 'USAGE'
              ? 'border-[#6657e8] text-[#5546e8]'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <History className="size-4" />
          Phần dưới: Lịch sử sử dụng phòng khám ({usages.length})
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveSubTab('DELETED')
            setPage(1)
          }}
          className={`flex items-center gap-2 border-b-2 px-6 py-3.5 text-sm font-bold transition ${
            activeSubTab === 'DELETED'
              ? 'border-red-600 text-red-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Trash2 className="size-4" />
          Phần 3: Đã xuất hủy (Bảng Deleted) ({deletedBatches.length})
        </button>
      </div>

      {/* Bộ lọc đa năng */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          {/* Tìm kiếm */}
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus-within:border-[#6657e8] focus-within:bg-white">
            <Search className="size-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Tìm mã hoặc tên VT..."
              className="w-full bg-transparent outline-none"
            />
          </label>

          {/* Phân nhóm */}
          <select
            value={selectedGroup}
            onChange={(e) => handleGroupChange(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#6657e8]"
          >
            <option value="">Tất cả phân nhóm</option>
            <option value="THUONG">VTYT thường</option>
            <option value="VO_CAM">VTYT vô cảm</option>
            <option value="VAN_PHONG">Văn phòng phẩm</option>
          </select>

          {activeSubTab === 'INVENTORY' ? (
            /* Lọc trạng thái hạn dùng */
            <select
              value={expiryStatusFilter}
              onChange={(e) => {
                setExpiryStatusFilter(e.target.value)
                setPage(1)
              }}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#6657e8]"
            >
              <option value="">Tất cả trạng thái hạn dùng</option>
              <option value="AVAILABLE">Còn hạn sử dụng</option>
              <option value="EXPIRING_SOON">Sắp hết hạn (trong 90 ngày)</option>
              <option value="EXPIRED">Đã hết hạn sử dụng</option>
            </select>
          ) : (
            <>
              {/* Lọc Bác sĩ */}
              <select
                value={selectedDoctorId}
                onChange={(e) => {
                  setSelectedDoctorId(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#6657e8]"
              >
                <option value="">Tất cả bác sĩ</option>
                {clinicContext?.doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.fullName}
                  </option>
                ))}
              </select>

              {/* Lọc Phòng khám */}
              <select
                value={selectedRoomId}
                onChange={(e) => {
                  setSelectedRoomId(e.target.value)
                  setPage(1)
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-[#6657e8]"
              >
                <option value="">Tất cả phòng khám / ghế</option>
                {clinicContext?.rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </>
          )}

          {/* Lọc từ ngày */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs">
            <span className="text-slate-400">Từ:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setPage(1)
              }}
              className="w-full bg-transparent outline-none"
            />
          </div>

          {/* Lọc đến ngày */}
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs">
            <span className="text-slate-400">Đến:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setPage(1)
              }}
              className="w-full bg-transparent outline-none"
            />
          </div>
        </div>

        {/* Nút reset bộ lọc */}
        {(search || selectedGroup || startDate || endDate || selectedDoctorId || selectedRoomId || expiryStatusFilter) && (
          <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
            <span className="text-slate-500">Đang áp dụng bộ lọc tùy chỉnh</span>
            <button
              type="button"
              onClick={() => {
                setSearch('')
                handleGroupChange('')
                setStartDate('')
                setEndDate('')
                setSelectedDoctorId('')
                setSelectedRoomId('')
                setExpiryStatusFilter('')
              }}
              className="font-bold text-[#5546e8] hover:underline"
            >
              Xóa tất cả bộ lọc
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      )}

      {/* NỘI DUNG CHÍNH: PHẦN TRÊN HOẶC PHẦN DƯỚI */}
      {loading ? (
        <div className="p-12 text-center text-sm text-slate-400">Đang tải dữ liệu chi tiết...</div>
      ) : activeSubTab === 'INVENTORY' ? (
        /* PHẦN TRÊN: DANH MỤC VẬT TƯ & TỒN THEO LÔ */
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">Mã / Tên vật tư</th>
                <th className="p-4">Nhóm</th>
                <th className="p-4 text-center">Đơn vị cơ bản</th>
                <th className="p-4 text-right">Tồn kho khả dụng</th>
                <th className="p-4 text-right">Tổng giá trị tồn</th>
                <th className="p-4 text-center">Chi tiết lô</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.map((item) => (
                <Fragment key={item.id}>
                  <tr
                    onClick={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
                    className="cursor-pointer transition hover:bg-slate-50/70"
                  >
                    <td className="p-4">
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <span className="mt-0.5 inline-block rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-slate-600">
                        {item.code}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          item.group === 'THUONG'
                            ? 'bg-blue-50 text-blue-700'
                            : item.group === 'VO_CAM'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {item.group === 'THUONG' ? 'VTYT thường' : item.group === 'VO_CAM' ? 'Thuốc vô cảm' : 'Văn phòng phẩm'}
                      </span>
                    </td>
                    <td className="p-4 text-center font-medium text-slate-700">{item.baseUnit}</td>
                    <td className="p-4 text-right">
                      <p
                        className={`font-bold ${
                          item.availableQuantity <= item.minimumStock ? 'text-amber-600' : 'text-slate-900'
                        }`}
                      >
                        {new Intl.NumberFormat('vi-VN').format(item.availableQuantity)} {item.baseUnit}
                      </p>
                      {item.availableQuantity <= item.minimumStock && (
                        <span className="text-[10px] font-bold text-amber-600">Dưới mức tối thiểu</span>
                      )}
                    </td>
                    <td className="p-4 text-right font-bold text-[#5546e8]">{formatMoney(item.inventoryValue)}</td>
                    <td className="p-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          setExpandedItemId(expandedItemId === item.id ? null : item.id)
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        {item.inventoryBatches.length} lô
                        <ChevronDown
                          className={`size-3.5 transition ${expandedItemId === item.id ? 'rotate-180' : ''}`}
                        />
                      </button>
                    </td>
                  </tr>

                  {/* Chi tiết từng dòng lô bên dưới */}
                  {expandedItemId === item.id && (
                    <tr className="bg-[#fafaff]">
                      <td colSpan={6} className="p-6">
                        <div className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Chi tiết các lô hàng còn tồn kho của {item.name}
                          </h4>
                          {!item.inventoryBatches.length ? (
                            <p className="mt-3 text-xs text-slate-400">Hiện không còn tồn kho của bất kỳ lô nào.</p>
                          ) : (
                            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                              {item.inventoryBatches.map((b) => (
                                <div
                                  key={b.id}
                                  className="flex flex-col justify-between rounded-xl border border-slate-200 p-4 transition hover:border-[#6657e8]"
                                >
                                  <div>
                                    <div className="flex items-center justify-between">
                                      <span className="font-bold text-slate-900">
                                        Lô: <span className="font-mono">{b.batchNo || 'Không số lô'}</span>
                                      </span>
                                      <span
                                        className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                          b.expiryStatus === 'EXPIRED'
                                            ? 'bg-red-100 text-red-800'
                                            : b.expiryStatus === 'EXPIRING_SOON'
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-emerald-100 text-emerald-800'
                                        }`}
                                      >
                                        {b.expiryStatus === 'EXPIRED'
                                          ? 'Đã hết hạn'
                                          : b.expiryStatus === 'EXPIRING_SOON'
                                          ? 'Sắp hết hạn'
                                          : 'Còn hạn'}
                                      </span>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-500">
                                      Hạn dùng: <b>{b.expiryDate ? new Date(b.expiryDate).toLocaleDateString('vi-VN') : 'Không áp dụng'}</b>
                                    </p>
                                    <p className="mt-1 text-xs text-slate-500">
                                      Giá vốn lô: <b>{formatMoney(b.unitCost)}</b> / {item.baseUnit}
                                    </p>
                                  </div>

                                  <div className="mt-4 border-t border-slate-100 pt-3">
                                    <div className="flex items-center justify-between text-xs">
                                      <span className="text-slate-500">Số lượng tồn:</span>
                                      <b className="text-sm font-bold text-slate-900">
                                        {b.quantity} {item.baseUnit}
                                      </b>
                                    </div>
                                    <div className="mt-2 flex items-center justify-between text-xs">
                                      <span className="text-slate-400">Phiếu nhập gốc:</span>
                                      {b.originalReceiptCode ? (
                                        <button
                                          type="button"
                                          onClick={() => openReceiptDoc(b.originalReceiptCode)}
                                          className="font-mono font-bold text-[#5546e8] hover:underline"
                                        >
                                          {b.originalReceiptCode}
                                        </button>
                                      ) : (
                                        <span className="text-slate-400">—</span>
                                      )}
                                    </div>
                                    {b.quantity > 0 && (
                                      <div className="mt-3 border-t border-dashed border-slate-100 pt-2 flex justify-end">
                                        <button
                                          type="button"
                                          onClick={(e) => {
                                            e.stopPropagation()
                                            setDisposingBatch({
                                              id: b.id,
                                              batchNo: b.batchNo,
                                              supplyName: item.name,
                                              quantity: b.quantity,
                                              baseUnit: item.baseUnit,
                                              expiryDate: b.expiryDate,
                                            })
                                            setDisposeReason(
                                              b.expiryStatus === 'EXPIRED'
                                                ? `Hủy do hết hạn sử dụng lô ${b.batchNo || 'Không số lô'}, chuyển sang bảng Deleted`
                                                : `Hủy do hư hỏng / suy giảm chất lượng lô ${b.batchNo || 'Không số lô'}, chuyển sang bảng Deleted`
                                            )
                                          }}
                                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[11px] font-bold text-red-600 transition hover:bg-red-100"
                                        >
                                          <Trash2 className="size-3" />
                                          Hủy lô (Chuyển bảng Deleted)
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          {!filteredItems.length && (
            <p className="p-12 text-center text-sm text-slate-400">Không tìm thấy vật tư nào phù hợp.</p>
          )}
        </div>
      ) : activeSubTab === 'USAGE' ? (
        /* PHẦN DƯỚI: TỪNG DÒNG LỊCH SỬ SỬ DỤNG TỪ CÁC PHÒNG KHÁM */
        <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">Mã phiếu / Ca khám</th>
                <th className="p-4">Vật tư y tế</th>
                <th className="p-4 text-center">Số lượng</th>
                <th className="p-4">Bác sĩ & Bệnh nhân</th>
                <th className="p-4">Phòng khám / Ghế</th>
                <th className="p-4">Thời gian</th>
                <th className="p-4 text-right">Giá vốn</th>
                <th className="p-4 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedUsages.map((u) => (
                <tr key={u.id} className="transition hover:bg-slate-50/70">
                  <td className="p-4">
                    <span className="font-mono font-bold text-slate-900">{u.documentCode}</span>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {u.sourceType === 'DOCTOR_EXAM' ? 'Bác sĩ ghi nhận' : 'Kho xuất phát'}
                    </p>
                  </td>
                  <td className="p-4">
                    <p className="font-semibold text-slate-900">{u.supplyName}</p>
                    <p className="text-xs text-slate-500">
                      Mã: <span className="font-mono">{u.supplyCode}</span> · Lô: {u.batchNo}
                    </p>
                  </td>
                  <td className="p-4 text-center">
                    <span className="font-bold text-slate-900">
                      {u.quantity} {u.baseUnit}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="font-medium text-slate-900">{u.doctorName}</p>
                    <p className="text-xs text-slate-500">BN: {u.patientName}</p>
                  </td>
                  <td className="p-4 font-medium text-slate-700">{u.roomName}</td>
                  <td className="p-4 text-xs text-slate-500">
                    {new Date(u.usedAt).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-4 text-right text-xs text-slate-600">{formatMoney(u.unitCost)}</td>
                  <td className="p-4 text-right font-bold text-[#5546e8]">{formatMoney(u.totalAmount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!usages.length && (
            <p className="p-12 text-center text-sm text-slate-400">Không có dữ liệu lịch sử sử dụng vật tư nào.</p>
          )}
        </div>
      ) : (
        /* PHẦN 3: ĐÃ XUẤT HỦY (BẢNG DELETED) */
        <div className="overflow-hidden rounded-3xl border border-red-200/80 bg-white shadow-sm">
          <div className="border-b border-red-100 bg-red-50/50 p-4">
            <h3 className="text-sm font-bold text-red-900">
              Danh sách sản phẩm hư hỏng / hết hạn đã chuyển sang bảng InventoryBatchDeleted ({deletedBatches.length})
            </h3>
            <p className="text-xs text-red-700">
              Dữ liệu được lưu trữ độc lập phục vụ kiểm toán dược và báo cáo hao hụt tài chính.
            </p>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4">Số lô / ID gốc</th>
                <th className="p-4">Hạn dùng</th>
                <th className="p-4 text-right">Số lượng hủy</th>
                <th className="p-4 text-right">Giá vốn lô</th>
                <th className="p-4">Thời điểm hủy</th>
                <th className="p-4">Người hủy</th>
                <th className="p-4">Lý do hủy (Lưu CSDL)</th>
                <th className="p-4 text-center">Trạng thái CSDL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deletedBatches.map((db) => (
                <tr key={db.id} className="hover:bg-slate-50/70">
                  <td className="p-4">
                    <p className="font-mono font-bold text-slate-900">{db.batchNo || 'Không số lô'}</p>
                    <span className="text-xs text-slate-400">ID gốc: #{db.originalId}</span>
                  </td>
                  <td className="p-4 text-xs">
                    {db.expiryDate ? new Date(db.expiryDate).toLocaleDateString('vi-VN') : '—'}
                  </td>
                  <td className="p-4 text-right font-bold text-red-600">
                    {db.quantity}
                  </td>
                  <td className="p-4 text-right text-xs font-semibold text-slate-700">
                    {formatMoney(db.unitCost)}
                  </td>
                  <td className="p-4 text-xs text-slate-500">
                    {db.deletedAt ? new Date(db.deletedAt).toLocaleString('vi-VN') : '—'}
                  </td>
                  <td className="p-4 text-xs font-medium text-slate-700">
                    {db.deletedBy || 'warehouse'}
                  </td>
                  <td className="p-4 text-xs text-slate-600 max-w-xs">
                    {db.deleteReason || 'Hủy do hư hỏng / hết hạn'}
                  </td>
                  <td className="p-4 text-center">
                    <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[10px] font-bold text-red-800">
                      BẢN SAO LƯU DELETED
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!deletedBatches.length && (
            <p className="p-12 text-center text-sm text-slate-400">Chưa có bản ghi nào trong bảng InventoryBatchDeleted.</p>
          )}
        </div>
      )}

      {/* Phân trang */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/80 pt-4 text-xs">
          <p className="text-slate-500">
            Trang {page} / {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 disabled:opacity-40"
            >
              Trước
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-bold text-slate-700 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </div>
      )}

      {/* Modal xem chi tiết phiếu gốc */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <span className="text-xs font-bold text-[#5546e8]">Chứng từ nhập gốc</span>
                <h3 className="text-xl font-bold text-slate-900">{previewDoc.code}</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-xl bg-slate-50 p-4">
                <div>
                  <p className="text-xs text-slate-500">Nhà cung cấp:</p>
                  <p className="font-bold text-slate-900">{previewDoc.supplier?.name || '—'}</p>
                  <p className="text-xs text-slate-500">MST: {previewDoc.supplier?.taxCode || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Ngày lập:</p>
                  <p className="font-bold text-slate-900">
                    {new Date(previewDoc.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                  <p className="text-xs text-slate-500">Trạng thái: <b>{previewDoc.status}</b></p>
                </div>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 font-bold text-slate-600">
                    <tr>
                      <th className="p-3">Tên vật tư</th>
                      <th className="p-3">Số lượng</th>
                      <th className="p-3">Đơn vị</th>
                      <th className="p-3 text-right">Đơn giá</th>
                      <th className="p-3 text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewDoc.lines.map((l) => (
                      <tr key={l.id}>
                        <td className="p-3 font-semibold">{l.supply.name}</td>
                        <td className="p-3">{l.inputQuantity}</td>
                        <td className="p-3">{l.inputUnit}</td>
                        <td className="p-3 text-right">{formatMoney(l.inputUnitPrice)}</td>
                        <td className="p-3 text-right font-bold">{formatMoney(l.totalAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="text-right">
                <p className="text-sm font-bold text-slate-900">
                  Tổng cộng thanh toán: {formatMoney(previewDoc.totalAmount)}
                </p>
                {previewDoc.totalAmountInWords && (
                  <p className="text-xs italic text-slate-500">Bằng chữ: {previewDoc.totalAmountInWords}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hủy sản phẩm hư hỏng / hết hạn */}
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
                <p>Vật tư: <b className="text-slate-900">{disposingBatch.supplyName}</b></p>
                <p>Số lô: <b className="font-mono text-slate-900">{disposingBatch.batchNo || 'Không số lô'}</b></p>
                <p>Số lượng hủy: <b className="text-red-600 font-bold">{disposingBatch.quantity} {disposingBatch.baseUnit}</b></p>
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
                      // Refresh inventory & deleted backups
                      const [refreshedItems, refreshedDeleted] = await Promise.all([
                        fetchItems(search, selectedGroup),
                        fetchDeletedBackups(),
                      ])
                      setItems(refreshedItems)
                      setDeletedBatches(refreshedDeleted.batches || [])
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
