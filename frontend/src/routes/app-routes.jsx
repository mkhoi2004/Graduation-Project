import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/auth/login-page.jsx';
import { MainLayout } from '../layouts/main-layout.jsx';
import { ProtectedRoute } from './protected-route.jsx';
import { DashboardPage } from '../pages/dashboard/dashboard-page.jsx';
import { UsersPage } from '../pages/users/users-page.jsx';
import { EnvironmentPage } from '../pages/environment/environment-page.jsx';

import { ServicesPage } from '../pages/catalog/services-page.jsx';
import { RoomsPage } from '../pages/catalog/rooms-page.jsx';
import { PatientsPage } from '../pages/patients/patients-page.jsx';
import { VisitsPage } from '../pages/visits/visits-page.jsx';
import EmrDetailPage from '../pages/emr/emr-detail-page.jsx';
import SignQueuePage from '../pages/emr/sign-queue-page.jsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes inside MainLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/patients" element={<PatientsPage />} />
          <Route path="/visits" element={<VisitsPage />} />
          <Route path="/visits/:visitId/emr" element={<EmrDetailPage />} />
          <Route path="/sign-queue" element={<SignQueuePage />} />
          <Route path="/catalog/services" element={<ServicesPage />} />
          <Route path="/catalog/rooms" element={<RoomsPage />} />
          <Route path="/environment" element={<EnvironmentPage />} />

          {/* Admin only routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
