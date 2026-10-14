import { Navigate, Outlet } from 'react-router-dom';
import { Spin, Result, Button } from 'antd';
import { useAuth } from '../context/auth-context.jsx';

export function ProtectedRoute({ allowedRoles = [] }) {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Đang kiểm tra quyền truy cập..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return (
      <div style={{ padding: '40px' }}>
        <Result
          status="403"
          title="403 - Không có quyền truy cập"
          subTitle={`Vai trò '${user?.role}' của bạn không được phép truy cập chức năng này.`}
          extra={<Button type="primary" href="/dashboard">Về Bảng điều khiển</Button>}
        />
      </div>
    );
  }

  return <Outlet />;
}
