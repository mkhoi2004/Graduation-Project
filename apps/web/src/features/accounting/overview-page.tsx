import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  Coins,
  FileCheck2,
  Filter,
  Info,
  Layers,
  Scale,
  TrendingUp,
} from 'lucide-react'
import { fetchOverview, fetchPerformanceDetails } from './accounting-api'
import { categoryLabel, formatCurrency, methodLabel } from './accounting-format'
import type { AccountingOverview, PerformanceDetail } from './accounting-types'
import { Card, PageHeading, selectClass } from './accounting-ui'
import { clinicRooms, dentalServices, doctors } from '../reception/reception-data'

function getPresetDates(preset: 'today' | 'week' | 'month' | 'quarter' | 'all') {
  const now = new Date()
  if (preset === 'today') {
    const d = now.toISOString().slice(0, 10)
    return { start: d, end: d }
  }
  if (preset === 'week') {
    const day = now.getDay() || 7
    const firstDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1)
    return {
      start: firstDay.toISOString().slice(0, 10),
      end: new Date().toISOString().slice(0, 10),
    }
  }
  if (preset === 'month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    return {
      start: firstDay.toISOString().slice(0, 10),
      end: lastDay.toISOString().slice(0, 10),
    }
  }
  if (preset === 'quarter') {
    const quarterMonth = Math.floor(now.getMonth() / 3) * 3
    const firstDay = new Date(now.getFullYear(), quarterMonth, 1)
    const lastDay = new Date(now.getFullYear(), quarterMonth + 3, 0)
    return {
      start: firstDay.toISOString().slice(0, 10),
      end: lastDay.toISOString().slice(0, 10),
    }
  }
  return { start: '', end: '' }
}

export function AccountingOverviewPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<AccountingOverview | null>(null)
  const [perfDetail, setPerfDetail] = useState<PerformanceDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Global filters
  const [datePreset, setDatePreset] = useState<'today' | 'week' | 'month' | 'quarter' | 'all'>('month')
  const [startDate, setStartDate] = useState(() => getPresetDates('month').start)
  const [endDate, setEndDate] = useState(() => getPresetDates('month').end)
  const [roomId, setRoomId] = useState<string>('')
  const [serviceType, setServiceType] = useState<string>('')
  const [supplyType, setSupplyType] = useState<string>('')

  const handlePresetChange = (preset: 'today' | 'week' | 'month' | 'quarter' | 'all') => {
    setDatePreset(preset)
    const dates = getPresetDates(preset)
    setStartDate(dates.start)
    setEndDate(dates.end)
  }

  useEffect(() => {
    let active = true

    const filters = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      roomId: roomId ? Number(roomId) : undefined,
      serviceType: serviceType || undefined,
      supplyType: supplyType || undefined,
    }

    Promise.all([
      fetchOverview(filters),
      fetchPerformanceDetails({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        roomId: roomId ? Number(roomId) : undefined,
      }),
    ])
      .then(([overviewRes, perfRes]) => {
        if (!active) return
        setData(overviewRes)
        setPerfDetail(perfRes)
        setLoading(false)
      })
      .catch((err) => {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Không thể tải tổng quan kế toán.')
        setLoading(false)
      })

    return () => {
      active = false
    }
  }, [startDate, endDate, roomId, serviceType, supplyType])

  if (loading && !data) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="size-6 animate-spin rounded-full border-2 border-[#5546e8] border-t-transparent" />
          <span>Đang tải số liệu tổng quan kế toán...</span>
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
        <p className="font-bold">Đã xảy ra lỗi khi tải dữ liệu kế toán</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    )
  }

  if (!data) return null

  // Helpers for category visual bars
  const totalIn = data.cash.summary.moneyIn || 1
  const totalOut = data.cash.summary.moneyOut || 1

  return (
    <div className="space-y-6">
      <PageHeading
        title="Tổng quan kế toán quản trị"
        description="Trình bày tách bạch ba góc nhìn: Dòng tiền thực tế, Hiệu quả kinh doanh và Quản trị công nợ."
        action={
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="size-3.5 text-emerald-600" />
              Sổ sách cân khớp
            </span>
          </div>
        }
      />

      {/* GLOBAL FILTER TOOLBAR */}
      <Card className="border-indigo-100 bg-gradient-to-r from-white via-indigo-50/20 to-white">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Filter className="size-4 text-[#5546e8]" />
            <span>Bộ lọc toàn diện theo kỳ báo cáo</span>
          </div>
          <p className="text-[11px] text-slate-400">
            * Bộ lọc không áp dụng cho một khối sẽ được chú thích rõ
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {/* Preset time */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Kỳ thời gian:</label>
            <select
              value={datePreset}
              onChange={(e) => handlePresetChange(e.target.value as any)}
              className={selectClass}
            >
              <option value="today">Hôm nay</option>
              <option value="week">Tuần này</option>
              <option value="month">Tháng này</option>
              <option value="quarter">Quý này</option>
              <option value="all">Tất cả thời gian</option>
            </select>
          </div>

          {/* Room filter */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Phòng khám:</label>
            <select
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
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

          {/* Service type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Loại dịch vụ:
            </label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className={selectClass}
            >
              <option value="">Tất cả dịch vụ</option>
              <option value="TREATMENT">Điều trị nha khoa</option>
              <option value="COSMETIC">Thẩm mỹ &amp; Phục hình</option>
            </select>
          </div>

          {/* Supply type */}
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">
              Nhóm vật tư tiêu hao:
            </label>
            <select
              value={supplyType}
              onChange={(e) => setSupplyType(e.target.value)}
              className={selectClass}
            >
              <option value="">Tất cả vật tư</option>
              <option value="THUONG">VTYT thường</option>
              <option value="VO_CAM">VTYT vô cảm / Gây tê</option>
              <option value="VAN_PHONG">Văn phòng phẩm</option>
            </select>
          </div>

          {/* Custom Date Range Display */}
          <div className="flex flex-col justify-end">
            <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <Calendar className="size-4 text-[#5546e8]" />
              <span>
                {startDate && endDate ? `${startDate} → ${endDate}` : 'Toàn thời gian'}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* 1. KHỐI DÒNG TIỀN (THỰC THU / THỰC CHI) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
              <Coins className="size-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">1. Khối Dòng Tiền Thực Tế</h2>
          </div>
          <span className="text-xs text-slate-400">
            Tiền vào/ra thực tế · Không bao gồm xuất kho chưa thanh toán
          </span>
        </div>

        {/* 4 Metric cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>TỔNG TIỀN VÀO (THỰC THU)</span>
              <ArrowUpRight className="size-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600">
              {formatCurrency(data.cash.summary.moneyIn)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Bao gồm thu trước, thanh toán cọc và bán lẻ
            </p>
          </Card>

          <Card className="border-l-4 border-l-rose-500">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>TỔNG TIỀN RA (THỰC CHI)</span>
              <ArrowDownRight className="size-4 text-rose-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-rose-600">
              {formatCurrency(data.cash.summary.moneyOut)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Chi trả NCC, labo, mặt bằng, điện nước, lương
            </p>
          </Card>

          <Card className="border-l-4 border-l-[#5546e8]">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>DÒNG TIỀN THUẦN (NET CASH)</span>
              <TrendingUp className="size-4 text-[#5546e8]" />
            </div>
            <p
              className={`mt-2 text-2xl font-black ${
                data.cash.summary.netCash >= 0 ? 'text-[#5546e8]' : 'text-rose-600'
              }`}
            >
              {formatCurrency(data.cash.summary.netCash)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Tiền vào − Tiền ra (Không gọi là lợi nhuận)
            </p>
          </Card>

          <Card className="border-l-4 border-l-slate-400">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>SỐ CHỨNG TỪ GỐC TRONG KỲ</span>
              <FileCheck2 className="size-4 text-slate-600" />
            </div>
            <p className="mt-2 text-2xl font-black text-slate-900">
              {data.cash.summary.documentCount}{' '}
              <span className="text-sm font-normal text-slate-400">chứng từ</span>
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Đếm theo chứng từ gốc, loại trừ chứng từ đã hủy
            </p>
          </Card>
        </div>

        {/* Breakdown bars & side metrics */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          {/* Cơ cấu tiền vào */}
          <Card>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
              Cơ cấu dòng tiền vào
            </h3>
            <div className="space-y-3">
              {Object.entries(data.cash.byCategory)
                .filter(([cat]) =>
                  [
                    'PATIENT_ADVANCE',
                    'TREATMENT_REVENUE',
                    'COSMETIC_REVENUE',
                    'RETAIL_REVENUE',
                    'DEPOSIT_REVENUE',
                    'INSTALLMENT_REVENUE',
                    'PATIENT_DEBT_PAYMENT',
                  ].includes(cat),
                )
                .map(([cat, amount]) => {
                  const pct = Math.round((amount / totalIn) * 100)
                  return (
                    <div
                      key={cat}
                      onClick={() => navigate('/accounting/cash')}
                      className="group cursor-pointer"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 group-hover:text-[#5546e8]">
                          {categoryLabel(cat)}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(amount)} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              {Object.keys(data.cash.byCategory).length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">Chưa có giao dịch thu.</p>
              )}
            </div>
          </Card>

          {/* Cơ cấu tiền ra */}
          <Card>
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
              Cơ cấu dòng tiền ra
            </h3>
            <div className="space-y-3">
              {Object.entries(data.cash.byCategory)
                .filter(([cat]) =>
                  [
                    'MATERIAL_PAYMENT',
                    'LABO_PAYMENT',
                    'ADMIN_EXPENSE',
                    'SALARY',
                    'CARD_FEE',
                    'REFUND',
                  ].includes(cat),
                )
                .map(([cat, amount]) => {
                  const pct = Math.round((amount / totalOut) * 100)
                  return (
                    <div
                      key={cat}
                      onClick={() => navigate('/accounting/cash')}
                      className="group cursor-pointer"
                    >
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-700 group-hover:text-rose-600">
                          {categoryLabel(cat)}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatCurrency(amount)} ({pct}%)
                        </span>
                      </div>
                      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-rose-500 transition-all duration-500"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              {Object.keys(data.cash.byCategory).length === 0 && (
                <p className="py-4 text-center text-xs text-slate-400">Chưa có giao dịch chi.</p>
              )}
            </div>
          </Card>

          {/* Hình thức thanh toán & Thuế đã nhập */}
          <Card className="flex flex-col justify-between">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-700">
                Hình thức thanh toán (Dòng tiền)
              </h3>
              <div className="space-y-2.5">
                {Object.entries(data.cash.byMethod).map(([method, amount]) => (
                  <div key={method} className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">{methodLabel(method)}</span>
                    <span className="font-mono font-bold text-slate-800">
                      {formatCurrency(amount)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Info className="size-3.5 text-[#5546e8]" />
                <span>Thuế GTGT đã nhập theo kỳ:</span>
              </div>
              <p className="mt-1 font-mono text-base font-extrabold text-[#5546e8]">
                {formatCurrency(data.cash.enteredTaxTotal)}
              </p>
              <p className="text-[10px] text-slate-400 italic">
                * Dữ liệu theo số liệu nhập tay của kế toán, không phải số quyết toán thuế chính thức.
              </p>
            </div>
          </Card>
        </div>
      </div>

      {/* 2. KHỐI HIỆU QUẢ (DOANH THU − GIÁ VỐN = LÃI GỘP) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-amber-100 text-amber-700">
              <Scale className="size-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              2. Khối Hiệu Quả Nghiệp Vụ (Lãi Gộp Ca Khám)
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Doanh thu ghi nhận − Giá vốn VTYT tiêu hao theo lô
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-l-4 border-l-blue-500">
            <span className="text-xs font-semibold text-slate-500">
              DOANH THU GHI NHẬN (CA HOÀN THÀNH)
            </span>
            <p className="mt-2 text-2xl font-black text-blue-600">
              {formatCurrency(data.performance.revenue)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Tính trên các dòng dịch vụ đã hoàn thành thực tế
            </p>
          </Card>

          <Card className="border-l-4 border-l-orange-500">
            <span className="text-xs font-semibold text-slate-500">
              GIÁ VỐN VTYT TIÊU HAO (XUẤT DÙNG)
            </span>
            <p className="mt-2 text-2xl font-black text-orange-600">
              {formatCurrency(data.performance.supplyCost)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Lấy theo giá vốn lô của kho (Không phải dòng chi)
            </p>
          </Card>

          <Card className="border-l-4 border-l-emerald-500">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">LÃI GỘP CHUYÊN MÔN</span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-bold text-emerald-700">
                {data.performance.revenue > 0
                  ? `${Math.round((data.performance.grossProfit / data.performance.revenue) * 100)}%`
                  : '0%'}
              </span>
            </div>
            <p className="mt-2 text-2xl font-black text-emerald-600">
              {formatCurrency(data.performance.grossProfit)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Doanh thu − Giá vốn VTYT tiêu hao
            </p>
          </Card>
        </div>

        {/* Detailed Performance Table (By service & by doctor) */}
        {perfDetail && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hiệu quả theo dịch vụ nha khoa
                </h3>
                <span className="text-[11px] text-slate-400">Top dịch vụ</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                      <th className="p-2">Dịch vụ</th>
                      <th className="p-2 text-center">Số ca</th>
                      <th className="p-2 text-right">Doanh thu</th>
                      <th className="p-2 text-right">Giá vốn</th>
                      <th className="p-2 text-right">Lãi gộp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(perfDetail?.byService ?? []).map((s) => {
                      const svcInfo = dentalServices.find((ds) => String(ds.id) === String(s.serviceId))
                      return (
                        <tr key={s.serviceId} className="hover:bg-slate-50/60">
                          <td className="p-2 font-medium text-slate-800">
                            {svcInfo?.name ?? `Dịch vụ #${s.serviceId}`}
                          </td>
                          <td className="p-2 text-center text-slate-600">{s.count}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(s.revenue)}</td>
                          <td className="p-2 text-right font-mono text-slate-500">{formatCurrency(s.cost)}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(s.profit)}
                          </td>
                        </tr>
                      )
                    })}
                    {(perfDetail?.byService ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Chưa có dữ liệu hiệu quả trong kỳ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hiệu quả theo bác sĩ điều trị
                </h3>
                <span className="text-[11px] text-slate-400">Bác sĩ</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                      <th className="p-2">Bác sĩ</th>
                      <th className="p-2 text-center">Số ca</th>
                      <th className="p-2 text-right">Doanh thu</th>
                      <th className="p-2 text-right">Giá vốn</th>
                      <th className="p-2 text-right">Lãi gộp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(perfDetail?.byDoctor ?? []).map((d) => {
                      const docInfo = doctors.find((dc) => String(dc.id) === String(d.doctorId))
                      return (
                        <tr key={d.doctorId} className="hover:bg-slate-50/60">
                          <td className="p-2 font-medium text-slate-800">
                            {docInfo?.name ?? `Bác sĩ #${d.doctorId}`}
                          </td>
                          <td className="p-2 text-center text-slate-600">{d.count}</td>
                          <td className="p-2 text-right font-mono">{formatCurrency(d.revenue)}</td>
                          <td className="p-2 text-right font-mono text-slate-500">{formatCurrency(d.cost)}</td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-600">
                            {formatCurrency(d.profit)}
                          </td>
                        </tr>
                      )
                    })}
                    {(perfDetail?.byDoctor ?? []).length === 0 && (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          Chưa có dữ liệu bác sĩ trong kỳ.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* 3. KHỐI CÔNG NỢ & TUỔI NỢ */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-lg bg-indigo-100 text-[#5546e8]">
              <Layers className="size-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900">
              3. Khối Công Nợ &amp; Phân Tích Tuổi Nợ
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Không dùng biểu đồ tròn do hai chiều công nợ ngược nhau
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card
            onClick={() => navigate('/accounting/debts?type=PATIENT_RECEIVABLE')}
            className="group cursor-pointer border-l-4 border-l-indigo-500 hover:border-slate-300"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>PHẢI THU BỆNH NHÂN (TỔNG CỘNG)</span>
              <span className="text-xs text-[#5546e8] group-hover:underline">Xem chi tiết →</span>
            </div>
            <p className="mt-2 text-2xl font-black text-indigo-600">
              {formatCurrency(data.debt.receivable)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Doanh thu đã ghi nhận − Tiền bệnh nhân đã thanh toán
            </p>
          </Card>

          <Card
            onClick={() => navigate('/accounting/debts?type=SUPPLIER_PAYABLE')}
            className="group cursor-pointer border-l-4 border-l-amber-500 hover:border-slate-300"
          >
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
              <span>PHẢI TRẢ NHÀ CUNG CẤP &amp; LABO</span>
              <span className="text-xs text-amber-600 group-hover:underline">Xem chi tiết →</span>
            </div>
            <p className="mt-2 text-2xl font-black text-amber-600">
              {formatCurrency(data.debt.payable)}
            </p>
            <p className="mt-1 text-[11px] text-slate-400">
              Tính trên các phiếu nhập kho và phiếu labo đã ghi sổ
            </p>
          </Card>
        </div>

        {/* Bảng tuổi nợ 4 bucket */}
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Phân loại tuổi nợ (Aging Report)
            </h3>
            <span className="text-xs text-slate-400">
              Tính từ ngày đến hạn thanh toán đến hôm nay
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-center">
              <p className="text-xs font-bold text-emerald-800">0 – 30 NGÀY</p>
              <p className="mt-1 text-sm text-slate-500">Trong hạn / Mới phát sinh</p>
              <p className="mt-2 font-mono text-lg font-black text-emerald-700">
                {formatCurrency(data.debt.aging['0-30'] ?? 0)}
              </p>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5 text-center">
              <p className="text-xs font-bold text-amber-800">31 – 60 NGÀY</p>
              <p className="mt-1 text-sm text-slate-500">Cần nhắc nhở</p>
              <p className="mt-2 font-mono text-lg font-black text-amber-700">
                {formatCurrency(data.debt.aging['31-60'] ?? 0)}
              </p>
            </div>

            <div className="rounded-xl border border-orange-200 bg-orange-50/50 p-3.5 text-center">
              <p className="text-xs font-bold text-orange-800">61 – 90 NGÀY</p>
              <p className="mt-1 text-sm text-slate-500">Cảnh báo chậm trả</p>
              <p className="mt-2 font-mono text-lg font-black text-orange-700">
                {formatCurrency(data.debt.aging['61-90'] ?? 0)}
              </p>
            </div>

            <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3.5 text-center">
              <p className="text-xs font-bold text-rose-800">&gt; 90 NGÀY</p>
              <p className="mt-1 text-sm text-slate-500">Nợ quá hạn nghiêm trọng</p>
              <p className="mt-2 font-mono text-lg font-black text-rose-700">
                {formatCurrency(data.debt.aging['>90'] ?? 0)}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
