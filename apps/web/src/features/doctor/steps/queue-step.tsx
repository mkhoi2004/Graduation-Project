import { useState } from 'react'
import { AlertCircle, Bell, PlayCircle, RefreshCw, Search, Users, UserX } from 'lucide-react'
import { callNextPatientApi, markAbsentApi } from '../doctor-api'
import { useDoctor } from '../doctor-context'
import { AbsentModal } from '../components/absent-modal'
import { EmptyState, PageTitle, inputClass } from '../../reception/reception-ui'

export function QueueStep() {
  const { queue, queueSummary, currentExam, activeRoomCode, dispatch, refreshQueue } = useDoctor()
  const [search, setSearch] = useState('')
  const [calling, setCalling] = useState(false)
  const [showAbsent, setShowAbsent] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const isExamInProgress = currentExam?.status === 'IN_PROGRESS'
  const canMarkAbsent = Boolean(currentExam && isExamInProgress && !currentExam.supplies.length && !currentExam.result && !currentExam.printHistories.length)
  const filteredQueue = queue.filter((patient) => {
    const query = search.toLowerCase().trim()
    return !query || patient.patientName.toLowerCase().includes(query) || patient.patientCode.toLowerCase().includes(query) || patient.phone.includes(query)
  })

  async function handleCallNext() {
    if (isExamInProgress) { setActionError('Bác sĩ đang có bệnh nhân Đang khám. Vui lòng hoàn thành, Ngừng khám hoặc đánh dấu Vắng mặt trước khi gọi tiếp.'); return }
    try {
      setCalling(true); setActionError(null)
      const result = await callNextPatientApi()
      if (!result.nextExamination) { setActionError(result.message); await refreshQueue(); return }
      dispatch({ type: 'SET_CURRENT_EXAM', exam: result.nextExamination })
      await refreshQueue()
      dispatch({ type: 'SET_STEP', step: 2 })
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không thể gọi bệnh nhân tiếp theo.') }
    finally { setCalling(false) }
  }

  async function handleAbsent() {
    if (!currentExam) return
    try {
      const result = await markAbsentApi(currentExam.id)
      dispatch({ type: 'SET_CURRENT_EXAM', exam: result.nextExamination })
      dispatch({ type: 'SET_STEP', step: result.nextExamination ? 2 : 1 })
      setActionError(result.nextExamination ? null : result.message)
      setShowAbsent(false)
      await refreshQueue()
    } catch (cause) { setActionError(cause instanceof Error ? cause.message : 'Không thể đánh dấu Vắng mặt.'); setShowAbsent(false) }
  }

  return <div>
    <PageTitle eyebrow="Bước 1 / Phân hệ Bác sĩ" title="Hàng chờ theo STT" description={`Phòng ${queueSummary.roomName || currentExam?.intake.roomName || activeRoomCode}. Hệ thống luôn gọi STT nhỏ nhất; mức ưu tiên chỉ để bác sĩ nhận biết.`} action={<div className="flex gap-2"><button type="button" onClick={() => void refreshQueue()} className="inline-flex items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold"><RefreshCw className="size-4" />Làm mới</button><button type="button" disabled={calling || !queue.length || isExamInProgress} onClick={handleCallNext} className="inline-flex items-center gap-2 rounded-xl bg-[#5546e8] px-5 py-2 text-sm font-bold text-white disabled:bg-slate-300"><Bell className="size-4" />{calling ? 'Đang gọi...' : 'Gọi STT tiếp theo'}</button></div>} />
    {queueSummary.priorityWaitingCount > 0 ? <p className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 font-bold text-amber-800">Có {queueSummary.priorityWaitingCount} bệnh nhân ưu tiên đang chờ</p> : null}
    {isExamInProgress && currentExam ? <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-blue-200 bg-blue-50 p-4"><div className="flex items-center gap-3"><PlayCircle className="size-8 text-blue-600" /><div><p className="text-sm font-bold text-blue-950">STT đang khám: {queueSummary.currentCallingNumber || '—'} · {currentExam.patient.fullName}</p><p className="text-xs text-blue-700">{currentExam.code} · {currentExam.intake.roomName}</p></div></div><div className="flex gap-2">{canMarkAbsent ? <button type="button" onClick={() => setShowAbsent(true)} className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-white px-4 py-2 text-sm font-bold text-amber-700"><UserX className="size-4" />Vắng mặt</button> : null}<button type="button" onClick={() => dispatch({ type: 'SET_STEP', step: 2 })} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">Tiếp tục khám</button></div></div> : null}
    {actionError ? <div role="alert" className="mb-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700"><AlertCircle className="size-4" />{actionError}</div> : null}
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div className="relative max-w-sm flex-1"><Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm bệnh nhân..." className={`${inputClass} pl-10`} /></div><p className="text-sm text-slate-600"><strong>{queueSummary.waitingCount}</strong> người đang chờ</p></div>
    {!filteredQueue.length ? <EmptyState icon={<Users className="size-6" />} title="Không còn bệnh nhân chờ" description="Hiện không còn phiếu Tiếp nhận nào được gán cho bác sĩ trong phòng hôm nay." /> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">STT</th><th className="p-3">Bệnh nhân</th><th className="p-3">Mức ưu tiên</th><th className="p-3">Triệu chứng</th><th className="p-3">Dịch vụ</th></tr></thead><tbody>{filteredQueue.map((patient) => <tr key={patient.id} className={`border-t ${patient.priority === 'Ưu tiên' ? 'bg-amber-50/70' : ''}`}><td className="p-3 font-mono text-xl font-black text-[#5546e8]">{patient.queueNumber}</td><td className="p-3 font-semibold">{patient.patientName}<p className="text-xs font-normal text-slate-400">{patient.patientCode}</p></td><td className="p-3">{patient.priority === 'Ưu tiên' ? <><span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-bold text-amber-900">Ưu tiên</span>{patient.priorityReason ? <p className="mt-2 max-w-xs text-xs text-amber-800">{patient.priorityReason}</p> : null}</> : 'Thường'}</td><td className="p-3 text-slate-600">{patient.symptoms || '—'}</td><td className="p-3">{patient.services.map((service) => <span key={service.code} className="mr-1 rounded bg-slate-100 px-2 py-1 text-xs">{service.name} × {service.quantity}</span>)}</td></tr>)}</tbody></table></div>}
    {showAbsent && currentExam ? <AbsentModal patientName={currentExam.patient.fullName} onClose={() => setShowAbsent(false)} onConfirm={handleAbsent} /> : null}
  </div>
}
