import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from '../pages/auth/login-page.jsx';
import { MainLayout } from '../layouts/main-layout.jsx';
import { ProtectedRoute } from './protected-route.jsx';
import { DashboardPage } from '../pages/dashboard/dashboard-page.jsx';
import { UsersPage } from '../pages/users/users-page.jsx';
import { EnvironmentPage } from '../pages/environment/environment-page.jsx';

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      {/* Protected Routes inside MainLayout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
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
