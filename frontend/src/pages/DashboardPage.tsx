import { useEffect, useState } from 'react';
import { Alert, Card, Col, Row, Statistic, Typography } from 'antd';
import { apiError, dashboardApi } from '../services/api';
import type { Dashboard } from '../types';

export function DashboardPage() {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { void dashboardApi.get().then(setData).catch(cause => setError(apiError(cause).message)); }, []);
  return <section className="page"><Typography.Title level={2}>Tổng quan</Typography.Title>
    <Typography.Paragraph type="secondary">Số liệu lấy từ cơ sở dữ liệu khi tải trang.</Typography.Paragraph>
    {error && <Alert type="error" message={error} />}
    <Row gutter={[16,16]}>
      <Col xs={24} md={12} xl={6}><Card><Statistic title="Bệnh nhân" value={data?.patients ?? '—'} /></Card></Col>
      <Col xs={24} md={12} xl={6}><Card><Statistic title="Lượt khám hôm nay (UTC)" value={data?.visitsToday ?? '—'} /></Card></Col>
      <Col xs={24} md={12} xl={6}><Card><Statistic title="Lượt đang mở" value={data?.openVisits ?? '—'} /></Card></Col>
      <Col xs={24} md={12} xl={6}><Card><Statistic title="Thanh toán chờ xác nhận" value={data?.pendingPayments ?? '—'} /></Card></Col>
    </Row>
  </section>;
}
