import { useEffect, useState } from 'react'
import { Banknote, CheckCircle2, CreditCard, LoaderCircle, Smartphone } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { calculateIntakeTotal, dentalServices, formatCurrency, currentIsoTimestamp, type IntakePayment } from './reception-data'
import { useReception } from './reception-context'
import { createMomoPayment, getMomoPaymentStatus, redirectToMomo } from './payment-api'
import { EmptyState, inputClass, labelClass, PageTitle } from './reception-ui'

export function PaymentPage() {
  const { patients, intakes, dispatch } = useReception()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const payableIntakes = intakes.filter((item) => item.status === 'READY')
  const requestedId = params.get('intake')
  const [selectedId, setSelectedId] = useState(payableIntakes.some((item) => item.id === requestedId) ? requestedId ?? '' : payableIntakes[0]?.id ?? '')
  const [method, setMethod] = useState<'CASH' | 'MOMO'>('CASH')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [notice, setNotice] = useState('')
  const intake = payableIntakes.find((item) => item.id === selectedId)
  const patient = patients.find((item) => item.id === intake?.patientId)
  const total = calculateIntakeTotal(intake?.services ?? [])
  const momoReturnError = params.get('momo') && params.get('momo') !== 'success' ? 'Thanh toán MoMo chưa thành công. Vui lòng thử lại.' : ''

  useEffect(() => {
    const result = params.get('momo')
    const orderId = params.get('orderId')
    if (!result || !orderId) return
    if (result !== 'success') return
    getMomoPaymentStatus(orderId).then((payment) => {
      const paidIntake = intakes.find((item) => item.id === payment.intakeCode)
      if (!paidIntake || payment.status !== 'PAID') throw new Error('Giao dịch chưa được MoMo xác nhận.')
      if (payment.amount !== calculateIntakeTotal(paidIntake.services)) throw new Error('Số tiền giao dịch không khớp với tổng dịch vụ.')
      dispatch({ type: 'UPDATE_INTAKE', intake: { ...paidIntake, status: 'PAID', payment: { method: 'MOMO', status: 'PAID', orderId, paidAt: currentIsoTimestamp() } } })
      navigate(`/reception/receipt?intake=${encodeURIComponent(paidIntake.id)}`, { replace: true })
    }).catch((error: unknown) => setNotice(error instanceof Error ? error.message : 'Không thể xác nhận giao dịch MoMo.'))
  }, [dispatch, intakes, navigate, params])

  async function confirmPayment() {
    if (!intake || intake.status !== 'READY') return
    if (intake.payment?.status === 'PENDING') { setNotice('Phiếu đang có giao dịch MoMo chờ xác nhận.'); return }
    setNotice('')
    if (method === 'CASH') {
      const payment: IntakePayment = { method: 'CASH', status: 'PAID', paidAt: currentIsoTimestamp() }
      dispatch({ type: 'UPDATE_INTAKE', intake: { ...intake, status: 'PAID', payment } })
      navigate(`/reception/receipt?intake=${encodeURIComponent(intake.id)}`)
      return
    }
    setIsSubmitting(true)
    try {
      const checkout = await createMomoPayment({ intakeCode: intake.id, amount: total })
      dispatch({ type: 'UPDATE_INTAKE', intake: { ...intake, payment: { method: 'MOMO', status: 'PENDING', orderId: checkout.orderId } } })
      redirectToMomo(checkout.payUrl)
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Không thể tạo giao dịch MoMo.')
      setIsSubmitting(false)
    }
  }

  return <>
    <PageTitle eyebrow="Bước 4" title="Thanh toán" description="Xác nhận thu tiền mặt hoặc thanh toán an toàn qua MoMo trước khi lập phiếu tiếp nhận." />
    {notice || momoReturnError ? <p role="status" className="mb-5 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{notice || momoReturnError}</p> : null}
    {!intake ? <EmptyState icon={<CreditCard className="size-6" />} title="Chưa có phiếu chờ thanh toán" description="Hãy hoàn thành bước Dịch vụ & điều phối trước." /> : <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <label className="block"><span className={labelClass}>Phiếu tiếp nhận</span><select className={inputClass} value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>{payableIntakes.map((item) => <option key={item.id} value={item.id}>{item.id} · {patients.find((person) => person.id === item.patientId)?.fullName}</option>)}</select></label>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <label className={`cursor-pointer rounded-2xl border-2 p-5 transition ${method === 'CASH' ? 'border-[#5546e8] bg-[#f4f2ff]' : 'border-slate-200'}`}><input className="sr-only" type="radio" name="payment" checked={method === 'CASH'} onChange={() => setMethod('CASH')} /><Banknote className="size-7 text-[#5546e8]" /><strong className="mt-4 block">Tiền mặt</strong><span className="mt-1 block text-sm text-slate-500">Nhân viên xác nhận đã thu đủ tiền tại quầy.</span></label>
          <label className={`cursor-pointer rounded-2xl border-2 p-5 transition ${method === 'MOMO' ? 'border-[#a50064] bg-pink-50' : 'border-slate-200'}`}><input className="sr-only" type="radio" name="payment" checked={method === 'MOMO'} onChange={() => setMethod('MOMO')} /><Smartphone className="size-7 text-[#a50064]" /><strong className="mt-4 block">MoMo</strong><span className="mt-1 block text-sm text-slate-500">Mở cổng MoMo sandbox và quay lại sau khi thành công.</span></label>
        </div>
        <div className="mt-6 rounded-2xl bg-slate-50 p-5"><p className="text-sm font-semibold">{patient?.fullName}</p><div className="mt-4 space-y-2">{intake.services.map((selection) => { const service = dentalServices.find((item) => item.id === selection.serviceId); return <div key={selection.serviceId} className="flex justify-between gap-4 text-sm"><span className="text-slate-500">{service?.name} × {selection.quantity}</span><span className="font-semibold">{formatCurrency((service?.price ?? 0) * selection.quantity)}</span></div> })}</div></div>
      </section>
      <aside className="h-fit rounded-3xl bg-[#18182b] p-6 text-white shadow-xl"><p className="text-sm text-white/55">Tổng thanh toán</p><strong className="mt-2 block text-3xl">{formatCurrency(total)}</strong><div className="my-6 h-px bg-white/10" /><p className="flex items-center gap-2 text-sm text-white/65"><CheckCircle2 className="size-4 text-emerald-400" /> Chỉ chuyển bước khi thanh toán hoàn tất</p><Button type="button" disabled={isSubmitting || total <= 0} onClick={confirmPayment} className="mt-6 h-12 w-full rounded-xl bg-[#ff6f76] hover:bg-[#f85c65]">{isSubmitting ? <><LoaderCircle className="size-4 animate-spin" />Đang xử lý...</> : method === 'CASH' ? 'Xác nhận thanh toán' : 'Thanh toán qua MoMo'}</Button></aside>
    </div>}
  </>
}
