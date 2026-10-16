import { useMemo, useState } from 'react'
import { Check, Minus, Plus, Stethoscope } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { calculateIntakeTotal, clinicRooms, dentalServices, doctors, formatCurrency } from './reception-data'
import { useReception } from './reception-context'
import { EmptyState, inputClass, labelClass, PageTitle } from './reception-ui'

export function ServicesPage() {
  const { patients, intakes, dispatch } = useReception()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const editableIntakes = intakes.filter((item) => item.status !== 'TRANSFERRED')
  const requestedId = params.get('intake')
  const [selectedId, setSelectedId] = useState(editableIntakes.some((item) => item.id === requestedId) ? requestedId ?? '' : editableIntakes[0]?.id ?? '')
  const intake = editableIntakes.find((item) => item.id === selectedId)
  const total = calculateIntakeTotal(intake?.services ?? [])
  const categories = useMemo(() => [...new Set(dentalServices.map((service) => service.category))], [])

  function update(patch: Partial<NonNullable<typeof intake>>) { if (intake) dispatch({ type: 'UPDATE_INTAKE', intake: { ...intake, ...patch } }) }
  function quantity(serviceId: string) { return intake?.services.find((item) => item.serviceId === serviceId)?.quantity ?? 0 }
  function changeQuantity(serviceId: string, next: number) {
    if (!intake) return
    const services = intake.services.filter((item) => item.serviceId !== serviceId)
    if (next > 0) services.push({ serviceId, quantity: next })
    update({ services, status: 'DRAFT' })
  }
  function save() {
    if (!intake || !intake.services.length || !intake.roomId || !intake.doctorId) return
    dispatch({ type: 'UPDATE_INTAKE', intake: { ...intake, status: 'READY' } })
    navigate(`/reception/receipt?intake=${encodeURIComponent(intake.id)}`)
  }

  return <>
    <PageTitle eyebrow="Bước 3" title="Dịch vụ & điều phối" description="Chọn dịch vụ, số lượng, phòng khám và bác sĩ sẽ tiếp nhận hồ sơ." />
    {!editableIntakes.length ? <EmptyState icon={<Stethoscope className="size-6" />} title="Không có phiếu đang chỉnh sửa" description="Tạo phiếu tiếp nhận mới; hồ sơ đã chuyển bác sĩ được khóa để bảo toàn dữ liệu." action={<Link to="/reception/intakes/new" className="inline-flex h-10 items-center rounded-xl bg-[#5546e8] px-4 text-sm font-semibold text-white">Tạo phiếu tiếp nhận</Link>} /> : <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <section className="space-y-5"><label className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={labelClass}>Phiếu đang thao tác</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={inputClass}>{editableIntakes.map((item) => { const patient = patients.find((patientItem) => patientItem.id === item.patientId); return <option key={item.id} value={item.id}>{item.id} · {patient?.fullName}</option> })}</select></label>
        {categories.map((category) => <div key={category} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">{category}</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{dentalServices.filter((service) => service.category === category).map((service) => { const count = quantity(service.id); return <article key={service.id} className={`rounded-2xl border p-4 transition ${count ? 'border-[#6657e8] bg-[#faf9ff] ring-2 ring-[#6657e8]/10' : 'border-slate-100 bg-slate-50/60'}`}><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-slate-800">{service.name}</h4><p className="mt-1 text-xs text-slate-400">{service.unit}</p></div>{count ? <span className="grid size-6 place-items-center rounded-full bg-[#6657e8] text-white"><Check className="size-3.5" /></span> : null}</div><div className="mt-4 flex items-center justify-between"><p className="font-bold text-[#5546e8]">{formatCurrency(service.price)}</p><div className="flex items-center gap-2"><button type="button" aria-label={`Giảm ${service.name}`} onClick={() => changeQuantity(service.id, count - 1)} disabled={!count} className="grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-500 disabled:opacity-40"><Minus className="size-3.5" /></button><span className="w-5 text-center text-sm font-bold">{count}</span><button type="button" aria-label={`Thêm ${service.name}`} onClick={() => changeQuantity(service.id, count + 1)} className="grid size-8 place-items-center rounded-lg bg-[#5546e8] text-white"><Plus className="size-3.5" /></button></div></div></article> })}</div></div>)}
      </section>
      <aside className="h-fit space-y-5 xl:sticky xl:top-5"><div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"><h3 className="font-bold">Điều phối khám</h3><div className="mt-5 space-y-4"><label><span className={labelClass}>Phòng khám *</span><select value={intake?.roomId ?? ''} onChange={(event) => update({ roomId: event.target.value, status: 'DRAFT' })} className={inputClass}><option value="">Chọn phòng</option>{clinicRooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label><label><span className={labelClass}>Bác sĩ *</span><select value={intake?.doctorId ?? ''} onChange={(event) => update({ doctorId: event.target.value, status: 'DRAFT' })} className={inputClass}><option value="">Chọn bác sĩ</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}</select></label></div></div><div className="rounded-3xl bg-[#17182b] p-5 text-white shadow-xl"><p className="text-sm text-white/60">Tạm tính</p><p className="mt-2 text-3xl font-bold">{formatCurrency(total)}</p><p className="mt-2 text-xs text-white/45">{intake?.services.reduce((sum, item) => sum + item.quantity, 0) ?? 0} hạng mục đã chọn</p><Button type="button" disabled={!intake?.services.length || !intake.roomId || !intake.doctorId} onClick={save} className="mt-5 h-11 w-full rounded-xl bg-[#ff6f76] hover:bg-[#ef6068]">Lưu & xem phiếu</Button></div></aside>
    </div>}
  </>
}
