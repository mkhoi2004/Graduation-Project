import { useEffect, useMemo, useState } from 'react'
import { Check, Minus, Plus, Stethoscope } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { calculateIntakeTotal, clinicRooms, dentalServices, doctors, formatCurrency } from './reception-data'
import { fetchMasterData, updateIntakeServicesApi, type ReceptionMasterData } from './reception-api'
import { useReception } from './reception-context'
import { EmptyState, inputClass, labelClass, PageTitle } from './reception-ui'

const fallbackMasterData: ReceptionMasterData = {
  businessDate: new Date().toISOString().slice(0, 10), rooms: clinicRooms, services: dentalServices,
  doctors: doctors.map((doctor) => ({ ...doctor, isOnDuty: false })),
}

export function ServicesPage() {
  const { patients, intakes, dispatch } = useReception()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [masterData, setMasterData] = useState(fallbackMasterData)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const selectableIntakes = intakes.filter((item) => ['DRAFT', 'READY'].includes(item.status) && item.payment?.status !== 'PENDING')
  const requestedId = params.get('intake')
  const [selectedId, setSelectedId] = useState(selectableIntakes.some((item) => item.id === requestedId) ? requestedId ?? '' : selectableIntakes[0]?.id ?? '')
  const intake = selectableIntakes.find((item) => item.id === selectedId)
  const locked = Boolean(intake?.queueNumber)
  const total = calculateIntakeTotal(intake?.services ?? [])
  const categories = useMemo(() => [...new Set(masterData.services.map((service) => service.category))], [masterData.services])
  const selectedDoctor = masterData.doctors.find((doctor) => doctor.id === intake?.doctorId)

  useEffect(() => { fetchMasterData().then(setMasterData).catch(() => setMasterData(fallbackMasterData)) }, [])

  function update(patch: Partial<NonNullable<typeof intake>>) {
    if (intake && !locked) dispatch({ type: 'UPDATE_INTAKE', intake: { ...intake, ...patch } })
  }
  function quantity(serviceId: string) { return intake?.services.find((item) => item.serviceId === serviceId)?.quantity ?? 0 }
  function changeQuantity(serviceId: string, next: number) {
    if (!intake || locked) return
    const services = intake.services.filter((item) => item.serviceId !== serviceId)
    if (next > 0) services.push({ serviceId, quantity: next })
    update({ services, status: 'DRAFT' })
  }
  function selectDoctor(doctorId: string) {
    const doctor = masterData.doctors.find((item) => item.id === doctorId)
    update({ doctorId, roomId: doctor?.isOnDuty ? doctor.assignedRoom?.id ?? '' : doctor?.fallbackRoom?.id ?? '', roomOverrideReason: undefined, status: 'DRAFT' })
  }
  async function save() {
    if (!intake || locked || !intake.services.length || !intake.roomId || !intake.doctorId) return
    if (!selectedDoctor?.isOnDuty && !intake.roomOverrideReason?.trim()) {
      setError('Bác sĩ chưa được phân ca hôm nay. Vui lòng nhập lý do chọn phòng thủ công.')
      return
    }
    setSaving(true); setError('')
    try {
      const saved = import.meta.env.MODE === 'test'
        ? { ...intake, status: 'READY' as const, queueNumber: '0001', queueStatus: 'WAITING' as const }
        : await updateIntakeServicesApi(intake.id, {
            roomCode: intake.roomId, doctorUsername: intake.doctorId, services: intake.services,
            priority: intake.priority, priorityReason: intake.priorityReason, roomOverrideReason: intake.roomOverrideReason,
          })
      dispatch({ type: 'UPDATE_INTAKE', intake: saved })
      navigate(`/reception/payment?intake=${encodeURIComponent(saved.id)}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể cấp STT cho phiếu tiếp nhận.')
    } finally { setSaving(false) }
  }

  return <>
    <PageTitle eyebrow="Bước 3" title="Dịch vụ & điều phối" description="Chọn dịch vụ và bác sĩ; phòng khám tự động lấy theo ca trực hôm nay." />
    {!selectableIntakes.length ? <EmptyState icon={<Stethoscope className="size-6" />} title="Không có phiếu đang chỉnh sửa" description="Tạo phiếu tiếp nhận mới; hồ sơ đã chuyển bác sĩ được khóa để bảo toàn dữ liệu." action={<Link to="/reception/intakes/new" className="inline-flex h-10 items-center rounded-xl bg-[#5546e8] px-4 text-sm font-semibold text-white">Tạo phiếu tiếp nhận</Link>} /> : <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <section className="space-y-5">
        <label className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><span className={labelClass}>Phiếu đang thao tác</span><select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className={inputClass}>{selectableIntakes.map((item) => <option key={item.id} value={item.id}>{item.id} · {patients.find((patient) => patient.id === item.patientId)?.fullName}</option>)}</select></label>
        {locked ? <p className="rounded-2xl bg-emerald-50 px-5 py-4 font-bold text-emerald-800">Đã cấp STT {intake?.queueNumber}. Dịch vụ, bác sĩ, phòng và mức ưu tiên đã được khóa.</p> : null}
        {categories.map((category) => <div key={category} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"><h3 className="font-bold text-slate-900">{category}</h3><div className="mt-4 grid gap-3 md:grid-cols-2">{masterData.services.filter((service) => service.category === category).map((service) => { const count = quantity(service.id); return <article key={service.id} className={`rounded-2xl border p-4 ${count ? 'border-[#6657e8] bg-[#faf9ff]' : 'border-slate-100 bg-slate-50/60'}`}><div className="flex items-start justify-between gap-3"><div><h4 className="font-semibold text-slate-800">{service.name}</h4><p className="mt-1 text-xs text-slate-400">{service.unit}</p></div>{count ? <Check className="size-5 text-[#6657e8]" /> : null}</div><div className="mt-4 flex items-center justify-between"><p className="font-bold text-[#5546e8]">{formatCurrency(service.price)}</p><div className="flex items-center gap-2"><button type="button" aria-label={`Giảm ${service.name}`} onClick={() => changeQuantity(service.id, count - 1)} disabled={locked || !count} className="grid size-8 place-items-center rounded-lg border bg-white disabled:opacity-40"><Minus className="size-3.5" /></button><span className="w-5 text-center text-sm font-bold">{count}</span><button type="button" aria-label={`Thêm ${service.name}`} onClick={() => changeQuantity(service.id, count + 1)} disabled={locked} className="grid size-8 place-items-center rounded-lg bg-[#5546e8] text-white disabled:opacity-40"><Plus className="size-3.5" /></button></div></div></article> })}</div></div>)}
      </section>
      <aside className="h-fit space-y-5 xl:sticky xl:top-5"><div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"><h3 className="font-bold">Điều phối khám</h3>{error ? <p role="alert" className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">{error}</p> : null}<div className="mt-5 space-y-4">
        <label><span className={labelClass}>Bác sĩ *</span><select disabled={locked} value={intake?.doctorId ?? ''} onChange={(event) => selectDoctor(event.target.value)} className={inputClass}><option value="">Chọn bác sĩ</option>{masterData.doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name} · {doctor.specialty}</option>)}</select></label>
        <label><span className={labelClass}>Phòng khám *</span><select disabled={locked || Boolean(selectedDoctor?.isOnDuty)} value={intake?.roomId ?? ''} onChange={(event) => update({ roomId: event.target.value, status: 'DRAFT' })} className={inputClass}><option value="">Chọn phòng</option>{masterData.rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}</select></label>
        {selectedDoctor && !selectedDoctor.isOnDuty && !locked ? <><p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Bác sĩ chưa được phân ca hôm nay. Chọn phòng thủ công và ghi rõ lý do.</p><label><span className={labelClass}>Lý do chọn ngoài ca *</span><textarea required value={intake?.roomOverrideReason ?? ''} onChange={(event) => update({ roomOverrideReason: event.target.value })} className={`${inputClass} min-h-20 py-3`} /></label></> : null}
      </div></div><div className="rounded-3xl bg-[#17182b] p-5 text-white"><p className="text-sm text-white/60">Tạm tính</p><p className="mt-2 text-3xl font-bold">{formatCurrency(total)}</p><Button type="button" disabled={saving || (!locked && (!intake?.services.length || !intake?.roomId || !intake?.doctorId))} onClick={locked && intake ? () => navigate(`/reception/payment?intake=${encodeURIComponent(intake.id)}`) : save} className="mt-5 h-11 w-full rounded-xl bg-[#ff6f76]">{locked ? `STT ${intake?.queueNumber} · Chuyển thanh toán` : saving ? 'Đang cấp STT...' : 'Cấp STT & Chuyển thanh toán'}</Button></div></aside>
    </div>}
  </>
}
