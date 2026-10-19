import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, Sparkles, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { saveSession, type AuthSession } from '@/lib/auth-session'
import { getRoleRoute } from '@/lib/role-routes'

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api'
const demoAccounts = [
  ['admin', 'Quản trị viên'],
  ['hr', 'Hành chính nhân sự'],
  ['reception', 'Tiếp nhận'],
  ['doctor-minh', 'Bác sĩ'],
  ['warehouse', 'Quản lý kho'],
  ['accounting', 'Kế toán'],
] as const

export function LoginPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setIsSubmitting(true)

    try {
      const response = await fetch(`${apiUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const payload = (await response.json()) as AuthSession & { message?: string }

      if (!response.ok) {
        throw new Error(typeof payload.message === 'string' ? payload.message : 'Không thể đăng nhập. Vui lòng thử lại.')
      }

      saveSession(payload)
      navigate(getRoleRoute(payload.user.role), { replace: true })
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Không thể kết nối tới máy chủ.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function chooseDemoAccount(account: string) {
    setUsername(account)
    setPassword('Dental@123')
    setError('')
  }

  return (
    <main className="min-h-screen bg-[#f7f8ff] p-3 text-slate-950 sm:p-5 lg:p-7">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1440px] overflow-hidden rounded-[2rem] bg-white shadow-[0_32px_90px_rgba(49,38,145,0.16)] sm:min-h-[calc(100vh-2.5rem)] lg:min-h-[calc(100vh-3.5rem)] lg:grid-cols-[0.95fr_1.05fr]">
        <section className="flex items-center px-6 py-10 sm:px-12 lg:px-16 xl:px-24">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-10 flex items-center gap-3.5">
              <img src="/Logo.png" alt="DentalKhoi" className="h-12 w-auto object-contain select-none" />
              <div>
                <p className="text-xl font-bold tracking-tight text-slate-900">DentalKhoi</p>
                <p className="text-xs font-medium text-slate-400">Hệ Thống Quản Lý Phòng Khám</p>
              </div>
            </div>

            <div className="mb-8">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#f0efff] px-3 py-1.5 text-xs font-semibold text-[#5546e8]">
                <Sparkles className="size-3.5" aria-hidden="true" />
                Không gian làm việc an toàn
              </div>
              <h1 className="text-4xl font-bold tracking-[-0.05em] text-[#17182b] sm:text-5xl">Chào Mừng Đã Đến </h1>
              <p className="mt-4 leading-7 text-slate-500">Phòng Khám DentalKhoi, vui lòng đăng nhập để tiếp tục quản lý hoạt động phòng khám nha khoa.</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="username">Tên đăng nhập</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input id="username" name="username" autoComplete="username" required value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Nhập tên đăng nhập" className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fbfbfe] pl-12 pr-4 text-sm outline-none transition focus:border-[#6758ef] focus:bg-white focus:ring-4 focus:ring-[#6758ef]/10" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700" htmlFor="password">Mật khẩu</label>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required minLength={8} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Nhập mật khẩu" className="h-14 w-full rounded-2xl border border-slate-200 bg-[#fbfbfe] pl-12 pr-12 text-sm outline-none transition focus:border-[#6758ef] focus:bg-white focus:ring-4 focus:ring-[#6758ef]/10" />
                  <button type="button" onClick={() => setShowPassword((visible) => !visible)} aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-[#5546e8]">
                    {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                  </button>
                </div>
              </div>

              {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p> : null}

              <Button type="submit" disabled={isSubmitting} className="h-14 w-full rounded-2xl bg-[#ff6f76] text-base font-semibold text-white shadow-lg shadow-[#ff6f76]/25 hover:bg-[#f45f68]">
                {isSubmitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
                {!isSubmitting && <ArrowRight className="size-4" aria-hidden="true" />}
              </Button>
            </form>

            <div className="mt-8 rounded-2xl border border-dashed border-[#6758ef]/25 bg-[#f8f7ff] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6758ef]">Tài khoản thử nghiệm</p>
              <p className="mt-2 text-sm text-slate-500">Chọn vai trò để điền nhanh · Mật khẩu chung: <strong className="text-slate-700">Dental@123</strong></p>
              <div className="mt-3 flex flex-wrap gap-2">
                {demoAccounts.map(([account, label]) => (
                  <button key={account} type="button" onClick={() => chooseDemoAccount(account)} className="rounded-full border border-[#dedaff] bg-white px-3 py-1.5 text-xs font-medium text-[#5546e8] transition hover:border-[#6758ef] hover:bg-[#f0efff]">{label}</button>
                ))}
              </div>
            </div>

            <p className="mt-8 flex items-center justify-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="size-4 text-emerald-500" aria-hidden="true" />
              Dữ liệu đăng nhập được bảo vệ và mã hóa
            </p>
          </div>
        </section>

        <section className="relative hidden overflow-hidden bg-[#4f3ddb] p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div className="absolute -right-40 -top-32 size-[34rem] rounded-full border-[90px] border-white/[0.06]" />
          <div className="absolute -bottom-56 -left-44 size-[36rem] rounded-full bg-[#6959ef]" />
          <div className="absolute left-16 top-1/2 h-36 w-36 -translate-y-1/2 rounded-full bg-[#ff747b]/85 blur-3xl" />
          <div className="relative z-10 flex items-center justify-between text-sm">
            <span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur">DentalKhoi Platform</span>
            <span className="text-white/70">DentalKhoi - v1.0</span>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-xl">
            <div className="relative mx-auto flex max-w-[440px] items-center justify-center rounded-3xl bg-white/[0.07] p-8 backdrop-blur-md transition duration-300 hover:bg-white/[0.10]">
              <img
                src="/Logo_Slogan_Purple.png"
                alt="DentalKhoi - Nâng niu nụ cười Việt"
                className="max-h-72 w-auto object-contain select-none"
              />
            </div>
            <h2 className="mt-8 max-w-lg text-4xl font-semibold leading-tight tracking-[-0.04em]">Chăm sóc tốt hơn bắt đầu từ vận hành thông minh hơn.</h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-white/70">Một không gian thống nhất cho đội ngũ tiếp nhận, bác sĩ, kho, kế toán và nhân sự.</p>
          </div>
          <div className="relative z-10 flex items-center gap-3 text-sm text-white/65"><span className="h-px w-10 bg-white/30" />Phòng khám hiện đại · Quy trình liền mạch</div>
        </section>
      </div>
    </main>
  )
}
