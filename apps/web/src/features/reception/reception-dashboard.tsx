import { useState } from 'react'
import { ArrowRight, ClipboardPlus, Clock3, Send, Sparkles, UsersRound } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useReception } from './reception-context'
import { PageTitle, StatusPill } from './reception-ui'

export function ReceptionDashboard() {
  const { patients, intakes, dispatch } = useReception()
  const [today] = useState(() => new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }))
  const stats = [
    { label: 'Tổng bệnh nhân', value: patients.length, icon: UsersRound, tone: 'bg-[#f0efff] text-[#5546e8]' },
    { label: 'Phiếu tiếp nhận', value: intakes.length, icon: ClipboardPlus, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Chờ hoàn thiện', value: intakes.filter((item) => item.status !== 'TRANSFERRED').length, icon: Clock3, tone: 'bg-amber-50 text-amber-600' },
    { label: 'Đã chuyển bác sĩ', value: intakes.filter((item) => item.status === 'TRANSFERRED').length, icon: Send, tone: 'bg-emerald-50 text-emerald-600' },
  ]
  return <>
    <PageTitle eyebrow={today} title="Quầy tiếp nhận" description="Quản lý nhanh hồ sơ bệnh nhân và theo dõi toàn bộ luồng tiếp nhận trong ngày." action={<Link to="/reception/patients" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ff6f76] px-4 text-sm font-semibold text-white shadow-lg shadow-[#ff6f76]/20">Tiếp nhận bệnh nhân <ArrowRight className="size-4" /></Link>} />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{stats.map(({ label, value, icon: Icon, tone }) => <div key={label} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm"><div className={`grid size-11 place-items-center rounded-2xl ${tone}`}><Icon className="size-5" /></div><p className="mt-5 text-3xl font-bold tracking-tight">{value}</p><p className="mt-1 text-sm text-slate-500">{label}</p></div>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_0.6fr]">
      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6"><div className="flex items-center justify-between"><div><h3 className="font-bold text-slate-900">Tiếp nhận gần đây</h3><p className="mt-1 text-sm text-slate-500">Các hồ sơ vừa được tạo tại quầy.</p></div><Link to="/reception/transfer" className="text-sm font-semibold text-[#5546e8]">Xem tất cả</Link></div><div className="mt-5 space-y-3">{intakes.length ? intakes.slice(-5).reverse().map((intake) => { const patient = patients.find((item) => item.id === intake.patientId); return <div key={intake.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-50 p-4"><div><p className="font-semibold text-slate-800">{patient?.fullName ?? 'Bệnh nhân'}</p><p className="mt-1 text-xs text-slate-400">{intake.id}</p></div><StatusPill status={intake.status} /></div> }) : <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center"><p className="text-sm font-medium text-slate-500">Chưa có phiếu tiếp nhận nào hôm nay.</p><p className="mt-1 text-xs text-slate-400">Bạn có thể nạp ngay dữ liệu mẫu để thử nghiệm quy trình.</p><button type="button" onClick={() => dispatch({ type: 'LOAD_DEMO_DATA' })} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#5546e8] px-4 py-2 text-xs font-semibold text-white shadow hover:bg-[#4739d6]"><Sparkles className="size-3.5" /> Nạp dữ liệu mẫu</button></div>}</div></section>
      <aside className="rounded-3xl bg-[#5546e8] p-6 text-white shadow-xl shadow-[#5546e8]/15"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/60">Quy trình gợi ý</p><h3 className="mt-3 text-xl font-bold">5 bước tiếp nhận</h3><ol className="mt-5 space-y-4 text-sm text-white/80">{['Tạo hoặc cập nhật bệnh nhân', 'Lập phiếu tiếp nhận', 'Chọn dịch vụ và phòng khám', 'Kiểm tra phiếu', 'Chuyển hồ sơ tới bác sĩ'].map((step, index) => <li key={step} className="flex gap-3"><span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/15 text-xs font-bold">{index + 1}</span>{step}</li>)}</ol></aside>
    </div>
  </>
}
