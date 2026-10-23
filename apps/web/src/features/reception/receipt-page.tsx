import { useEffect, useMemo, useState } from 'react'
import { CreditCard, FileSpreadsheet, FileText, Printer, RotateCcw, Send, XCircle } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { triggerPrint } from '@/lib/print-utils'
import { cancelIntakeApi, fetchIntakes, recordIntakePrintApi } from './reception-api'
import { type Intake } from './reception-data'
import { useReception } from './reception-context'
import { downloadReceiptWorkbook } from './receipt-excel'
import { EmptyState, inputClass, labelClass, PageTitle, StatusPill } from './reception-ui'
import { ReceptionPrintView } from './reception-print-view'

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]))
  return `${value.year}-${value.month}-${value.day}`
}

export function ReceiptPage() {
  const { patients, intakes, dispatch } = useReception()
  const [params] = useSearchParams()
  const ticketed = intakes.filter((item) => item.queueNumber)
  const requestedId = params.get('intake')
  const [selectedId, setSelectedId] = useState(ticketed.some((item) => item.id === requestedId) ? requestedId ?? '' : ticketed[0]?.id ?? '')
  const [date, setDate] = useState(today())
  const [roomCode, setRoomCode] = useState('')
  const [priority, setPriority] = useState<'' | Intake['priority']>('')
  const [notice, setNotice] = useState('')
  const [isPrinting, setIsPrinting] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [showCancel, setShowCancel] = useState(false)
  const intake = ticketed.find((item) => item.id === selectedId) ?? ticketed[0]
  const patient = patients.find((item) => item.id === intake?.patientId)
  const filtered = useMemo(() => ticketed.filter((item) =>
    (!date || !item.queueDate || item.queueDate === date) &&
    (!roomCode || item.roomId === roomCode) &&
    (!priority || item.priority === priority),
  ), [ticketed, date, roomCode, priority])
  const rooms = [...new Map(ticketed.map((item) => [item.roomId, item.roomName || item.roomId])).entries()].filter(([id]) => id)
  const callingByRoom = [...new Map(ticketed.filter((item) => item.currentCallingNumber).map((item) => [item.roomId, { name: item.roomName || item.roomId, number: item.currentCallingNumber }])).values()]

  async function applyFilters() {
    if (import.meta.env.MODE === 'test') return
    try {
      const result = await fetchIntakes({ date: date || undefined, roomCode: roomCode || undefined, priority: priority || undefined })
      dispatch({ type: 'SET_STATE', state: { patients, intakes: result } })
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Không thể lọc danh sách.') }
  }
  async function handleExportExcel() {
    if (!patient || !intake) return
    setIsPrinting(true); setNotice('')
    try { await downloadReceiptWorkbook(patient, intake); setNotice('Đã tải xuống file Excel phiếu thu tiền theo mẫu.') }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Không thể tạo file Excel.') }
    finally { setIsPrinting(false) }
  }
  async function recordPrintAndPrint() {
    if (!intake) return
    setIsPrinting(true); setNotice('')
    try {
      const meta = import.meta.env.MODE === 'test'
        ? { isCopy: Boolean(intake.printCount), printCount: (intake.printCount ?? 0) + 1 }
        : await recordIntakePrintApi(intake.id)
      dispatch({ type: 'UPDATE_INTAKE', intake: { ...intake, isCopy: meta.isCopy, printCount: meta.printCount } })
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
      triggerPrint()
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Không thể ghi nhận lần in.') }
    finally { setIsPrinting(false) }
  }
  async function confirmCancel() {
    if (!intake || !cancelReason.trim()) { setNotice('Vui lòng nhập lý do hủy phiếu tiếp nhận.'); return }
    try {
      const result = import.meta.env.MODE === 'test'
        ? { status: 'CANCELLED_RECEPTION' as const, queueStatus: 'CANCELLED' as const }
        : await cancelIntakeApi(intake.id, cancelReason.trim())
      dispatch({ type: 'UPDATE_INTAKE', intake: { ...intake, status: result.status, queueStatus: result.queueStatus } })
      setNotice(`Đã hủy ${intake.id}; STT ${intake.queueNumber} không được tái sử dụng.`)
      setShowCancel(false); setCancelReason('')
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : 'Không thể hủy phiếu.') }
  }

  useEffect(() => {
    void applyFilters()
  }, [date, roomCode, priority])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'p' && patient && intake) {
        event.preventDefault(); setShowPrintModal(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [patient, intake])

  return <>
    <PageTitle eyebrow="Phiếu tiếp nhận" title="Hàng chờ & phiếu có STT" description="Theo dõi STT theo phòng, in đúng STT đã cấp và hủy/làm lại phiếu còn chờ." />
    {notice ? <p role="status" className="mb-5 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-700">{notice}</p> : null}
    <section className="mb-5 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
      <label><span className={labelClass}>Ngày</span><input aria-label="Ngày" type="date" value={date} onChange={(event) => setDate(event.target.value)} className={inputClass} /></label>
      <label><span className={labelClass}>Phòng khám</span><select aria-label="Phòng khám" value={roomCode} onChange={(event) => setRoomCode(event.target.value)} className={inputClass}><option value="">Tất cả</option>{rooms.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label><span className={labelClass}>Mức ưu tiên</span><select aria-label="Mức ưu tiên" value={priority} onChange={(event) => setPriority(event.target.value as '' | Intake['priority'])} className={inputClass}><option value="">Tất cả</option><option>Thường</option><option>Ưu tiên</option></select></label>
      <Button type="button" onClick={applyFilters} className="mt-auto h-11">Lọc danh sách</Button>
    </section>
    {callingByRoom.length ? <div className="mb-5 grid gap-3 sm:grid-cols-3">{callingByRoom.map((room) => <div key={room.name} className="rounded-2xl bg-indigo-50 p-4 text-indigo-900"><p className="text-xs font-bold uppercase">{room.name}</p><p className="mt-1 text-lg font-black">STT đang gọi: {room.number}</p></div>)}</div> : null}
    {!ticketed.length ? <EmptyState icon={<FileText className="size-6" />} title="Chưa có phiếu được cấp STT" description="Hãy tạo phiếu, chọn dịch vụ và bác sĩ để hệ thống cấp STT." action={<Link to="/reception/intakes/new" className="inline-flex h-10 items-center rounded-xl bg-[#5546e8] px-4 text-sm font-semibold text-white">Tạo tiếp nhận</Link>} /> : <>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="p-3">STT</th><th className="p-3">Bệnh nhân</th><th className="p-3">Mức ưu tiên</th><th className="p-3">Phòng khám</th><th className="p-3">Bác sĩ</th><th className="p-3">Trạng thái</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} onClick={() => setSelectedId(item.id)} className={`cursor-pointer border-t ${item.id === intake?.id ? 'bg-indigo-50' : ''}`}><td className="p-3 font-mono text-lg font-black">{item.queueNumber}</td><td className="p-3">{item.patientName || patients.find((value) => value.id === item.patientId)?.fullName}<p className="text-xs text-slate-400">{item.id}</p></td><td className="p-3">{item.priority === 'Ưu tiên' ? <span className="rounded-full bg-amber-100 px-2 py-1 font-bold text-amber-800">Ưu tiên</span> : 'Thường'}{item.priorityReason ? <p className="mt-1 text-xs">{item.priorityReason}</p> : null}</td><td className="p-3">{item.roomName || item.roomId}</td><td className="p-3">{item.doctorName || item.doctorId}</td><td className="p-3"><StatusPill status={item.status} /></td></tr>)}</tbody></table></div>
      {intake && patient ? <article className="mt-5 rounded-2xl border border-slate-200 bg-white p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-sm text-slate-500">{intake.id} · {patient.fullName}</p><p className="mt-1 font-mono text-4xl font-black text-[#5546e8]">{intake.queueNumber}</p><p className="mt-1 font-semibold">Mức ưu tiên: {intake.priority}{intake.priorityReason ? ` — ${intake.priorityReason}` : ''}</p></div><div className="flex flex-wrap items-center gap-2">{intake.status === 'READY' ? <Link to={`/reception/payment?intake=${encodeURIComponent(intake.id)}`} className="inline-flex items-center gap-2 rounded-xl bg-[#ff6f76] px-4 py-2 text-sm font-semibold text-white hover:bg-[#ef6068]"><CreditCard className="size-4" />Thanh toán ngay</Link> : null}{intake.status === 'PAID' ? <Link to="/reception/transfer" className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"><Send className="size-4" />Chuyển bác sĩ</Link> : null}<Button type="button" variant="outline" onClick={handleExportExcel} disabled={isPrinting}><FileSpreadsheet className="size-4" />Xuất Excel</Button><Button type="button" onClick={() => setShowPrintModal(true)}><Printer className="size-4" />In phiếu</Button>{intake.queueStatus === 'WAITING' ? <Button type="button" variant="outline" onClick={() => setShowCancel(true)} className="text-rose-700"><XCircle className="size-4" />Hủy phiếu</Button> : null}{intake.status === 'CANCELLED_RECEPTION' ? <Link to={`/reception/intakes/new?patient=${encodeURIComponent(intake.patientId)}`} className="inline-flex items-center gap-2 rounded-lg bg-[#ff6f76] px-4 text-sm font-semibold text-white"><RotateCcw className="size-4" />Làm lại</Link> : null}</div></div></article> : null}
    </>}
    {showCancel ? <div role="dialog" aria-label="Hủy phiếu tiếp nhận" className="fixed inset-0 z-40 grid place-items-center bg-slate-950/50 p-4"><div className="w-full max-w-md rounded-2xl bg-white p-6"><h3 className="text-lg font-bold">Xác nhận hủy phiếu</h3><label className="mt-4 block"><span className={labelClass}>Lý do hủy *</span><textarea aria-label="Lý do hủy" value={cancelReason} onChange={(event) => setCancelReason(event.target.value)} className={`${inputClass} min-h-24 py-3`} /></label><div className="mt-4 flex justify-end gap-2"><Button variant="outline" onClick={() => setShowCancel(false)}>Đóng</Button><Button onClick={confirmCancel} disabled={!cancelReason.trim()} className="bg-rose-600">Xác nhận hủy</Button></div></div></div> : null}
    {showPrintModal && patient && intake ? <ReceptionPrintView patient={patient} intake={intake} isCopy={Boolean(intake.printCount)} onClose={() => setShowPrintModal(false)} onExportExcel={handleExportExcel} onConfirmPrint={recordPrintAndPrint} /> : null}
  </>
}
