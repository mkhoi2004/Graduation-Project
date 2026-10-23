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
import { AuthProvider, useAuth } from '@/features/auth/auth-context'
import { ProtectedRoute } from '@/features/auth/protected-route'
import { getRoleRoute } from '@/lib/role-routes'

import { DoctorLayout } from '@/features/doctor/doctor-layout'
import { WarehouseLayout } from '@/features/warehouse/warehouse-layout'
import { WarehouseOverviewPage } from '@/features/warehouse/warehouse-overview-page'
import { WarehouseDetailsPage } from '@/features/warehouse/warehouse-details-page'
import { WarehouseTransactionsPage } from '@/features/warehouse/warehouse-transactions-page'
import { AccountingLayout } from '@/features/accounting/accounting-layout'
import { AccountingOverviewPage } from '@/features/accounting/overview-page'
import { AccountingCashPage } from '@/features/accounting/cash-page'
import { AccountingDebtsPage } from '@/features/accounting/debts-page'
import { AccountingInvoicesPage } from '@/features/accounting/invoices-page'
import { AccountingControlsPage } from '@/features/accounting/controls-page'
import { PersonnelLayout } from '@/features/personnel/personnel-layout'
import { EmployeesPage } from '@/features/personnel/employees-page'
import { AccessPage } from '@/features/personnel/access-page'
import { AttendancePage } from '@/features/personnel/attendance-page'
import { WorkingHoursPage } from '@/features/personnel/working-hours-page'
import { PayrollPage } from '@/features/personnel/payroll-page'
import { IncentivePage } from '@/features/personnel/incentive-page'

function ProtectedRoleRoute({ role, title }: { role: string; title: string }) {
  const { session } = useAuth()
  return (
    <ProtectedRoute allowedRoles={[role]}>
      {session ? <RolePlaceholder title={title} session={session} /> : null}
    </ProtectedRoute>
  )
}

function ProtectedReceptionRoute() {
  const { session } = useAuth()
  return (
    <ProtectedRoute allowedRoles={['RECEPTION_STAFF']}>
      {session ? <ReceptionLayout session={session} /> : null}
    </ProtectedRoute>
  )
}

function ProtectedDoctorRoute() {
  const { session } = useAuth()
  return (
    <ProtectedRoute allowedRoles={['DOCTOR', 'ADMIN']}>
      {session ? <DoctorLayout session={session} /> : null}
    </ProtectedRoute>
  )
}

function ProtectedWarehouseRoute() {
  const { session } = useAuth()
  return (
    <ProtectedRoute allowedRoles={['WAREHOUSE_MANAGEMENT', 'ADMIN']}>
      {session ? <WarehouseLayout session={session} /> : null}
    </ProtectedRoute>
  )
}

function ProtectedAccountingRoute() {
  const { session } = useAuth()
  return (
    <ProtectedRoute allowedRoles={['ACCOUNTING_STAFF', 'ADMIN']}>
      {session ? <AccountingLayout session={session} /> : null}
    </ProtectedRoute>
  )
}

function ProtectedPersonnelRoute() {
  const { session } = useAuth()
  return (
    <ProtectedRoute allowedRoles={['HR', 'HR_STAFF', 'MANAGER', 'ADMIN']}>
      {session ? <PersonnelLayout session={session} /> : null}
    </ProtectedRoute>
  )
}

function PublicLoginRoute() {
  const { user, isAuthenticated, isLoading } = useAuth()
  if (isLoading) return null
  if (isAuthenticated && user) return <Navigate to={getRoleRoute(user.role)} replace />
  return <LoginPage />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<PublicLoginRoute />} />
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
      <Route path="/accounting" element={<ProtectedAccountingRoute />}>
        <Route index element={<AccountingOverviewPage />} />
        <Route path="cash" element={<AccountingCashPage />} />
        <Route path="debts" element={<AccountingDebtsPage />} />
        <Route path="invoices" element={<AccountingInvoicesPage />} />
        <Route path="controls" element={<AccountingControlsPage />} />
      </Route>
      <Route path="/hr" element={<ProtectedPersonnelRoute />}>
        <Route index element={<EmployeesPage />} />
        <Route path="employees" element={<EmployeesPage />} />
        <Route path="access" element={<AccessPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="working-hours" element={<WorkingHoursPage />} />
        <Route path="payroll" element={<PayrollPage />} />
        <Route path="incentive" element={<IncentivePage />} />
        <Route path="incentives" element={<IncentivePage />} />
      </Route>
      <Route path="/PersonnelAdministration" element={<Navigate to="/hr" replace />} />
      <Route path="/PersonnelAdministration/*" element={<Navigate to="/hr" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
