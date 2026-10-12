import { Button, Layout, Menu, Typography } from 'antd';
import { Link, Outlet, useLocation } from 'react-router-dom';
import type { Session } from '../App';

const { Sider, Header, Content } = Layout;
export function MainLayout({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const location = useLocation();
  const canSeeDashboard = session.roles.includes('ADMIN') || session.roles.includes('RECEPTIONIST');
  const items = [
    ...(canSeeDashboard ? [{ key: '/', label: <Link to="/">Tổng quan</Link> }] : []),
    { key: '/patients', label: <Link to="/patients">Bệnh nhân</Link> },
    { key: '/visits', label: <Link to="/visits">Lượt khám</Link> },
    { key: '/services', label: <Link to="/services">Dịch vụ</Link> },
    ...(session.roles.includes('ADMIN') ? [{ key: '/users', label: <Link to="/users">Người dùng</Link> }] : [])
  ];
  return <Layout className="app-shell">
    <Sider width={230} theme="light" className="side"><div className="brand">NHA KHOA<span> ERP / EMR</span></div><Menu mode="inline" selectedKeys={[location.pathname]} items={items} /></Sider>
    <Layout>
      <Header className="topbar"><Typography.Text strong>{session.username}</Typography.Text><Button onClick={onLogout}>Đăng xuất</Button></Header>
      <Content className="content"><Outlet /></Content>
    </Layout>
  </Layout>;
}
