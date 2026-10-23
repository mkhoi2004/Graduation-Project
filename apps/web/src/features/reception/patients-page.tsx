import { useMemo, useState, type FormEvent } from 'react'
import { CheckCircle2, Pencil, Search, UserPlus, UsersRound } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { upsertPatient, validateCitizenId, type Gender, type Patient, type PatientDraft } from './reception-data'
import { createPatientApi, updatePatientApi } from './reception-api'
import { useReception } from './reception-context'
import { EmptyState, inputClass, labelClass, PageTitle } from './reception-ui'

const emptyDraft: PatientDraft = { fullName: '', dateOfBirth: '', gender: 'Nam', phone: '', citizenId: '', address: '', note: '' }

export function PatientsPage() {
  const { patients, dispatch } = useReception()
  const navigate = useNavigate()
  const [draft, setDraft] = useState<PatientDraft>(emptyDraft)
  const [editingId, setEditingId] = useState<string | undefined>()
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [lastSavedId, setLastSavedId] = useState<string | undefined>()
  const filtered = useMemo(() => {
    setPage(1)
    return patients.filter((patient) => `${patient.fullName} ${patient.phone} ${patient.citizenId ?? ''} ${patient.id}`.toLowerCase().includes(query.toLowerCase()))
  }, [patients, query])

  function setField<K extends keyof PatientDraft>(field: K, value: PatientDraft[K]) { setDraft((current) => ({ ...current, [field]: value })) }
  function editPatient(patient: typeof patients[number]) {
    setEditingId(patient.id)
    setDraft({
      fullName: patient.fullName,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      phone: patient.phone,
      citizenId: patient.citizenId ?? '',
      address: patient.address,
      note: patient.note,
    })
    setMessage(`Đang cập nhật ${patient.id}`)
    setError('')
    setLastSavedId(undefined)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function cancelEdit() {
    setEditingId(undefined)
    setDraft(emptyDraft)
    setMessage('')
    setError('')
  }
  async function submit(event: FormEvent) {
    event.preventDefault()
    setMessage('')
    setError('')
    setSaving(true)
    try {
      validateCitizenId(draft.citizenId, draft.dateOfBirth, draft.gender)

      let savedPatient: Patient
      if (import.meta.env.MODE === 'test') {
        const result = upsertPatient(patients, draft, undefined, editingId)
        savedPatient = result.patient
      } else {
        if (editingId) {
          savedPatient = await updatePatientApi(editingId, draft)
        } else {
          savedPatient = await createPatientApi(draft)
        }
      }
      dispatch({ type: 'UPSERT_PATIENT', patient: savedPatient })
      setLastSavedId(savedPatient.id)
      setMessage(editingId ? `Đã cập nhật hồ sơ ${savedPatient.id}` : `Đã tạo bệnh nhân ${savedPatient.id}`)
      setDraft(emptyDraft)
      setEditingId(undefined)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không thể lưu hồ sơ bệnh nhân.')
    } finally {
      setSaving(false)
    }
  }

  return <>
    <PageTitle eyebrow="Bước 1" title="Hồ sơ bệnh nhân" description="Tạo bệnh nhân mới hoặc cập nhật hồ sơ có cùng số điện thoại trước khi lập phiếu tiếp nhận." />
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <form onSubmit={submit} className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-xl bg-[#f0efff] text-[#5546e8]"><UserPlus className="size-5" /></div><div><h3 className="font-bold">Thông tin bệnh nhân</h3><p className="text-xs text-slate-400">Các trường có dấu * là bắt buộc</p></div></div>
        {error ? <p role="alert" className="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {message ? (
          <div role="status" className="mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            <span className="flex items-center gap-2"><CheckCircle2 className="size-4 shrink-0" />{message}</span>
            {lastSavedId ? (
              <Button type="button" size="sm" onClick={() => navigate(`/reception/intakes/new?patient=${encodeURIComponent(lastSavedId)}`)} className="h-8 rounded-lg bg-[#ff6f76] text-xs text-white hover:bg-[#ef6068]">
                Tiếp nhận ngay
              </Button>
            ) : null}
          </div>
        ) : null}
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className={labelClass}>Họ và tên *</span><input required value={draft.fullName} onChange={(event) => setField('fullName', event.target.value)} className={inputClass} placeholder="Ví dụ: Nguyễn Văn An" /></label>
          <label><span className={labelClass}>Ngày sinh *</span><input required type="date" value={draft.dateOfBirth} onChange={(event) => setField('dateOfBirth', event.target.value)} className={inputClass} /></label>
          <label><span className={labelClass}>Giới tính</span><select value={draft.gender} onChange={(event) => setField('gender', event.target.value as Gender)} className={inputClass}><option>Nam</option><option>Nữ</option><option>Khác</option></select></label>
          <label className="sm:col-span-2"><span className={labelClass}>Số điện thoại *</span><input required inputMode="tel" value={draft.phone} onChange={(event) => setField('phone', event.target.value)} className={inputClass} placeholder="0901 234 567" /></label>
          <label className="sm:col-span-2">
            <div className="flex items-center justify-between">
              <span className={labelClass}>Số CCCD (12 chữ số) *</span>
              <span className="text-[11px] text-slate-400">3 số tỉnh · 1 số thế kỷ/giới tính · 2 số năm sinh · 6 số ngẫu nhiên</span>
            </div>
            <input
              required
              maxLength={12}
              pattern="\d{12}"
              inputMode="numeric"
              value={draft.citizenId}
              onChange={(event) => setField('citizenId', event.target.value.replace(/\D/g, ''))}
              className={inputClass}
              placeholder="Ví dụ: 001092123457 (Bắt buộc theo quy định)"
            />
          </label>
          <label className="sm:col-span-2"><span className={labelClass}>Địa chỉ</span><input value={draft.address} onChange={(event) => setField('address', event.target.value)} className={inputClass} placeholder="Địa chỉ liên hệ" /></label>
          <label className="sm:col-span-2"><span className={labelClass}>Ghi chú</span><textarea value={draft.note} onChange={(event) => setField('note', event.target.value)} className={`${inputClass} min-h-24 py-3`} placeholder="Dị ứng, tiền sử hoặc lưu ý ban đầu" /></label>
        </div>
        <div className="mt-5 flex gap-2">
          {editingId ? (
            <Button type="button" variant="outline" onClick={cancelEdit} className="h-11 rounded-xl">
              Hủy
            </Button>
          ) : null}
          <Button type="submit" disabled={saving} className="h-11 flex-1 rounded-xl bg-[#5546e8] hover:bg-[#4939d0]">
            {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật hồ sơ bệnh nhân' : 'Lưu hồ sơ bệnh nhân')}
          </Button>
        </div>
      </form>

      <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-bold">Danh sách bệnh nhân</h3><p className="mt-1 text-sm text-slate-400">{patients.length} hồ sơ đã lưu trên trình duyệt (cố định 10 dòng/trang)</p></div><div className="relative"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} className={`${inputClass} pl-9 sm:w-64`} placeholder="Tìm tên, CCCD, SĐT, mã..." /></div></div>
        <div className="mt-5">{filtered.length ? (
          <div className="space-y-3">
            {filtered.slice((page - 1) * 10, page * 10).map((patient) => (
              <article key={patient.id} className="flex flex-col gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="font-semibold text-slate-900">{patient.fullName}</h4>
                    <span className="rounded-full bg-[#f0efff] px-2 py-1 text-[11px] font-bold text-[#5546e8]">{patient.id}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-600">
                    <span className="font-semibold text-slate-900">CCCD:</span>{' '}
                    <span className="font-mono font-medium text-[#5546e8]">{patient.citizenId || 'Chưa cập nhật'}</span>
                    {' · '}
                    <span className="font-mono">{patient.phone}</span>
                    {' · '}
                    {patient.gender}
                    {' · '}
                    {patient.dateOfBirth}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{patient.address || 'Chưa có địa chỉ'}</p>
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={() => editPatient(patient)} className="h-9 rounded-xl"><Pencil className="size-4" />Sửa</Button>
                  <Button type="button" onClick={() => navigate(`/reception/intakes/new?patient=${encodeURIComponent(patient.id)}`)} className="h-9 rounded-xl bg-[#ff6f76] hover:bg-[#ef6068]">Tiếp nhận</Button>
                </div>
              </article>
            ))}
            {filtered.length > 10 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>Hiển thị {(page - 1) * 10 + 1} - {Math.min(page * 10, filtered.length)} trên {filtered.length} bệnh nhân</span>
                <div className="flex items-center gap-2">
                  <button type="button" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">Trước</button>
                  <span className="font-semibold text-slate-700">Trang {page} / {Math.max(1, Math.ceil(filtered.length / 10))}</span>
                  <button type="button" disabled={page >= Math.ceil(filtered.length / 10)} onClick={() => setPage((p) => p + 1)} className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50 disabled:opacity-40">Sau</button>
                </div>
              </div>
            )}
          </div>
        ) : <EmptyState icon={<UsersRound className="size-6" />} title="Chưa có bệnh nhân" description="Tạo hồ sơ đầu tiên bằng biểu mẫu bên trái." />}</div>
      </section>
    </div>
  </>
}
