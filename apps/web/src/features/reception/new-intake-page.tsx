import { useEffect, useState, type FormEvent } from 'react'
import { ClipboardPlus, UsersRound } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { createDailyCode, type Intake } from './reception-data'
import { createIntakeApi } from './reception-api'
import { useReception } from './reception-context'
import { EmptyState, inputClass, labelClass, PageTitle } from './reception-ui'

export function NewIntakePage() {
  const { patients, intakes, dispatch } = useReception()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [patientId, setPatientId] = useState(params.get('patient') ?? patients[0]?.id ?? '')
  const [symptoms, setSymptoms] = useState('')
  const [priority, setPriority] = useState<Intake['priority']>('Thường')
  const [priorityReason, setPriorityReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const requested = params.get('patient')
    if (requested && patients.some((p) => p.id === requested)) {
      setPatientId(requested)
    } else if (!patientId && patients.length > 0) {
      setPatientId(patients[0].id)
    }
  }, [params, patients, patientId])

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (!patientId) {
      setError('Vui lòng chọn hồ sơ bệnh nhân.')
      return
    }
    if (priority === 'Ưu tiên' && !priorityReason.trim()) {
      setError('Vui lòng nhập lý do ưu tiên.')
      return
    }
    setSaving(true)
    try {
      const localIntake: Intake = {
        id: createDailyCode('TNK', intakes.map((item) => item.id)), patientId, symptoms, priority,
        priorityReason: priority === 'Ưu tiên' ? priorityReason.trim() : undefined,
        services: [], roomId: '', doctorId: '', status: 'DRAFT', createdAt: new Date().toISOString(),
      }
      const intake = import.meta.env.MODE === 'test' ? localIntake : await createIntakeApi({
        patientCode: patientId, symptoms, priority, priorityReason: localIntake.priorityReason,
      })
      dispatch({ type: 'ADD_INTAKE', intake })
      navigate(`/reception/services?intake=${encodeURIComponent(intake.id)}`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể tạo phiếu tiếp nhận.')
    } finally { setSaving(false) }
  }

  return <>
    <PageTitle eyebrow="Bước 2" title="Tạo phiếu tiếp nhận" description="Mỗi lần bệnh nhân đến khám sẽ có một mã TNK riêng để theo dõi quá trình thực hiện." />
    {!patients.length ? <EmptyState icon={<UsersRound className="size-6" />} title="Cần có hồ sơ bệnh nhân" description="Hãy tạo bệnh nhân trước khi lập phiếu tiếp nhận." action={<Link to="/reception/patients" className="inline-flex h-10 items-center rounded-xl bg-[#5546e8] px-4 text-sm font-semibold text-white">Tạo bệnh nhân</Link>} /> :
      <form onSubmit={submit} className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-[#f0efff] text-[#5546e8]"><ClipboardPlus className="size-5" /></div><div><h3 className="font-bold">Thông tin lần tiếp nhận</h3><p className="text-sm text-slate-400">Mã TNK được sinh tự động khi lưu</p></div></div>
        {error ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        <div className="mt-7 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={labelClass}>Bệnh nhân *</span><select required value={patientId} onChange={(event) => setPatientId(event.target.value)} className={inputClass}>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · CCCD: {patient.citizenId || 'Chưa cập nhật'} · {patient.phone} · {patient.id}</option>)}</select></label>
          <label className="sm:col-span-2"><span className={labelClass}>Triệu chứng / nhu cầu ban đầu *</span><textarea aria-label="Triệu chứng / nhu cầu ban đầu" required value={symptoms} onChange={(event) => setSymptoms(event.target.value)} className={`${inputClass} min-h-28 py-3`} /></label>
          <label><span className={labelClass}>Mức độ ưu tiên</span><select aria-label="Mức độ ưu tiên" value={priority} onChange={(event) => setPriority(event.target.value as Intake['priority'])} className={inputClass}><option>Thường</option><option>Ưu tiên</option></select></label>
          <label><span className={labelClass}>Mã dự kiến</span><input readOnly value={createDailyCode('TNK', intakes.map((item) => item.id))} className={`${inputClass} bg-slate-50 text-slate-500`} /></label>
          {priority === 'Ưu tiên' ? <label className="sm:col-span-2"><span className={labelClass}>Lý do ưu tiên *</span><textarea aria-label="Lý do ưu tiên" aria-required="true" value={priorityReason} onChange={(event) => setPriorityReason(event.target.value)} className={`${inputClass} min-h-20 py-3`} maxLength={500} /></label> : null}
        </div>
        <div className="mt-7 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => navigate('/reception/patients')} className="h-11 rounded-xl">Quay lại</Button><Button type="submit" disabled={saving} className="h-11 rounded-xl bg-[#ff6f76] px-5 hover:bg-[#ef6068]">{saving ? 'Đang tạo...' : 'Tạo phiếu & chọn dịch vụ'}</Button></div>
      </form>}
  </>
}
