import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#5546e8] focus:ring-2 focus:ring-[#5546e8]/10 disabled:bg-slate-50 disabled:text-slate-400'

export const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-[#5546e8] focus:ring-2 focus:ring-[#5546e8]/10'

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-[#5546e8]">
          Kế toán quản trị DentalKhoi
        </p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action && <div className="flex flex-wrap items-center gap-2.5">{action}</div>}
    </div>
  )
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode
  className?: string
  onClick?: () => void
}) {
  return (
    <section
      onClick={onClick}
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition ${className}`}
    >
      {children}
    </section>
  )
}

export function Message({
  value,
  error = false,
}: {
  value: string
  error?: boolean
}) {
  return (
    <p
      role={error ? 'alert' : 'status'}
      className={`rounded-xl border px-3.5 py-2.5 text-sm font-medium ${
        error ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {value}
    </p>
  )
}

export function Modal({
  title,
  isOpen,
  onClose,
  children,
  maxWidth = 'max-w-xl',
}: {
  title: string
  isOpen: boolean
  onClose: () => void
  children: ReactNode
  maxWidth?: string
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className={`relative w-full ${maxWidth} rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl`}>
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  )
}
