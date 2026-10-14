import { Alert, Button, Card, Steps, Tag, Typography } from 'antd';
import { useEnvironment } from '../../hooks/use-environment.js';
import { ConnectionStatus } from '../../components/connection-status.jsx';

const { Title, Paragraph, Text } = Typography;

export function EnvironmentPage() {
  const { api, database, refresh } = useEnvironment();
  const checking = api.isFetching || database.isFetching;
  return <div className="workspace">
    <header className="topbar">
      <div className="brand"><span className="brand-mark" aria-hidden="true">N</span><span>NHA KHOA <small>ERP & EMR</small></span></div>
      <Tag color="cyan">LOCAL / DEVELOPMENT</Tag>
    </header>
    <main>
      <section className="intro">
        <div><p className="eyebrow">GRADUATION PROJECT · NỀN TẢNG V0.1</p>
          <Title>Môi trường phát triển</Title>
          <Paragraph>Kiểm tra kết nối trước khi bắt đầu xây dựng các phân hệ quản lý phòng khám.</Paragraph>
        </div>
        <Button type="primary" size="large" loading={checking} onClick={refresh}>Kiểm tra lại kết nối</Button>
      </section>

      <section className="connections" aria-label="Trạng thái kết nối" aria-live="polite">
        <Card title="01 / Giao diện"><Tag color="success">Đang chạy</Tag><Title level={3}>React + Vite</Title><Text type="secondary">Cổng local 5173 · Ant Design</Text></Card>
        <Card title="02 / Máy chủ API"><ConnectionStatus query={api} /><Title level={3}>Node.js + Express</Title><Text type="secondary">{api.isError ? 'Chạy npm run dev trong thư mục backend.' : 'GET /api/health · Cổng 5000'}</Text></Card>
        <Card title="03 / Cơ sở dữ liệu"><ConnectionStatus query={database} successLabel="Schema nền tảng sẵn sàng" /><Title level={3}>SQL Server</Title><Text type="secondary">Graduation Project</Text><p className="instance">DESKTOP-F5CFA0D\SQLEXPRESS · TCP 1433</p></Card>
      </section>

      {!checking && database.isError && <Alert className="notice" type="warning" showIcon title="Chưa xác nhận được kết nối cơ sở dữ liệu"
        description="Schema SQL mới đã được tạo trên SQLEXPRESS. Điền DB_USER / DB_PASSWORD của SQL Authentication vào backend/.env, rồi chạy npm run db:check để API xác nhận kết nối." />}

      <section className="guide">
        <div className="guide-heading"><p className="eyebrow">BẮT ĐẦU TẠI ĐÂY</p><Title level={2}>Thiết lập một lần.<br />Phát triển từng phân hệ.</Title><Paragraph>Thiết kế bám theo Prompt_Project và Quy trình Nha khoa Tổng hợp v14. Mọi dữ liệu được xử lý trên máy local.</Paragraph></div>
        <div className="guide-steps"><Steps orientation="vertical" items={[
          { title: 'Cấu hình môi trường', content: <span>Ở thư mục gốc: <code>npm run setup</code>, điền thông tin SQL trong <code>backend/.env</code>.</span>, status: 'process' },
          { title: 'Schema SQL Server', content: <span>99 bảng cho 12 module đã được tạo và seed. Dùng <code>database/bootstrap.sql</code> để verify hoặc khởi tạo database trống.</span>, status: 'finish' },
          { title: 'Kiểm tra và tạo tài khoản mẫu', content: <span>Trong backend: <code>npm run db:check</code>, sau đó <code>npm run seed</code>.</span>, status: 'wait' },
          { title: 'Xây dựng module lõi', content: 'Bắt đầu với đăng nhập, phân quyền và audit, rồi danh mục, bệnh nhân, lượt khám và EMR.', status: 'wait' },
        ]} /></div>
      </section>

      <Alert type="info" showIcon title="Đây là nền tảng môi trường, chưa phải hệ thống nghiệp vụ hoàn chỉnh"
        description="Chưa có đăng nhập hoặc chức năng khám chữa bệnh, thanh toán và kho. Tài khoản seed được chuẩn bị cho Module 1. Các tiêu chí AT-01 đến AT-24 sẽ được kiểm thử khi triển khai nghiệp vụ." />
      <footer><span>01–07 · Module lõi</span><span>08–12 · Module mở rộng</span><Text type="secondary">Hướng dẫn chi tiết trong README.md</Text></footer>
    </main>
  </div>;
}
