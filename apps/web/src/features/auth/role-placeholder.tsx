import { useNavigate } from 'react-router-dom'
import { clearSession, type AuthSession } from '@/lib/auth-session'

export function RolePlaceholder({ title, session }: { title: string; session: AuthSession }) {
  const navigate = useNavigate()

  function logout() {
    clearSession()
    navigate('/login', { replace: true })
  }

  return (
    <main className="min-h-screen bg-white p-8">
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{session.user.fullName}</p>
      <button type="button" onClick={logout} className="mt-6 text-sm text-slate-600 underline underline-offset-4">
        Đăng xuất
      </button>
    </main>
  )
}
