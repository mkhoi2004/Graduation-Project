import type { ReactNode } from 'react'

export const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#6657e8] focus:ring-4 focus:ring-[#6657e8]/10'
export const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700'

export function PageTitle({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#6657e8]">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold tracking-[-0.03em] text-slate-950 sm:text-3xl">{title}</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center">
      <div><div className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#f0efff] text-[#6657e8]">{icon}</div><h3 className="mt-4 font-semibold text-slate-900">{title}</h3><p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{description}</p><div className="mt-5">{action}</div></div>
    </div>
  )
}

export function StatusPill({ status }: { status: string }) {
  let style = 'bg-amber-50 text-amber-700 border border-amber-200'
  let label = 'Đang chuẩn bị'

  switch (status) {
    case 'COMPLETED':
      style = 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
      label = 'Đã khám xong'
      break
    case 'IN_PROGRESS':
      style = 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-bold'
      label = 'Đang khám'
      break
    case 'TRANSFERRED':
      style = 'bg-blue-50 text-blue-700 border border-blue-200 font-medium'
      label = 'Đã chuyển bác sĩ'
      break
    case 'PAID':
      style = 'bg-violet-50 text-violet-700 border border-violet-200 font-medium'
      label = 'Đã thanh toán'
      break
    case 'READY':
      style = 'bg-sky-50 text-sky-700 border border-sky-200 font-medium'
      label = 'Đã cấp STT'
      break
    case 'ABSENT':
      style = 'bg-slate-100 text-slate-600 border border-slate-300 font-medium'
      label = 'Vắng mặt'
      break
    case 'CANCELLED':
    case 'CANCELLED_RECEPTION':
      style = 'bg-rose-50 text-rose-700 border border-rose-200 font-medium'
      label = 'Đã hủy'
      break
    case 'DRAFT':
    default:
      style = 'bg-amber-50 text-amber-700 border border-amber-200 font-medium'
      label = 'Đang chuẩn bị'
      break
  }

  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs ${style}`}>{label}</span>
}
