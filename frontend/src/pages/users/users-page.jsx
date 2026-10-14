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
  Switch,
  message,
  Tabs,
  Popconfirm,
  Badge,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UndoOutlined,
  ReloadOutlined,
  AuditOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { userApi } from '../../services/api-client.js';

export function UsersPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [deletedUsers, setDeletedUsers] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [roles, setRoles] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  const loadData = async () => {
    setLoading(true);
    try {
      const [uRes, rRes, bRes] = await Promise.all([
        userApi.getUsers({ page: 1, pageSize: 50 }),
        userApi.getRoles(),
        userApi.getBranches(),
      ]);
      setUsers(uRes.data?.items || []);
      setRoles(rRes.data || []);
      setBranches(bRes.data || []);
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  const loadDeleted = async () => {
    setLoading(true);
    try {
      const res = await userApi.getDeletedUsers();
      setDeletedUsers(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tải thùng rác');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const res = await userApi.getAuditLogs({ page: 1, pageSize: 50 });
      setAuditLogs(res.data?.items || []);
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tải nhật ký kiểm toán');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') loadData();
    if (activeTab === 'deleted') loadDeleted();
    if (activeTab === 'audit') loadAuditLogs();
  }, [activeTab]);

  const handleCreate = async (values) => {
    try {
      await userApi.createUser(values);
      message.success('Thêm người dùng mới thành công');
      setModalVisible(false);
      form.resetFields();
      loadData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tạo người dùng');
    }
  };

  const handleDelete = async (userId) => {
    try {
      await userApi.deleteUser(userId);
      message.success('Đã chuyển người dùng vào danh sách lưu trữ (Soft-delete)');
      loadData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể xóa người dùng');
    }
  };

  const handleRestore = async (userId) => {
    try {
      await userApi.restoreUser(userId);
      message.success('Khôi phục tài khoản thành công');
      loadDeleted();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể khôi phục tài khoản');
    }
  };

  const userColumns = [
    { title: 'Tên đăng nhập', dataIndex: 'username', key: 'username', render: (t) => <strong>{t}</strong> },
    { title: 'Họ và tên', dataIndex: 'displayName', key: 'displayName' },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const color = role?.code === 'ADMIN' ? 'red' : role?.code === 'DOCTOR' ? 'blue' : 'green';
        return <Tag color={color}>{role?.name || role?.code}</Tag>;
      },
    },
    {
      title: 'Chi nhánh',
      dataIndex: 'branch',
      key: 'branch',
      render: (b) => b?.name || 'LOCAL',
    },
    {
      title: 'Quyền duyệt',
      dataIndex: 'isApprover',
      key: 'isApprover',
      render: (val) => val ? <Tag color="orange">Người duyệt</Tag> : <Tag>Nhân viên</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (val) => val ? <Badge status="success" text="Hoạt động" /> : <Badge status="error" text="Khóa" />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Popconfirm
            title="Xác nhận xóa mềm?"
            description="Tài khoản sẽ được chuyển sang bảng Users_Deleted thông qua Trigger SQL."
            onConfirm={() => handleDelete(record.userId)}
            okText="Xóa"
            cancelText="Hủy"
          >
            <Button danger icon={<DeleteOutlined />} size="small" disabled={record.username === 'admin'}>
              Xóa mềm
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const deletedColumns = [
    { title: 'Tên đăng nhập', dataIndex: 'Username', key: 'Username', render: (t) => <strong>{t}</strong> },
    { title: 'Họ và tên', dataIndex: 'DisplayName', key: 'DisplayName' },
    { title: 'Vai trò', dataIndex: 'RoleName', key: 'RoleName', render: (t) => <Tag color="default">{t}</Tag> },
    { title: 'Thời điểm xóa', dataIndex: 'DeletedAt', key: 'DeletedAt', render: (d) => new Date(d).toLocaleString('vi-VN') },
    { title: 'Người thực hiện xóa', dataIndex: 'DeletedBy', key: 'DeletedBy', render: (u) => <Tag color="volcano">{u}</Tag> },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Button icon={<UndoOutlined />} type="primary" size="small" onClick={() => handleRestore(record.UserId)}>
          Khôi phục
        </Button>
      ),
    },
  ];

  const auditColumns = [
    { title: 'Thời gian', dataIndex: 'createdAt', key: 'createdAt', render: (d) => new Date(d).toLocaleString('vi-VN') },
    { title: 'Người thực hiện', dataIndex: 'actorName', key: 'actorName', render: (t) => <strong>{t}</strong> },
    { title: 'Vai trò', dataIndex: 'roleCode', key: 'roleCode', render: (t) => <Tag>{t || 'Hệ thống'}</Tag> },
    { title: 'Mục đích', dataIndex: 'purpose', key: 'purpose' },
    { title: 'Hành động', dataIndex: 'action', key: 'action', render: (a) => <Tag color="geekblue">{a}</Tag> },
    { title: 'Đối tượng', dataIndex: 'objectType', key: 'objectType' },
    {
      title: 'Kết quả',
      dataIndex: 'outcome',
      key: 'outcome',
      render: (out) => (
        <Tag color={out === 'ALLOWED' ? 'success' : out === 'DENIED' ? 'error' : 'warning'}>
          {out}
        </Tag>
      ),
    },
  ];

  return (
    <Card
      title="Module 1: Quản trị Người dùng, Phân quyền & Audit Log"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => {
            if (activeTab === 'users') loadData();
            if (activeTab === 'deleted') loadDeleted();
            if (activeTab === 'audit') loadAuditLogs();
          }}>Làm mới</Button>
          {activeTab === 'users' && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)} style={{ background: '#08979c', borderColor: '#08979c' }}>
              Tạo tài khoản mới
            </Button>
          )}
        </Space>
      }
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'users',
            label: <span><UserOutlined /> Danh sách tài khoản ({users.length})</span>,
            children: <Table dataSource={users} columns={userColumns} rowKey="userId" loading={loading} pagination={{ pageSize: 10 }} />,
          },
          {
            key: 'deleted',
            label: <span><DeleteOutlined /> Thùng rác Soft-Delete ({deletedUsers.length})</span>,
            children: <Table dataSource={deletedUsers} columns={deletedColumns} rowKey="UserId" loading={loading} pagination={{ pageSize: 10 }} />,
          },
          {
            key: 'audit',
            label: <span><AuditOutlined /> Nhật ký kiểm toán AccessAuditLogs</span>,
            children: <Table dataSource={auditLogs} columns={auditColumns} rowKey="auditId" loading={loading} pagination={{ pageSize: 15 }} />,
          },
        ]}
      />

      <Modal
        title="Tạo tài khoản người dùng mới"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="username" label="Tên đăng nhập" rules={[{ required: true, message: 'Nhập tên đăng nhập' }]}>
            <Input placeholder="ví dụ: bacsi_lan" />
          </Form.Item>
          <Form.Item name="displayName" label="Họ và tên" rules={[{ required: true, message: 'Nhập họ và tên' }]}>
            <Input placeholder="ví dụ: BS. Nguyễn Thị Lan" />
          </Form.Item>
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Nhập mật khẩu' },
              { min: 9, message: 'Mật khẩu phải từ 9 ký tự trở lên' },
            ]}
            extra="Mật khẩu phải gồm chữ hoa, chữ thường, số và ít nhất một ký tự đặc biệt"
          >
            <Input.Password placeholder="Nhập mật khẩu an toàn" />
          </Form.Item>
          <Form.Item name="roleId" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}>
            <Select placeholder="Chọn vai trò">
              {roles.map(r => <Select.Option key={r.roleId} value={r.roleId}>{r.name} ({r.code})</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="branchId" label="Chi nhánh" rules={[{ required: true, message: 'Chọn chi nhánh' }]}>
            <Select placeholder="Chọn chi nhánh">
              {branches.map(b => <Select.Option key={b.branchId} value={b.branchId}>{b.name} ({b.code})</Select.Option>)}
            </Select>
          </Form.Item>
          <Form.Item name="isApprover" label="Quyền duyệt chứng từ (Maker-Checker)" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setModalVisible(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#08979c', borderColor: '#08979c' }}>
                Lưu người dùng
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
