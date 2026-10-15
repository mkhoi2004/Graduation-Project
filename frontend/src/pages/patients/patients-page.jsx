import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Alert,
  message,
  Typography,
  Descriptions,
  Badge,
} from 'antd';
import {
  UserAddOutlined,
  SearchOutlined,
  ReloadOutlined,
  EyeOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { patientApi } from '../../services/api-client.js';
import { useAuth } from '../../context/auth-context.jsx';

const { Text } = Typography;

function formatDateOnly(value) {
  if (!value) return '—';
  const [year, month, day] = String(value).slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
}

export function PatientsPage() {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [pendingValues, setPendingValues] = useState(null);
  const [form] = Form.useForm();

  const canCreate = user?.role === 'ADMIN' || user?.role === 'RECEPTIONIST';

  const loadPatients = async () => {
    setLoading(true);
    try {
      const res = await patientApi.getPatients({ search });
      setPatients(res.data?.items || []);
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tải danh sách bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPatients();
  }, [search]);

  const handleCreate = async (values, confirmDuplicate = false) => {
    try {
      const payload = {
        fullName: values.fullName,
        phone: values.phone,
        email: values.email,
        gender: values.gender,
        dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
        birthYear: values.birthYear ? parseInt(values.birthYear, 10) : undefined,
        allergy: values.allergy,
        allergyReaction: values.allergyReaction,
        medicalHistory: values.medicalHistory,
        guardianName: values.guardianName,
        confirmDuplicatePhone: confirmDuplicate,
      };

      const res = await patientApi.createPatient(payload);

      // AT-05 Check: Duplicate phone warning handling
      if (res.status === 'warning' && res.warning === 'PHONE_DUPLICATE_WARNING') {
        setDuplicateWarning(res);
        setPendingValues(values);
        return;
      }

      message.success('Tạo hồ sơ bệnh nhân thành công');
      setCreateModalOpen(false);
      setDuplicateWarning(null);
      setPendingValues(null);
      form.resetFields();
      loadPatients();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tạo bệnh nhân');
    }
  };

  const handleConfirmDuplicate = () => {
    if (pendingValues) {
      handleCreate(pendingValues, true);
    }
  };

  const viewDetail = async (patientId) => {
    try {
      const res = await patientApi.getPatientById(patientId);
      setSelectedPatient(res.data);
      setDetailModalOpen(true);
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể xem chi tiết (Kiểm tra quyền phân công bác sĩ)');
    }
  };

  const columns = [
    { title: 'Mã BN', dataIndex: 'patientCode', key: 'patientCode', render: (c) => <Text code strong>{c}</Text> },
    { title: 'Họ và tên', dataIndex: 'fullName', key: 'fullName', render: (n) => <strong>{n}</strong> },
    { title: 'Số điện thoại', dataIndex: 'phone', key: 'phone', render: (p) => p || '—' },
    {
      title: 'Ngày/Năm sinh',
      key: 'dob',
      render: (_, r) => r.dateOfBirth ? formatDateOnly(r.dateOfBirth) : r.birthYear || '—',
    },
    {
      title: 'Giới tính',
      dataIndex: 'gender',
      key: 'gender',
      render: (g) => g === 'MALE' ? 'Nam' : g === 'FEMALE' ? 'Nữ' : 'Khác',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (s) => <Badge status={s === 'ACTIVE' ? 'success' : 'default'} text={s} />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Button icon={<EyeOutlined />} size="small" onClick={() => viewDetail(record.patientId)}>
          Chi tiết
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Hồ sơ bệnh nhân"
      extra={
        <Space>
          <Input
            placeholder="Tìm theo tên, mã hoặc SĐT..."
            prefix={<SearchOutlined />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
            allowClear
          />
          <Button icon={<ReloadOutlined />} onClick={loadPatients}>Làm mới</Button>
          {canCreate && (
            <Button type="primary" icon={<UserAddOutlined />} onClick={() => setCreateModalOpen(true)} style={{ background: '#08979c', borderColor: '#08979c' }}>
              Đăng ký bệnh nhân
            </Button>
          )}
        </Space>
      }
    >
      <Table dataSource={patients} columns={columns} rowKey="patientId" loading={loading} pagination={{ pageSize: 10 }} />

      {/* Modal đăng ký bệnh nhân mới */}
      <Modal
        title="Đăng ký hồ sơ bệnh nhân mới"
        open={createModalOpen}
        onCancel={() => { setCreateModalOpen(false); setDuplicateWarning(null); }}
        footer={null}
        destroyOnClose
        width={600}
      >
        {duplicateWarning && (
          <Alert
            message="Cảnh báo trùng số điện thoại (Tiêu chí AT-05)"
            description={
              <div>
                <p>{duplicateWarning.message}</p>
                <div style={{ marginBottom: 12 }}>
                  {duplicateWarning.existingPatients.map(p => (
                    <Tag key={p.patientId} color="volcano">{p.fullName} ({p.patientCode})</Tag>
                  ))}
                </div>
                <Space>
                  <Button type="primary" danger onClick={handleConfirmDuplicate}>
                    Xác nhận tạo hồ sơ riêng sau khi xác minh
                  </Button>
                  <Button onClick={() => setDuplicateWarning(null)}>Hủy bỏ</Button>
                </Space>
              </div>
            }
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={(vals) => handleCreate(vals, false)} requiredMark="optional">
          <Form.Item name="fullName" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ tên bệnh nhân' }]}>
            <Input placeholder="ví dụ: Nguyễn Văn An" />
          </Form.Item>

          <Space style={{ display: 'flex', width: '100%' }} size="middle">
            <Form.Item
              orientation="vertical"
              name="phone"
              label="Số điện thoại"
              style={{ flex: 1 }}
              rules={[{
                pattern: /^(?:0\d{9}|\+[1-9]\d{7,14})$/,
                message: 'Nhập 10 chữ số nội địa hoặc định dạng quốc tế E.164',
                transform: value => value?.replace(/[\s().-]/g, ''),
              }]}
            >
              <Input placeholder="ví dụ: 0901234567" />
            </Form.Item>
            <Form.Item name="gender" label="Giới tính" initialValue="MALE" style={{ width: 140 }}>
              <Select>
                <Select.Option value="MALE">Nam</Select.Option>
                <Select.Option value="FEMALE">Nữ</Select.Option>
                <Select.Option value="OTHER">Khác</Select.Option>
              </Select>
            </Form.Item>
          </Space>

          <Space style={{ display: 'flex', width: '100%' }} size="middle">
            <Form.Item name="dateOfBirth" label="Ngày sinh" style={{ flex: 1 }}>
              <DatePicker
                style={{ width: '100%' }}
                placeholder="Chọn ngày sinh"
                format="DD/MM/YYYY"
                disabledDate={current => current && current.valueOf() > Date.now()}
              />
            </Form.Item>
            <Form.Item name="birthYear" label="Hoặc Năm sinh" style={{ width: 140 }}>
              <Input placeholder="ví dụ: 1995" />
            </Form.Item>
          </Space>

          <Form.Item name="email" label="Email" rules={[{ type: 'email', message: 'Email không đúng định dạng' }]}>
            <Input type="email" autoComplete="email" placeholder="ví dụ: benhnhan@example.com" />
          </Form.Item>

          <Form.Item
            name="guardianName"
            label="Người giám hộ"
            extra="Bắt buộc với bệnh nhân dưới 18 tuổi; backend sẽ kiểm tra lại theo ngày/năm sinh."
          >
            <Input placeholder="Họ tên cha/mẹ/người giám hộ" />
          </Form.Item>

          <Form.Item name="allergy" label="Dị ứng thuốc/thực phẩm (nếu có)">
            <Input placeholder="ví dụ: Penicillin, hải sản..." />
          </Form.Item>

          <Form.Item name="medicalHistory" label="Tiền sử bệnh lý (nếu có)">
            <Input.TextArea placeholder="ví dụ: Cao huyết áp, tiểu đường type 2..." rows={2} />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#08979c', borderColor: '#08979c' }}>
                Đăng ký hồ sơ
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal chi tiết hồ sơ bệnh nhân */}
      <Modal
        title={`Hồ sơ Bệnh nhân: ${selectedPatient?.fullName || ''} (${selectedPatient?.patientCode || ''})`}
        open={detailModalOpen}
        onCancel={() => setDetailModalOpen(false)}
        footer={null}
        width={700}
      >
        {selectedPatient && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mã bệnh nhân">{selectedPatient.patientCode}</Descriptions.Item>
              <Descriptions.Item label="Họ và tên">{selectedPatient.fullName}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{selectedPatient.phone || 'Chưa cung cấp'}</Descriptions.Item>
              <Descriptions.Item label="Giới tính">{selectedPatient.gender}</Descriptions.Item>
              <Descriptions.Item label="Ngày sinh">
                {selectedPatient.dateOfBirth ? formatDateOnly(selectedPatient.dateOfBirth) : selectedPatient.birthYear}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái">
                <Tag color={selectedPatient.status === 'ACTIVE' ? 'success' : 'default'}>{selectedPatient.status}</Tag>
              </Descriptions.Item>
            </Descriptions>

            <div style={{ marginTop: 16 }}>
              <Text strong>Cảnh báo Dị ứng (Allergies):</Text>
              <div style={{ marginTop: 4 }}>
                {selectedPatient.allergies?.length > 0 ? (
                  selectedPatient.allergies.map(a => (
                    <Tag color="red" key={a.allergyId}>⚠️ {a.allergen}: {a.reaction || 'Chưa rõ phản ứng'}</Tag>
                  ))
                ) : (
                  <Tag color="green">Chưa ghi nhận dị ứng</Tag>
                )}
              </div>
            </div>

            <div style={{ marginTop: 16 }}>
              <Text strong>Tiền sử bệnh (Medical History):</Text>
              <div style={{ marginTop: 4 }}>
                {selectedPatient.medicalHistories?.length > 0 ? (
                  selectedPatient.medicalHistories.map(m => (
                    <Tag color="orange" key={m.medicalHistoryId}>{m.description}</Tag>
                  ))
                ) : (
                  <Tag>Bình thường</Tag>
                )}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <Text strong>Lịch sử Lượt khám ({selectedPatient.visits?.length || 0}):</Text>
              <Table
                dataSource={selectedPatient.visits || []}
                rowKey="visitId"
                size="small"
                pagination={false}
                style={{ marginTop: 8 }}
                columns={[
                  { title: 'Mã lượt', dataIndex: 'visitCode', key: 'visitCode' },
                  { title: 'Bác sĩ phụ trách', dataIndex: ['doctor', 'displayName'], key: 'doctor' },
                  { title: 'Ghế/Phòng', dataIndex: ['room', 'name'], key: 'room' },
                  {
                    title: 'Thời điểm',
                    dataIndex: 'registeredAt',
                    key: 'registeredAt',
                    render: (d) => new Date(d).toLocaleString('vi-VN'),
                  },
                  {
                    title: 'Trạng thái',
                    dataIndex: 'status',
                    key: 'status',
                    render: (s) => <Tag color={s === 'CLOSED' ? 'default' : s === 'REGISTERED' ? 'blue' : 'green'}>{s}</Tag>,
                  },
                ]}
              />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}
