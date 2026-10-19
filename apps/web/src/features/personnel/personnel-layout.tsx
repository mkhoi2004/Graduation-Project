import { Award, Banknote, CalendarDays, Clock, LogOut, ShieldCheck, Users } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, type AuthSession } from '@/lib/auth-session';
import { AttendanceHeaderWidget } from './attendance-header-widget';

const tabs = [
  { to: '/hr', label: 'Hồ sơ nhân sự', icon: Users, end: true },
  { to: '/hr/access', label: 'Tài khoản & Phân quyền', icon: ShieldCheck },
  { to: '/hr/attendance', label: 'Chấm công & Phân ca', icon: CalendarDays },
  { to: '/hr/working-hours', label: 'Thời gian làm việc', icon: Clock },
  { to: '/hr/payroll', label: 'Bảng lương & Chi trả', icon: Banknote },
  { to: '/hr/incentive', label: 'Thưởng theo dịch vụ', icon: Award },
];

export function PersonnelLayout({ session }: { session: AuthSession }) {
  const navigate = useNavigate();
  const logout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/Logo.png" alt="DentalKhoi" className="h-10 w-auto object-contain" />
            <div>
              <p className="font-bold tracking-tight text-slate-900">DentalKhoi</p>
              <p className="text-xs text-slate-500">Phân hệ Hành chính Nhân sự & Tiền lương</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AttendanceHeaderWidget session={session} />
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-900">{session.user.fullName}</p>
              <p className="text-xs font-medium text-indigo-600">{session.user.roleName}</p>
            </div>
            <button
              aria-label="Đăng xuất"
              onClick={logout}
              className="grid size-10 place-items-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <nav aria-label="Chức năng nhân sự" className="border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto flex max-w-[1500px] gap-1 overflow-x-auto px-4 sm:px-6 lg:px-8">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-2 border-b-2 px-4 py-3.5 text-sm font-semibold transition ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`
              }
            >
              <Icon className="size-4" />
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-[1500px] px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
}
