import { useState } from 'react';
import { Layout, Menu, Button, Tag, Avatar, Space, Typography, Dropdown } from 'antd';
import {
  DashboardOutlined,
  UserOutlined,
  TeamOutlined,
  CalendarOutlined,
  MedicineBoxOutlined,
  DollarOutlined,
  AppstoreOutlined,
  SettingOutlined,
  LogoutOutlined,
  CheckCircleOutlined,
  FileDoneOutlined,
  InboxOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/auth-context.jsx';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;

const roleColorMap = {
  ADMIN: 'red',
  RECEPTIONIST: 'green',
  DOCTOR: 'blue',
  ACCOUNTANT: 'gold',
  WAREHOUSE: 'purple',
};

const roleLabelMap = {
  ADMIN: 'Quản trị viên',
  RECEPTIONIST: 'Nhân viên tiếp nhận',
  DOCTOR: 'Bác sĩ',
  ACCOUNTANT: 'Kế toán',
  WAREHOUSE: 'Quản lý kho',
};

export function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Bảng điều khiển',
    },
    {
      key: '/patients',
      icon: <TeamOutlined />,
      label: 'Hồ sơ Bệnh nhân',
    },
    {
      key: '/visits',
      icon: <CalendarOutlined />,
      label: 'Lượt khám & Tiếp nhận',
    },
    ...(user?.role === 'DOCTOR' || user?.role === 'ADMIN'
      ? [
          {
            key: '/sign-queue',
            icon: <FileDoneOutlined />,
            label: 'Hàng đợi ký số (AT-13)',
          },
        ]
      : []),
    ...(['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user?.role)
      ? [
          {
            key: '/billing',
            icon: <DollarOutlined />,
            label: 'Thu ngân & Viện phí (AT-01/15)',
          },
        ]
      : []),
    ...(['ADMIN', 'WAREHOUSE', 'DOCTOR'].includes(user?.role)
      ? [
          {
            key: '/inventory',
            icon: <InboxOutlined />,
            label: 'Kho Dược & Vật tư (AT-07/08/12)',
          },
        ]
      : []),
    ...(['ADMIN', 'ACCOUNTANT'].includes(user?.role) || user?.isApprover
      ? [
          {
            key: '/accounting',
            icon: <AuditOutlined />,
            label: 'Kế toán & Khóa sổ (AT-09/10)',
          },
        ]
      : []),
    {
      key: '/catalog/services',
      icon: <MedicineBoxOutlined />,
      label: 'Dịch vụ & Bảng giá',
    },
    {
      key: '/catalog/rooms',
      icon: <AppstoreOutlined />,
      label: 'Phòng khám & Ghế',
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            key: '/users',
            icon: <UserOutlined />,
            label: 'Quản lý người dùng',
          },
        ]
      : []),
    {
      key: '/environment',
      icon: <CheckCircleOutlined />,
      label: 'Kiểm tra hệ thống',
    },
  ];

  const userMenuItems = [
    {
      key: 'user-info',
      label: (
        <div>
          <div><strong>{user?.displayName}</strong></div>
          <Text type="secondary" style={{ fontSize: '12px' }}>@{user?.username}</Text>
        </div>
      ),
      disabled: true,
    },
    { type: 'divider' },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      danger: true,
      label: 'Đăng xuất',
      onClick: handleLogout,
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} theme="light" width={240}>
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid #f0f0f0', padding: '0 16px' }}>
          <Space orientation="horizontal" size="small">
            <div style={{ width: 32, height: 32, borderRadius: 6, background: '#08979c', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
              N
            </div>
            {!collapsed && (
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 14, color: '#002329', lineHeight: 1.2 }}>NHA KHOA ERP</div>
                <div style={{ fontSize: 10, color: '#8c8c8c' }}>Hệ thống quản lý phòng khám</div>
              </div>
            )}
          </Space>
        </div>
        <Menu
          theme="light"
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ borderRight: 0, marginTop: 8 }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', padding: '0 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0f0f0' }}>
          <div>
            <Tag color="cyan">Chi nhánh: {user?.branchName || 'Phòng khám local'}</Tag>
            {user?.isApprover && <Tag color="orange">Người duyệt (Approver)</Tag>}
          </div>
          <Space orientation="horizontal" size="middle">
            <Tag color={roleColorMap[user?.role] || 'default'} style={{ fontSize: '12px', padding: '2px 8px' }}>
              {roleLabelMap[user?.role] || user?.role}
            </Tag>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar style={{ backgroundColor: '#13c2c2' }} icon={<UserOutlined />} />
                <Text strong>{user?.displayName}</Text>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content style={{ margin: '20px', minHeight: 280 }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
