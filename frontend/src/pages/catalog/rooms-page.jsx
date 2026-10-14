import { useState, useEffect } from 'react';
import { Card, Table, Button, Tag, Space, Modal, Form, Input, Select, Badge, message, Popconfirm, Typography } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { catalogApi, userApi } from '../../services/api-client.js';
import { useAuth } from '../../context/auth-context.jsx';

const { Text } = Typography;

const ROOM_TYPES = [
  { value: 'CHAIR', label: 'Ghế điều trị nha khoa', color: 'blue' },
  { value: 'ROOM', label: 'Phòng khám tổng quát', color: 'green' },
  { value: 'STERILIZATION', label: 'Phòng tiệt trùng', color: 'purple' },
  { value: 'LAB', label: 'Phòng Labo nha khoa', color: 'orange' },
];

export function RoomsPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();

  const isAdmin = user?.role === 'ADMIN';

  const loadData = async () => {
    setLoading(true);
    try {
      const [rRes, bRes] = await Promise.all([
        catalogApi.getRooms(),
        userApi.getBranches(),
      ]);
      setRooms(rRes.data || []);
      setBranches(bRes.data || []);
    } catch (err) {
      message.error('Không thể tải danh sách phòng/ghế');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (values) => {
    try {
      await catalogApi.createRoom(values);
      message.success('Thêm phòng/ghế thành công');
      setModalOpen(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tạo phòng/ghế');
    }
  };

  const handleDelete = async (roomId) => {
    try {
      await catalogApi.deleteRoom(roomId);
      message.success('Đã xóa phòng/ghế (Soft-Delete)');
      loadData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể xóa');
    }
  };

  const columns = [
    { title: 'Mã phòng/ghế', dataIndex: 'code', key: 'code', render: (c) => <Text code strong>{c}</Text> },
    { title: 'Tên hiển thị', dataIndex: 'name', key: 'name', render: (n) => <strong>{n}</strong> },
    {
      title: 'Loại phòng/thiết bị',
      dataIndex: 'roomType',
      key: 'roomType',
      render: (type) => {
        const item = ROOM_TYPES.find(t => t.value === type) || { label: type, color: 'default' };
        return <Tag color={item.color}>{item.label}</Tag>;
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (val) => val ? <Badge status="success" text="Sẵn sàng hoạt động" /> : <Badge status="error" text="Bảo trì" />,
    },
    ...(isAdmin
      ? [
          {
            title: 'Thao tác',
            key: 'actions',
            render: (_, record) => (
              <Popconfirm
                title="Xác nhận xóa mềm phòng/ghế?"
                description="Bản ghi sẽ được chuyển vào Rooms_Deleted thông qua trigger SQL."
                onConfirm={() => handleDelete(record.roomId)}
                okText="Xóa"
                cancelText="Hủy"
              >
                <Button danger icon={<DeleteOutlined />} size="small">
                  Xóa
                </Button>
              </Popconfirm>
            ),
          },
        ]
      : []),
  ];

  return (
    <Card
      title="Module 2: Quản lý Phòng khám & Ghế điều trị (Rooms & Chairs)"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadData}>Làm mới</Button>
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)} style={{ background: '#08979c', borderColor: '#08979c' }}>
              Thêm phòng / Ghế
            </Button>
          )}
        </Space>
      }
    >
      <Table dataSource={rooms} columns={columns} rowKey="roomId" loading={loading} pagination={{ pageSize: 10 }} />

      <Modal
        title="Thêm phòng khám hoặc ghế nha khoa"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="branchId" label="Chi nhánh" rules={[{ required: true, message: 'Chọn chi nhánh' }]}>
            <Select placeholder="Chọn chi nhánh">
              {branches.map(b => <Select.Option key={b.branchId} value={b.branchId}>{b.name} ({b.code})</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="code" label="Mã phòng/ghế" rules={[{ required: true, message: 'Nhập mã (ví dụ: CHAIR-02)' }]}>
            <Input placeholder="ví dụ: GHE-01" />
          </Form.Item>
          <Form.Item name="name" label="Tên phòng/ghế" rules={[{ required: true, message: 'Nhập tên hiển thị' }]}>
            <Input placeholder="ví dụ: Ghế điều trị nha khoa số 2" />
          </Form.Item>
          <Form.Item name="roomType" label="Loại phòng/chức năng" initialValue="CHAIR" rules={[{ required: true }]}>
            <Select>
              {ROOM_TYPES.map(t => <Select.Option key={t.value} value={t.value}>{t.label}</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#08979c', borderColor: '#08979c' }}>
                Lưu
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
