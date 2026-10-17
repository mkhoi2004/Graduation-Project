import { CheckCircle2, Send } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { clinicRooms, currentIsoTimestamp, doctors } from './reception-data'
import { useReception } from './reception-context'
import { EmptyState, PageTitle, StatusPill } from './reception-ui'

export function TransferPage() {
  const { patients, intakes, dispatch } = useReception()
  const [params] = useSearchParams()
  const focusedId = params.get('intake')
  const ordered = [...intakes].sort((a, b) => Number(b.id === focusedId) - Number(a.id === focusedId))
  function transfer(intakeId: string) { dispatch({ type: 'TRANSFER_INTAKE', intakeId, transferredAt: currentIsoTimestamp() }) }
  return <>
      <PageTitle eyebrow="Bước 6" title="Chuyển hồ sơ tới bác sĩ" description="Xác nhận hồ sơ đã đủ dịch vụ, phòng khám, bác sĩ và thanh toán trước khi kết thúc thao tác tại quầy." />
    {!intakes.length ? <EmptyState icon={<Send className="size-6" />} title="Chưa có hồ sơ chờ chuyển" description="Các phiếu đã tạo sẽ xuất hiện tại đây." action={<Link to="/reception/intakes/new" className="inline-flex h-10 items-center rounded-xl bg-[#5546e8] px-4 text-sm font-semibold text-white">Tạo tiếp nhận</Link>} /> : <div className="space-y-4">{ordered.map((intake) => { const patient = patients.find((item) => item.id === intake.patientId); const room = clinicRooms.find((item) => item.id === intake.roomId); const doctor = doctors.find((item) => item.id === intake.doctorId); const ready = intake.status === 'PAID'; return <article key={intake.id} className={`rounded-3xl border bg-white p-5 shadow-sm sm:p-6 ${intake.id === focusedId ? 'border-[#6657e8] ring-4 ring-[#6657e8]/10' : 'border-slate-200/80'}`}><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div className="flex items-start gap-4"><div className={`grid size-12 shrink-0 place-items-center rounded-2xl ${intake.status === 'TRANSFERRED' ? 'bg-emerald-50 text-emerald-600' : 'bg-[#f0efff] text-[#5546e8]'}`}>{intake.status === 'TRANSFERRED' ? <CheckCircle2 className="size-6" /> : <Send className="size-5" />}</div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-900">{patient?.fullName}</h3><StatusPill status={intake.status} /></div><p className="mt-1 text-xs font-semibold text-slate-400">{intake.id} · {patient?.id}</p><div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-slate-500"><span>{doctor?.name ?? 'Chưa chọn bác sĩ'}</span><span>{room?.name ?? 'Chưa chọn phòng'}</span><span>{intake.services.length} dịch vụ</span></div></div></div><div className="flex shrink-0 gap-2">{intake.status === 'DRAFT' || intake.status === 'READY' ? <Link to={`/reception/services?intake=${encodeURIComponent(intake.id)}`} className="inline-flex h-10 items-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600">Chỉnh sửa</Link> : null}<Button type="button" disabled={!ready} onClick={() => transfer(intake.id)} className="h-10 rounded-xl bg-[#ff6f76] px-4 hover:bg-[#ef6068]">{intake.status === 'TRANSFERRED' ? 'Đã chuyển' : 'Chuyển bác sĩ'}</Button></div></div>{intake.status === 'DRAFT' ? <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-xs font-medium text-amber-700">Hồ sơ chưa đủ dịch vụ, phòng hoặc bác sĩ. Hãy hoàn thiện trước khi chuyển.</p> : intake.status === 'READY' ? <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-xs font-medium text-blue-700">Hồ sơ đang chờ hoàn tất thanh toán.</p> : null}</article>})}</div>}
  </>
}
