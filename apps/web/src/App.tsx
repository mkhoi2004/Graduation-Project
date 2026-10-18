import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from '@/features/auth/login-page'
import { RolePlaceholder } from '@/features/auth/role-placeholder'
import { NewIntakePage } from '@/features/reception/new-intake-page'
import { PatientsPage } from '@/features/reception/patients-page'
import { PaymentPage } from '@/features/reception/payment-page'
import { ReceiptPage } from '@/features/reception/receipt-page'
import { ReceptionDashboard } from '@/features/reception/reception-dashboard'
import { ReceptionLayout } from '@/features/reception/reception-layout'
import { ServicesPage } from '@/features/reception/services-page'
import { TransferPage } from '@/features/reception/transfer-page'
import { getSession } from '@/lib/auth-session'
import { getRoleRoute } from '@/lib/role-routes'

import { DoctorLayout } from '@/features/doctor/doctor-layout'
import { WarehouseLayout } from '@/features/warehouse/warehouse-layout'
import { WarehouseOverviewPage } from '@/features/warehouse/warehouse-overview-page'
import { WarehouseDetailsPage } from '@/features/warehouse/warehouse-details-page'
import { WarehouseTransactionsPage } from '@/features/warehouse/warehouse-transactions-page'

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

function ProtectedReceptionRoute() {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  if (session.user.role !== 'RECEPTION_STAFF') {
    return <Navigate to={getRoleRoute(session.user.role)} replace />
  }
  return <ReceptionLayout session={session} />
}

function ProtectedDoctorRoute() {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  if (session.user.role !== 'DOCTOR' && session.user.role !== 'ADMIN') {
    return <Navigate to={getRoleRoute(session.user.role)} replace />
  }
  return <DoctorLayout session={session} />
}

function ProtectedWarehouseRoute() {
  const session = getSession()
  if (!session) return <Navigate to="/login" replace />
  if (session.user.role !== 'WAREHOUSE_MANAGEMENT' && session.user.role !== 'ADMIN') return <Navigate to={getRoleRoute(session.user.role)} replace />
  return <WarehouseLayout session={session} />
}

function PublicLoginRoute() {
  const session = getSession()
  if (session) return <Navigate to={getRoleRoute(session.user.role)} replace />
  return <LoginPage />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicLoginRoute />} />
      <Route path="/admin" element={<ProtectedRoleRoute role="ADMIN" title="Quản trị viên" />} />
      <Route path="/reception" element={<ProtectedReceptionRoute />}>
        <Route index element={<ReceptionDashboard />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="intakes/new" element={<NewIntakePage />} />
        <Route path="services" element={<ServicesPage />} />
        <Route path="payment" element={<PaymentPage />} />
        <Route path="receipt" element={<ReceiptPage />} />
        <Route path="transfer" element={<TransferPage />} />
      </Route>
      <Route path="/doctor" element={<ProtectedDoctorRoute />} />
      <Route path="/warehouse" element={<ProtectedWarehouseRoute />}>
        <Route index element={<WarehouseOverviewPage />} />
        <Route path="details" element={<WarehouseDetailsPage />} />
        <Route path="transactions" element={<WarehouseTransactionsPage />} />
      </Route>
      <Route path="/accounting" element={<ProtectedRoleRoute role="ACCOUNTING_STAFF" title="Nhân viên kế toán" />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return <BrowserRouter><AppRoutes /></BrowserRouter>
}

export default App
