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
  const style = status === 'TRANSFERRED' ? 'bg-emerald-50 text-emerald-700' : status === 'PAID' ? 'bg-violet-50 text-violet-700' : status === 'READY' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
  const label = status === 'TRANSFERRED' ? 'Đã chuyển bác sĩ' : status === 'PAID' ? 'Đã thanh toán' : status === 'READY' ? 'Chờ thanh toán' : 'Đang chuẩn bị'
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}>{label}</span>
}
