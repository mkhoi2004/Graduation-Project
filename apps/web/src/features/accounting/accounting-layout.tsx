import { BarChart3, BookOpenCheck, FileText, HandCoins, Landmark, LogOut } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearSession, type AuthSession } from '@/lib/auth-session'
import { AttendanceHeaderWidget } from '../personnel/attendance-header-widget'

const tabs = [
  { to: '/accounting', label: 'Tổng quan', icon: BarChart3, end: true },
  { to: '/accounting/cash', label: 'Thu chi', icon: HandCoins },
  { to: '/accounting/debts', label: 'Công nợ', icon: Landmark },
  { to: '/accounting/invoices', label: 'Hóa đơn', icon: FileText },
  { to: '/accounting/controls', label: 'Kiểm soát', icon: BookOpenCheck },
]

export function AccountingLayout({ session }: { session: AuthSession }) {
  const navigate = useNavigate()
  const logout = () => { clearSession(); navigate('/login', { replace: true }) }
  return <div className="min-h-screen bg-[#f6f7fb] text-slate-950">
    <header className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3"><img src="/Logo.png" alt="DentalKhoi" className="h-10 w-auto object-contain" /><div><p className="font-bold">DentalKhoi</p><p className="text-xs text-slate-400">Phân hệ Kế toán quản trị</p></div></div>
      <div className="flex items-center gap-3">
        <AttendanceHeaderWidget session={session} />
        <div className="hidden text-right sm:block"><p className="text-sm font-semibold">{session.user.fullName}</p><p className="text-xs text-slate-400">{session.user.roleName}</p></div>
        <button aria-label="Đăng xuất" onClick={logout} className="grid size-10 place-items-center rounded-xl border border-slate-200"><LogOut className="size-4" /></button>
      </div>
    </div></header>
    <nav aria-label="Chức năng kế toán" className="border-b border-slate-200 bg-white"><div className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">{tabs.map(({to,label,icon:Icon,end}) => <NavLink key={to} to={to} end={end} className={({isActive}) => `flex items-center gap-2 border-b-2 px-4 py-4 text-sm font-semibold ${isActive ? 'border-[#5546e8] text-[#5546e8]' : 'border-transparent text-slate-500'}`}><Icon className="size-4" />{label}</NavLink>)}</div></nav>
    <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8"><Outlet /></main>
  </div>
}
