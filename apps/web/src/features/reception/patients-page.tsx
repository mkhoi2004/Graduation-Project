import { useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Pencil, Search, UserPlus, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { upsertPatient, type Gender, type PatientDraft } from './reception-data'
import { useReception } from './reception-context'
import { EmptyState, inputClass, labelClass, PageTitle } from './reception-ui'

const emptyDraft: PatientDraft = { fullName: '', dateOfBirth: '', gender: 'Nam', phone: '', address: '', note: '' }

export function PatientsPage() {
  const { patients, dispatch } = useReception()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<PatientDraft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [query, setQuery] = useState('')
  const [message, setMessage] = useState('')
  const filtered = useMemo(() => patients.filter((patient) => `${patient.fullName} ${patient.phone} ${patient.id}`.toLowerCase().includes(query.toLowerCase())), [patients, query])

  function setField<K extends keyof PatientDraft>(field: K, value: PatientDraft[K]) { setDraft((current) => ({ ...current, [field]: value })) }
  function editPatient(patient: typeof patients[number]) { setEditingId(patient.id); setDraft({ fullName: patient.fullName, dateOfBirth: patient.dateOfBirth, gender: patient.gender, phone: patient.phone, address: patient.address, note: patient.note }); setMessage(`Đang cập nhật ${patient.id}`); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const result = upsertPatient(patients, draft, undefined, editingId)
      dispatch({ type: 'UPSERT_PATIENT', patient: result.patient })
      setMessage(result.created ? `Đã tạo bệnh nhân ${result.patient.id}` : `Đã cập nhật hồ sơ ${result.patient.id} (không tạo trùng số điện thoại)`)
      setDraft(emptyDraft)
      setEditingId(undefined)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể lưu hồ sơ bệnh nhân.')
    }
  }

  return <>
    <PageTitle eyebrow="Bước 1" title="Hồ sơ bệnh nhân" description="Tạo bệnh nhân mới hoặc cập nhật hồ sơ có cùng số điện thoại trước khi lập phiếu tiếp nhận." />
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={submit} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#f0efff] text-[#5546e8]"><UserPlus className="size-5" /></div><div><h3 className="font-bold">Thông tin bệnh nhân</h3><p className="text-xs text-slate-400">Các trường có dấu * là bắt buộc</p></div></div>
        {message ? <p role="status" className="mt-5 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700"><CheckCircle2 className="size-4" />{message}</p> : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={labelClass}>Họ và tên *</span><input required value={draft.fullName} onChange={(event) => setField('fullName', event.target.value)} className={inputClass} placeholder="Ví dụ: Nguyễn Văn An" /></label>
          <label><span className={labelClass}>Ngày sinh *</span><input required type="date" value={draft.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} className={inputClass} /></label>
          <label><span className={labelClass}>Giới tính</span><select value={draft.gender} onChange={(event) => setField('gender', event.target.value as Gender)} className={inputClass}><option>Nam</option><option>Nữ</option><option>Khác</option></select></label>
          <label className="sm:col-span-2"><span className={labelClass}>Số điện thoại *</span><input required inputMode="tel" value={draft.phone} onChange={(event) => setField('phone', event.target.value)} className={inputClass} placeholder="0901 234 567" /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Địa chỉ</span><input value={draft.address} onChange={(event) => setField('address', event.target.value)} className={inputClass} placeholder="Địa chỉ liên hệ" /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Ghi chú</span><textarea value={draft.note} onChange={(event) => setField('note', event.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="Dị ứng, tiền sử hoặc lưu ý ban đầu" /></label>
        </div>
        <Button type="submit" className="mt-5 h-11 w-full rounded-xl bg-[#5546e8] hover:bg-[#4939d0]">{editingId ? 'Cập nhật hồ sơ bệnh nhân' : 'Lưu hồ sơ bệnh nhân'}</Button>
      </form>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">Danh sách bệnh nhân</h3><p className="mt-1 text-sm text-slate-400">{patients.length} hồ sơ đã lưu trên trình duyệt</p></div><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9 sm:w-64`} placeholder="Tìm tên, SĐT, mã..." /></div></div>
        <div className="mt-5">{filtered.length ? <div className="space-y-3">{filtered.map((patient) => <article key={patient.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-slate-900">{patient.fullName}</h4><span className="rounded-full bg-[#f0efff] px-2 py-1 text-[11px] font-bold text-[#5546e8]">{patient.id}</span></div><p className="mt-2 text-sm text-slate-500">{patient.phone} · {patient.gender} · {patient.dateOfBirth}</p><p className="mt-1 text-xs text-slate-400">{patient.address || 'Chưa có địa chỉ'}</p></div><div className="flex gap-2"><Button type="button" variant="outline" onClick={() => editPatient(patient)} className="h-9 rounded-xl"><Pencil className="size-4" />Sửa</Button><Button type="button" onClick={() => navigate(`/reception/intakes/new?patient=${encodeURIComponent(patient.id)}`)} className="h-9 rounded-xl bg-[#ff6f76] hover:bg-[#ef6068]">Tiếp nhận</Button></div></article>)}</div> : <EmptyState icon={<UsersRound className="size-6" />} title="Chưa có bệnh nhân" description="Tạo hồ sơ đầu tiên bằng biểu mẫu bên trái." />}</div>
      </section>
    </div>
  </>
}
