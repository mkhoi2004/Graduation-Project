import { useState, type FormEvent } from 'react'
import { ClipboardPlus, UsersRound } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { createDailyCode, type Intake } from './reception-data'
import { useReception } from './reception-context'
import { EmptyState, inputClass, labelClass, PageTitle } from './reception-ui'

export function NewIntakePage() {
  const { patients, intakes, dispatch } = useReception()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [patientId, setPatientId] = useState(params.get('patient') ?? patients[0]?.id ?? '')
  const [symptoms, setSymptoms] = useState('')
  const [priority, setPriority] = useState<Intake['priority']>('Thường')

  function submit(event: FormEvent) {
    event.preventDefault()
    const intake: Intake = { id: createDailyCode('TNK', intakes.map((item) => item.id)), patientId, symptoms, priority, services: [], roomId: '', doctorId: '', status: 'DRAFT', createdAt: new Date().toISOString() }
    dispatch({ type: 'ADD_INTAKE', intake })
    navigate(`/reception/services?intake=${encodeURIComponent(intake.id)}`)
  }

  return <>
    <PageTitle eyebrow="Bước 2" title="Tạo phiếu tiếp nhận" description="Mỗi lần bệnh nhân đến khám sẽ có một mã TNK riêng để theo dõi quá trình thực hiện." />
    {!patients.length ? <EmptyState icon={<UsersRound className="size-6" />} title="Cần có hồ sơ bệnh nhân" description="Hãy tạo bệnh nhân trước khi lập phiếu tiếp nhận." action={<Link to="/reception/patients" className="inline-flex h-10 items-center rounded-xl bg-[#5546e8] px-4 text-sm font-semibold text-white">Tạo bệnh nhân</Link>} /> : <form onSubmit={submit} className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-center gap-3"><div className="grid size-11 place-items-center rounded-2xl bg-[#f0efff] text-[#5546e8]"><ClipboardPlus className="size-5" /></div><div><h3 className="font-bold">Thông tin lần tiếp nhận</h3><p className="text-sm text-slate-400">Mã TNK được sinh tự động khi lưu</p></div></div><div className="mt-7 grid gap-5 sm:grid-cols-2"><label className="sm:col-span-2"><span className={labelClass}>Bệnh nhân *</span><select required value={patientId} onChange={(event) => setPatientId(event.target.value)} className={inputClass}>{patients.map((patient) => <option key={patient.id} value={patient.id}>{patient.fullName} · {patient.phone} · {patient.id}</option>)}</select></label><label className="sm:col-span-2"><span className={labelClass}>Triệu chứng / nhu cầu ban đầu *</span><textarea required value={symptoms} onChange={(event) => setSymptoms(event.target.value)} className={`${inputClass} min-h-28 py-3`} placeholder="Ví dụ: đau răng hàm phải 2 ngày, ê buốt khi uống lạnh..." /></label><label><span className={labelClass}>Mức độ ưu tiên</span><select value={priority} onChange={(event) => setPriority(event.target.value as Intake['priority'])} className={inputClass}><option>Thường</option><option>Ưu tiên</option><option>Khẩn cấp</option></select></label><label><span className={labelClass}>Mã dự kiến</span><input readOnly value={createDailyCode('TNK', intakes.map((item) => item.id))} className={`${inputClass} bg-slate-50 text-slate-500`} /></label></div><div className="mt-7 flex justify-end gap-3"><Button type="button" variant="outline" onClick={() => navigate('/reception/patients')} className="h-11 rounded-xl">Quay lại</Button><Button type="submit" className="h-11 rounded-xl bg-[#ff6f76] px-5 hover:bg-[#ef6068]">Tạo phiếu & chọn dịch vụ</Button></div></form>}
  </>
}
