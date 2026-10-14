import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Select,
  Input,
  message,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  StopOutlined,
} from '@ant-design/icons';
import { visitApi, patientApi, userApi, catalogApi } from '../../services/api-client.js';
import { useAuth } from '../../context/auth-context.jsx';

const { Text } = Typography;

const statusColorMap = {
  REGISTERED: 'blue',
  IN_PROGRESS: 'processing',
  CLINICAL_COMPLETED: 'purple',
  CLOSED: 'default',
  ON_HOLD: 'warning',
  CANCELLED: 'error',
};

const statusLabelMap = {
  REGISTERED: 'Đã tiếp nhận',
  IN_PROGRESS: 'Đang khám/điều trị',
  CLINICAL_COMPLETED: 'Khám hoàn tất',
  CLOSED: 'Đã đóng ca',
  ON_HOLD: 'Tạm hoãn',
  CANCELLED: 'Đã hủy',
};

export function VisitsPage() {
  const { user } = useAuth();
  const [visits, setVisits] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  const isReceptionistOrAdmin = user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST';
  const isDoctor = user?.role === 'DOCTOR';

  const loadData = async () => {
    setLoading(true);
    try {
      const [vRes, pRes, uRes, rRes] = await Promise.all([
        visitApi.getVisits(),
        patientApi.getPatients({ pageSize: 100 }),
        userApi.getUsers({ pageSize: 100 }),
        catalogApi.getRooms(),
      ]);
      setVisits(vRes.data || []);
      setPatients(pRes.data?.items || []);
      // Filter active doctors
      const allUsers = uRes.data?.items || [];
      setDoctors(allUsers.filter(u => u.role?.code === 'DOCTOR'));
      setRooms(rRes.data || []);
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tải danh sách lượt khám');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (values) => {
    try {
      await visitApi.createVisit({
        patientId: values.patientId,
        doctorId: values.doctorId,
        roomId: values.roomId,
        branchId: user?.branchId,
        visitType: values.visitType,
        paymentType: values.paymentType,
      });
      message.success('Tiếp nhận lượt khám thành công (Đã thiết lập quan hệ điều trị)');
      setCreateModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tiếp nhận');
    }
  };

  const handleUpdateStatus = async (visitId, newStatus, reason) => {
    try {
      await visitApi.updateVisitStatus(visitId, { newStatus, reason });
      message.success(`Đã chuyển trạng thái lượt khám sang: ${statusLabelMap[newStatus]}`);
      loadData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể đổi trạng thái');
    }
  };

  const columns = [
    { title: 'Mã lượt', dataIndex: 'visitCode', key: 'visitCode', render: (c) => <Text code strong>{c}</Text> },
    {
      title: 'Bệnh nhân',
      key: 'patient',
      render: (_, r) => <div><strong>{r.patient?.fullName}</strong><div style={{ fontSize: '11px', color: '#8c8c8c' }}>{r.patient?.phone}</div></div>,
    },
    {
      title: 'Bác sĩ khám',
      dataIndex: ['doctor', 'displayName'],
      key: 'doctor',
      render: (d) => <Tag color="blue">{d || 'Chưa gán'}</Tag>,
    },
    {
      title: 'Ghế / Phòng',
      dataIndex: ['room', 'name'],
      key: 'room',
      render: (r) => r ? <Tag>{r}</Tag> : <Text type="secondary">Chưa chọn</Text>,
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentType',
      key: 'paymentType',
      render: (p) => p === 'BHTM_GUARANTEE' ? <Tag color="gold">BHTM Bảo lãnh</Tag> : <Tag color="cyan">Tự chi trả</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Tag color={statusColorMap[s] || 'default'}>{statusLabelMap[s] || s}</Tag>,
    },
    {
      title: 'Thao tác chuyển trạng thái',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          {record.status === 'REGISTERED' && (isDoctor || isReceptionistOrAdmin) && (
            <Button
              size="small"
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleUpdateStatus(record.visitId, 'IN_PROGRESS', 'Bác sĩ bắt đầu buổi khám')}
              style={{ background: '#13c2c2', borderColor: '#13c2c2' }}
            >
              Vào khám
            </Button>
          )}

          {record.status === 'IN_PROGRESS' && (isDoctor || user?.role === 'ADMIN') && (
            <Button
              size="small"
              type="primary"
              icon={<CheckCircleOutlined />}
              onClick={() => handleUpdateStatus(record.visitId, 'CLINICAL_COMPLETED', 'Bác sĩ hoàn thành khám và tư vấn')}
              style={{ background: '#52c41a', borderColor: '#52c41a' }}
            >
              Hoàn tất khám
            </Button>
          )}

          {record.status === 'CLINICAL_COMPLETED' && isReceptionistOrAdmin && (
            <Button
              size="small"
              onClick={() => handleUpdateStatus(record.visitId, 'CLOSED', 'Đóng lượt khám')}
            >
              Đóng ca
            </Button>
          )}

          {record.status !== 'CLOSED' && record.status !== 'CANCELLED' && isReceptionistOrAdmin && (
            <Button
              size="small"
              danger
              icon={<StopOutlined />}
              onClick={() => handleUpdateStatus(record.visitId, 'CANCELLED', 'Bệnh nhân xin hủy lượt')}
            >
              Hủy
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="Module 4: Quản lý Lịch hẹn & Lượt khám (Visits & Appointments)"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>Làm mới</Button>
          {isReceptionistOrAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)} style={{ background: '#08979c', borderColor: '#08979c' }}>
              Tiếp nhận lượt mới
            </Button>
          )}
        </Space>
      }
    >
      <Table dataSource={visits} columns={columns} rowKey="visitId" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title="Tiếp nhận lượt khám mới (Tạo Visit & Quan hệ điều trị)"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="patientId" label="Bệnh nhân" rules={[{ required: true, message: 'Chọn bệnh nhân' }]}>
            <Select showSearch placeholder="Tìm và chọn bệnh nhân" optionFilterProp="label">
              {patients.map(p => (
                <Select.Option key={p.patientId} value={p.patientId} label={`${p.fullName} ${p.phone}`}>
                  {p.fullName} — {p.phone || 'Không SĐT'} ({p.patientCode})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="doctorId" label="Bác sĩ phụ trách khám" rules={[{ required: true, message: 'Chọn bác sĩ' }]}>
            <Select placeholder="Chọn bác sĩ khám">
              {doctors.map(d => (
                <Select.Option key={d.userId} value={d.userId}>
                  {d.displayName} (@{d.username})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="roomId" label="Ghế điều trị / Phòng khám">
            <Select placeholder="Chọn ghế nha khoa">
              {rooms.map(r => (
                <Select.Option key={r.roomId} value={r.roomId}>
                  {r.name} ({r.code})
                </Select.Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item name="visitType" label="Loại lượt khám" initialValue="FIRST_VISIT">
            <Select>
              <Select.Option value="FIRST_VISIT">Khám lần đầu</Select.Option>
              <Select.Option value="FOLLOW_UP">Tái khám theo lịch</Select.Option>
              <Select.Option value="TREATMENT">Tiếp tục liệu trình điều trị</Select.Option>
              <Select.Option value="EMERGENCY">Cấp cứu nha khoa</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item name="paymentType" label="Hình thức thanh toán dự kiến" initialValue="SELF_PAY">
            <Select>
              <Select.Option value="SELF_PAY">Bệnh nhân tự chi trả</Select.Option>
              <Select.Option value="BHTM_GUARANTEE">Bảo hiểm thương mại bảo lãnh</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#08979c', borderColor: '#08979c' }}>
                Xác nhận tiếp nhận
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
