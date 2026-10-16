import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/login-page'
import { RolePlaceholder } from '@/features/auth/role-placeholder'
import { NewIntakePage } from '@/features/reception/new-intake-page'
import { PatientsPage } from '@/features/reception/patients-page'
import { ReceiptPage } from '@/features/reception/receipt-page'
import { ReceptionDashboard } from '@/features/reception/reception-dashboard'
import { ReceptionLayout } from '@/features/reception/reception-layout'
import { ServicesPage } from '@/features/reception/services-page'
import { TransferPage } from '@/features/reception/transfer-page'
import { getSession } from '@/lib/auth-session'
import { getRoleRoute } from '@/lib/role-routes'

function RequireRole({ role, children }: { role: string; children: ReactNode }) {
  const session = getSession()

  if (!session) return <Navigate to="/login" replace />
  if (session.user.role !== role) {
    return <Navigate to={getRoleRoute(session.user.role)} replace />
  }

  return children
}

function ProtectedRoleRoute({ role, title }: { role: string; title: string }) {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  return <RequireRole role={role}><RolePlaceholder title={title} session={session} /></RequireRole>
}

function AppRoutes() {
  const session = getSession()

  return (
    <Routes>
      <Route path="/login" element={session ? <Navigate to={getRoleRoute(session.user.role)} replace /> : <LoginPage />} />
      <Route path="/admin" element={<ProtectedRoleRoute role="ADMIN" title="Quản trị viên" />} />
      <Route path="/reception" element={session ? <RequireRole role="RECEPTION_STAFF"><ReceptionLayout session={session} /></RequireRole> : <Navigate to="/login" replace />}>
        <Route index element={<ReceptionDashboard />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="intakes/new" element={<NewIntakePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="receipt" element={<ReceiptPage />} />
        <Route path="transfer" element={<TransferPage />} />
      </Route>
      <Route path="/doctor" element={<ProtectedRoleRoute role="DOCTOR" title="Bác sĩ thực hiện" />} />
      <Route path="/warehouse" element={<ProtectedRoleRoute role="WAREHOUSE_MANAGEMENT" title="Quản lý kho" />} />
      <Route path="/accounting" element={<ProtectedRoleRoute role="ACCOUNTING_STAFF" title="Nhân viên kế toán" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}

export default App
