import { ClipboardPlus, CreditCard, Database, FileText, LayoutDashboard, LogOut, Send, Sparkles, Stethoscope, UsersRound } from 'lucide-react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { clearSession, type AuthSession } from '@/lib/auth-session'
import { ReceptionProvider, useReception } from './reception-context'

import { AttendanceHeaderWidget } from '../personnel/attendance-header-widget'

const tabs = [
  { to: '/reception', label: 'Tổng quan', icon: LayoutDashboard, end: true },
  { to: '/reception/patients', label: 'Bệnh nhân', icon: UsersRound },
  { to: '/reception/intakes/new', label: 'Tạo tiếp nhận', icon: ClipboardPlus },
  { to: '/reception/services', label: 'Dịch vụ & điều phối', icon: Stethoscope },
  { to: '/reception/payment', label: 'Thanh toán', icon: CreditCard },
  { to: '/reception/receipt', label: 'Phiếu tiếp nhận', icon: FileText },
  { to: '/reception/transfer', label: 'Chuyển bác sĩ', icon: Send },
]

function ReceptionLayoutInner({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const { dispatch } = useReception()

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-950">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/Logo.png" alt="DentalKhoi" className="h-10 w-auto object-contain" />
            <div>
              <p className="font-bold tracking-[-0.03em]">DentalKhoi</p>
              <p className="text-xs text-slate-400">Quầy tiếp nhận</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AttendanceHeaderWidget session={session} />
            <button
              type="button"
              onClick={() => dispatch({ type: 'LOAD_DEMO_DATA' })}
              className="hidden md:inline-flex items-center gap-1.5 rounded-xl border border-[#dedaff] bg-[#f0efff] px-3 py-2 text-xs font-semibold text-[#5546e8] transition hover:bg-[#e4e1ff]"
              title="Nạp 5 bệnh nhân và 4 phiếu tiếp nhận mẫu"
            >
              <Sparkles className="size-3.5" />
              <span>Nạp dữ liệu mẫu</span>
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'CLEAR_DATA' })}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
              title="Xóa trắng dữ liệu trên trình duyệt"
            >
              <Database className="size-3.5" />
              <span>Làm mới</span>
            </button>
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{session.user.fullName}</p>
              <p className="text-xs text-slate-400">{session.user.roleName}</p>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Đăng xuất"
              className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="border-b border-slate-200/80 bg-white">
        <nav aria-label="Chức năng tiếp nhận" className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex shrink-0 items-center gap-2 border-b-2 px-3 py-4 text-sm font-semibold transition ${
                  isActive
                    ? 'border-[#6657e8] text-[#5546e8]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>

      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        <Outlet />
      </main>
    </div>
  )
}

export function ReceptionLayout({ session }: { session: AuthSession }) {
  const navigate = useNavigate()
  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <ReceptionProvider>
      <ReceptionLayoutInner session={session} onLogout={logout} />
    </ReceptionProvider>
  )
}
