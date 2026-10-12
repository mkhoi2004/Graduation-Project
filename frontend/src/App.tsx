import { useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { PatientsPage } from './pages/PatientsPage';
import { ServicesPage } from './pages/ServicesPage';
import { VisitsPage } from './pages/VisitsPage';
import { UsersPage } from './pages/UsersPage';

export type Session = { username: string; roles: string[] };
function storedSession(): Session | null {
  try { const value = sessionStorage.getItem('session'); return value ? JSON.parse(value) as Session : null; }
  catch { return null; }
}

export function App() {
  const [session, setSession] = useState<Session | null>(storedSession);
  const login = (value: Session, token: string) => { sessionStorage.setItem('token', token); sessionStorage.setItem('session', JSON.stringify(value)); setSession(value); };
  const logout = () => { sessionStorage.removeItem('token'); sessionStorage.removeItem('session'); setSession(null); };
  return <Routes>
    <Route path="/login" element={session ? <Navigate to="/" replace /> : <LoginPage onLogin={login} />} />
    <Route element={session ? <MainLayout session={session} onLogout={logout} /> : <Navigate to="/login" replace />}>
      <Route path="/" element={session?.roles.includes('DOCTOR') && !session?.roles.some(role => role === 'ADMIN' || role === 'RECEPTIONIST') ? <Navigate to="/visits" replace /> : <DashboardPage />} />
      <Route path="/patients" element={<PatientsPage roles={session?.roles ?? []} />} />
      <Route path="/visits" element={<VisitsPage roles={session?.roles ?? []} />} />
      <Route path="/services" element={<ServicesPage roles={session?.roles ?? []} />} />
      <Route path="/users" element={session?.roles.includes('ADMIN') ? <UsersPage /> : <Navigate to="/" replace />} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>;
}
