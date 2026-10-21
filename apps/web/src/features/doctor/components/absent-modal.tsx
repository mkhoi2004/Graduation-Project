import { useState } from 'react'
import { Button } from '@/components/ui/button'

export function AbsentModal({ patientName, onClose, onConfirm }: { patientName: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [submitting, setSubmitting] = useState(false)
  return <div role="dialog" aria-label="Xác nhận bệnh nhân vắng mặt" className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4">
    <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
      <h3 className="text-lg font-bold">Xác nhận Vắng mặt</h3>
      <p className="mt-3 text-sm leading-6 text-slate-600">Bệnh nhân <strong>{patientName}</strong> sẽ kết thúc lượt hiện tại. STT không được tái sử dụng và hệ thống sẽ tự gọi STT kế tiếp.</p>
      <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Quay lại</Button><Button disabled={submitting} onClick={async () => { setSubmitting(true); try { await onConfirm() } finally { setSubmitting(false) } }} className="bg-amber-600 hover:bg-amber-700">Xác nhận Vắng mặt</Button></div>
    </div>
  </div>
}
