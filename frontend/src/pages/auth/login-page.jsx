import { useState } from 'react';
import { Card, Form, Input, Button, Alert, Typography, Divider, Space, Tag } from 'antd';
import { UserOutlined, LockOutlined, LoginOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/auth-context.jsx';

const { Title, Text, Paragraph } = Typography;

const DEMO_ACCOUNTS = [
  { role: 'Admin', username: 'admin', password: 'Admin1234@', color: 'red', desc: 'Toàn quyền cấu hình & xem audit' },
  { role: 'Tiếp nhận', username: 'receptionist', password: 'Receptionist1234@', color: 'green', desc: 'Đặt lịch, tiếp nhận & thu ngân' },
  { role: 'Bác sĩ', username: 'doctor', password: 'Doctor1234@', color: 'blue', desc: 'Khám, chẩn đoán & ký EMR' },
  { role: 'Kế toán', username: 'accountant', password: 'Accountant1234@', color: 'gold', desc: 'Kiểm chứng từ, hóa đơn' },
  { role: 'Kế toán duyệt', username: 'approver', password: 'Approver1234@', color: 'orange', desc: 'Duyệt chứng từ (IsApprover=1)' },
  { role: 'Quản lý kho', username: 'warehouse', password: 'WarehouseManager1234@', color: 'purple', desc: 'Nhập xuất tồn, lô, tiệt trùng' },
];

export function LoginPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleFinish = async (values) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await login(values.username, values.password);
      navigate('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (acc) => {
    form.setFieldsValue({ username: acc.username, password: acc.password });
    setErrorMsg('');
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #e6fffb 0%, #e6f7ff 100%)',
      padding: '24px',
    }}>
      <Card style={{ width: '100%', maxWidth: 440, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', borderRadius: 12 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#08979c',
            color: '#fff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
            fontWeight: 'bold',
            marginBottom: 12,
          }}>
            N
          </div>
          <Title level={3} style={{ margin: 0, color: '#002329' }}>Hệ thống Quản lý Nha khoa</Title>
          <Text type="secondary">Phòng khám Local · Đăng nhập hệ thống</Text>
        </div>

        {errorMsg && (
          <Alert message={errorMsg} type="error" showIcon style={{ marginBottom: 16 }} closable onClose={() => setErrorMsg('')} />
        )}

        <Form form={form} layout="vertical" onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            name="username"
            label="Tên đăng nhập"
            rules={[{ required: true, message: 'Vui lòng nhập tên đăng nhập' }]}
          >
            <Input prefix={<UserOutlined style={{ color: '#bfbfbf' }} />} placeholder="Ví dụ: admin" size="large" />
          </Form.Item>

          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[{ required: true, message: 'Vui lòng nhập mật khẩu' }]}
          >
            <Input.Password prefix={<LockOutlined style={{ color: '#bfbfbf' }} />} placeholder="Nhập mật khẩu" size="large" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 12 }}>
            <Button type="primary" htmlType="submit" icon={<LoginOutlined />} loading={loading} block size="large" style={{ background: '#08979c', borderColor: '#08979c' }}>
              Đăng nhập
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ margin: '16px 0', fontSize: '12px' }}>Tài khoản mẫu thử nghiệm (Click để điền)</Divider>

        <Space direction="vertical" style={{ width: '100%' }} size="small">
          {DEMO_ACCOUNTS.map((acc) => (
            <div
              key={acc.username}
              onClick={() => handleQuickLogin(acc)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #f0f0f0',
                background: '#fafafa',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#13c2c2'; e.currentTarget.style.background = '#e6fffb'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#f0f0f0'; e.currentTarget.style.background = '#fafafa'; }}
            >
              <div>
                <Tag color={acc.color}>{acc.role}</Tag>
                <Text code style={{ fontSize: '11px' }}>{acc.username}</Text>
              </div>
              <Text type="secondary" style={{ fontSize: '11px' }}>{acc.desc}</Text>
            </div>
          ))}
        </Space>
      </Card>
    </div>
  );
}
