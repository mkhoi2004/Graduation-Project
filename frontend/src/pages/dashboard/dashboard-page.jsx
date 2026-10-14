import { Card, Row, Col, Typography, Tag, Table, Alert, Button, Space } from 'antd';
import {
  UserOutlined,
  SafetyCertificateOutlined,
  CheckCircleOutlined,
  AuditOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useAuth } from '../../context/auth-context.jsx';
import { useNavigate } from 'react-router-dom';

const { Title, Text, Paragraph } = Typography;

const MATRIX_DATA = [
  { key: '1', module: '1. Người dùng & Audit', admin: 'Xem, Sửa', rec: '—', doc: '—', acc: '—', wh: '—' },
  { key: '2', module: '2. Danh mục & Cấu hình', admin: 'Xem, Sửa, Xóa', rec: 'Xem', doc: 'Xem', acc: 'Xem', wh: 'Xem' },
  { key: '3', module: '3. Bệnh nhân', admin: 'Xem', rec: 'Xem, Sửa', doc: 'Xem (theo ca)', acc: 'Xem (tối thiểu)', wh: '—' },
  { key: '4', module: '4. Lịch hẹn & Lượt khám', admin: 'Xem', rec: 'Xem, Sửa', doc: 'Xem (lượt phân công)', acc: 'Xem (tối thiểu)', wh: '—' },
  { key: '5', module: '5. EMR & Đồng thuận', admin: 'Xem (có audit)', rec: '—', doc: 'Xem, Sửa (lượt mình)', acc: '—', wh: '—' },
  { key: '6', module: '6. Thanh toán & Công nợ', admin: 'Xem', rec: 'Xem, Thu tiền', doc: '—', acc: 'Xem, Sửa', wh: '—' },
  { key: '7', module: '7. Kho & Vật tư', admin: 'Xem', rec: '—', doc: 'Xem (vật tư ca mình)', acc: 'Xem (giá vốn)', wh: 'Xem, Sửa' },
  { key: '8', module: '8. Thu ngân & Kế toán', admin: 'Xem', rec: 'Xem, Thu (ca mình)', doc: '—', acc: 'Xem, Sửa', wh: '—' },
  { key: '9', module: '9. Bảo lãnh BHTM', admin: 'Xem', rec: 'Xem (xác minh)', doc: '—', acc: 'Xem, Sửa', wh: '—' },
  { key: '10', module: '10. Tiệt trùng & Labo', admin: 'Xem', rec: '—', doc: 'Xem, Sửa (chỉ định)', acc: '—', wh: 'Xem, Sửa' },
  { key: '11', module: '11. Hoa hồng', admin: 'Xem', rec: '—', doc: 'Xem (của mình)', acc: 'Xem, Sửa', wh: '—' },
  { key: '12', module: '12. Tài sản & Đối soát', admin: 'Xem', rec: '—', doc: '—', acc: 'Xem (đối soát)', wh: 'Xem, Sửa (tài sản)' },
];

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const columns = [
    { title: 'Phân hệ chức năng', dataIndex: 'module', key: 'module' },
    {
      title: 'Quản trị (Admin)',
      dataIndex: 'admin',
      key: 'admin',
      render: (text) => <Tag color={text.includes('Sửa') ? 'red' : 'default'}>{text}</Tag>,
    },
    {
      title: 'Tiếp nhận',
      dataIndex: 'rec',
      key: 'rec',
      render: (text) => <Tag color={text !== '—' ? 'green' : 'default'}>{text}</Tag>,
    },
    {
      title: 'Bác sĩ',
      dataIndex: 'doc',
      key: 'doc',
      render: (text) => <Tag color={text !== '—' ? 'blue' : 'default'}>{text}</Tag>,
    },
    {
      title: 'Kế toán',
      dataIndex: 'acc',
      key: 'acc',
      render: (text) => <Tag color={text !== '—' ? 'gold' : 'default'}>{text}</Tag>,
    },
    {
      title: 'Kho',
      dataIndex: 'wh',
      key: 'wh',
      render: (text) => <Tag color={text !== '—' ? 'purple' : 'default'}>{text}</Tag>,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Card style={{ borderRadius: 8, background: 'linear-gradient(90deg, #e6fffb 0%, #ffffff 100%)' }}>
        <Row align="middle" justify="space-between">
          <Col>
            <Title level={3} style={{ margin: 0 }}>Xin chào, {user?.displayName}!</Title>
            <Paragraph type="secondary" style={{ margin: '4px 0 0' }}>
              Chào mừng bạn đến với hệ thống ERP & EMR Nha khoa. Dưới đây là phạm vi phân quyền và trạng thái công việc của bạn.
            </Paragraph>
          </Col>
          <Col>
            <Space>
              {user?.role === 'ADMIN' && (
                <Button type="primary" icon={<UserOutlined />} onClick={() => navigate('/users')}>
                  Quản lý người dùng
                </Button>
              )}
              <Button icon={<CheckCircleOutlined />} onClick={() => navigate('/environment')}>
                Kiểm tra kết nối
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Card>
            <Text type="secondary">Tài khoản & Vai trò</Text>
            <div style={{ marginTop: 8 }}>
              <Title level={4} style={{ margin: 0 }}>{user?.username}</Title>
              <Tag color="cyan" style={{ marginTop: 4 }}>{user?.roleName || user?.role}</Tag>
              {user?.isApprover && <Tag color="orange">Kế toán duyệt (Approver)</Tag>}
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Text type="secondary">Chi nhánh hoạt động</Text>
            <div style={{ marginTop: 8 }}>
              <Title level={4} style={{ margin: 0 }}>{user?.branchName || 'Phòng khám local'}</Title>
              <Tag color="blue" style={{ marginTop: 4 }}>Mã: {user?.branchCode || 'LOCAL'}</Tag>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Text type="secondary">Cơ chế bảo mật dữ liệu</Text>
            <div style={{ marginTop: 8 }}>
              <Title level={4} style={{ margin: 0 }}>Data Visibility 3.2</Title>
              <Tag color="geekblue" style={{ marginTop: 4 }}>AccessAuditLogs Bất biến</Tag>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Ma trận Phân quyền & Phạm vi Dữ liệu (Mục 3.2 Prompt_Project)">
        <Alert
          message="Phân quyền được kiểm tra nghiêm ngặt tại Backend (Service/Repository)"
          description="Frontend chỉ hiển thị menu theo vai trò. Mọi yêu cầu đọc/ghi dữ liệu ngoài phạm vi cho phép đều bị API từ chối với mã lỗi 403 Forbidden và tự động ghi vết kiểm toán (AccessAuditLogs)."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Table
          dataSource={MATRIX_DATA}
          columns={columns}
          pagination={false}
          size="small"
          bordered
        />
      </Card>
    </div>
  );
}
