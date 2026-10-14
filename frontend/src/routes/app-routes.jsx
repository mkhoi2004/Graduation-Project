import { Link, Route, Routes } from 'react-router-dom';
import { Result } from 'antd';
import { EnvironmentPage } from '../pages/environment/environment-page.jsx';

export function AppRoutes() {
  return <Routes>
    <Route path="/" element={<EnvironmentPage />} />
    <Route path="*" element={<Result status="404" title="Không tìm thấy trang" extra={<Link to="/">Về môi trường phát triển</Link>} />} />
  </Routes>;
}
