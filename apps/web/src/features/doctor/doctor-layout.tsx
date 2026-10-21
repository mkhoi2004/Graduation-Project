import {
  Ban,
  CheckCircle2,
  DoorOpen,
  FileCheck2,
  FileText,
  LogOut,
  Package,
  RefreshCw,
  Users,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { clearSession, type AuthSession } from '../../lib/auth-session'
import { DoctorProvider, useDoctor } from './doctor-context'
import { QueueStep } from './steps/queue-step'
import { SuppliesStep } from './steps/supplies-step'
import { SummaryStep } from './steps/summary-step'
import { FinishStep } from './steps/finish-step'
import { CancelModal } from './components/cancel-modal'
import { AttendanceHeaderWidget } from '../personnel/attendance-header-widget'

function DoctorLayoutInner({ session, onLogout }: { session: AuthSession; onLogout: () => void }) {
  const {
    activeRoomCode,
    queueSummary,
    currentExam,
    activeStep,
    loading,
    dispatch,
  } = useDoctor()

  const isExamInProgress = currentExam !== null && currentExam.status === 'IN_PROGRESS'

  const steps = [
    {
      step: 1 as const,
      label: 'Bước 1: Hàng đợi tiếp nhận',
      icon: Users,
    },
    {
      step: 2 as const,
      label: 'Bước 2: Vật tư y tế tiêu hao',
      icon: Package,
    },
    {
      step: 3 as const,
      label: 'Bước 3: Tóm tắt kết quả & In phiếu',
      icon: FileText,
    },
    {
      step: 4 as const,
      label: 'Bước 4: Ghi sổ (Hoàn thành)',
      icon: FileCheck2,
    },
  ]

  return (
    <div className="min-h-screen bg-[#f6f7fb] text-slate-950">
      {/* Top Header */}
      <header className="no-print border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img src="/Logo.png" alt="DentalKhoi" className="h-10 w-auto object-contain" />
            <div>
              <p className="font-bold tracking-[-0.03em] text-slate-900">DentalKhoi</p>
              <p className="text-xs text-slate-400">Phân hệ Bác sĩ lâm sàng</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Room is server-derived from the doctor's assignment/queue. */}
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm">
              <DoorOpen className="size-4 text-[#5546e8] shrink-0" />
              <span className="text-slate-500 font-medium hidden sm:inline">Phòng trực:</span>
              <strong className="min-w-[110px] text-slate-800">{currentExam?.intake.roomName || queueSummary.roomName || activeRoomCode}</strong>
            </div>

            {/* Universal Cancel / Stop Exam button - Available at all steps */}
            {isExamInProgress && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'SET_CANCEL_MODAL', open: true })}
                className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2 text-xs font-bold text-red-700 shadow-sm transition hover:bg-red-100"
                title="Ngừng khám hoặc từ chối ca bệnh hiện tại"
              >
                <Ban className="size-3.5" />
                <span>Từ chối / Ngừng khám</span>
              </button>
            )}

            {/* Attendance Check-in / Check-out */}
            <AttendanceHeaderWidget session={session} />

            {/* Doctor Info */}
            <div className="hidden text-right sm:block">
              <p className="text-sm font-semibold text-slate-800">{session.user.fullName}</p>
              <p className="text-xs text-[#5546e8] font-medium">{session.user.roleName}</p>
            </div>

            {/* Logout */}
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

      {/* 4 Step Navigation Tabs */}
      <div className="no-print border-b border-slate-200/80 bg-white">
        <nav
          aria-label="Quy trình khám bác sĩ"
          className="mx-auto flex max-w-[1500px] gap-2 overflow-x-auto px-4 sm:px-6 lg:px-8"
        >
          {steps.map(({ step, label, icon: Icon }) => {
            const isActive = activeStep === step
            const isCompletedStep = activeStep > step || (currentExam && currentExam.status === 'COMPLETED')
            return (
              <button
                key={step}
                type="button"
                onClick={() => dispatch({ type: 'SET_STEP', step })}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-4 text-sm font-bold transition ${
                  isActive
                    ? 'border-[#6657e8] text-[#5546e8]'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Icon className="size-4" />
                <span>{label}</span>
                {isCompletedStep && !isActive && (
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-6 lg:px-8 lg:py-10">
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <RefreshCw className="size-4 animate-spin text-[#5546e8]" />
              Đang tải dữ liệu ca khám...
            </div>
          </div>
        ) : (
          <>
            {activeStep === 1 && <QueueStep />}
            {activeStep === 2 && <SuppliesStep />}
            {activeStep === 3 && <SummaryStep />}
            {activeStep === 4 && <FinishStep />}
          </>
        )}
      </main>

      {/* Universal Cancel Modal */}
      <CancelModal />
    </div>
  )
}

export function DoctorLayout({ session }: { session: AuthSession }) {
  const navigate = useNavigate()

  function handleLogout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <DoctorProvider>
      <DoctorLayoutInner session={session} onLogout={handleLogout} />
    </DoctorProvider>
  )
}
