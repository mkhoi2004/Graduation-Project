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
  InputNumber,
  Switch,
  DatePicker,
  Tabs,
  Badge,
  message,
  Popconfirm,
  Typography,
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UndoOutlined,
  ReloadOutlined,
  DollarOutlined,
  CheckOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import { catalogApi } from '../../services/api-client.js';
import { useAuth } from '../../context/auth-context.jsx';

const { Text } = Typography;

function formatVND(val) {
  if (!val) return '—';
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(val));
}

export function ServicesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('services');
  const [services, setServices] = useState([]);
  const [deletedServices, setDeletedServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [priceModalOpen, setPriceModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [form] = Form.useForm();
  const [priceForm] = Form.useForm();

  const isAdmin = user?.role === 'ADMIN';
  const canApprove = user?.isApprover || isAdmin;

  const loadServices = async () => {
    setLoading(true);
    try {
      const res = await catalogApi.getServices();
      setServices(res.data?.items || []);
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tải danh mục dịch vụ');
    } finally {
      setLoading(false);
    }
  };

  const loadDeleted = async () => {
    setLoading(true);
    try {
      const res = await catalogApi.getDeletedServices();
      setDeletedServices(res.data || []);
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tải danh sách lưu trữ');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'services') loadServices();
    if (activeTab === 'deleted') loadDeleted();
  }, [activeTab]);

  const handleCreate = async (values) => {
    try {
      await catalogApi.createService({
        code: values.code,
        name: values.name,
        requiresConsent: values.requiresConsent,
        requiresSterilePack: values.requiresSterilePack,
        initialPrice: values.initialPrice,
      });
      message.success('Tạo dịch vụ mới thành công');
      setCreateModalOpen(false);
      form.resetFields();
      loadServices();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tạo dịch vụ');
    }
  };

  const handleDelete = async (serviceId) => {
    try {
      await catalogApi.deleteService(serviceId);
      message.success('Đã chuyển dịch vụ vào thùng rác Soft-Delete');
      loadServices();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể xóa dịch vụ');
    }
  };

  const handleRestore = async (serviceId) => {
    try {
      await catalogApi.restoreService(serviceId);
      message.success('Khôi phục dịch vụ thành công');
      loadDeleted();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể khôi phục');
    }
  };

  const openPriceModal = async (service) => {
    try {
      const res = await catalogApi.getServiceById(service.serviceId);
      setSelectedService(res.data);
      setPriceModalOpen(true);
    } catch (err) {
      message.error('Không thể lấy lịch sử giá');
    }
  };

  const handleAddPrice = async (values) => {
    try {
      await catalogApi.createPriceVersion(selectedService.serviceId, {
        unitPrice: values.unitPrice,
        effectiveFrom: values.effectiveFrom.toISOString(),
      });
      message.success('Tạo phiên bản giá nháp mới thành công');
      priceForm.resetFields();
      // Reload service details
      const res = await catalogApi.getServiceById(selectedService.serviceId);
      setSelectedService(res.data);
      loadServices();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể tạo phiên bản giá');
    }
  };

  const handleApprovePrice = async (versionId) => {
    try {
      await catalogApi.approvePriceVersion(selectedService.serviceId, versionId);
      message.success('Phê duyệt phiên bản giá thành công');
      const res = await catalogApi.getServiceById(selectedService.serviceId);
      setSelectedService(res.data);
      loadServices();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể duyệt giá');
    }
  };

  const columns = [
    { title: 'Mã DV', dataIndex: 'code', key: 'code', render: (c) => <Text code strong>{c}</Text> },
    { title: 'Tên dịch vụ', dataIndex: 'name', key: 'name', render: (n) => <strong>{n}</strong> },
    {
      title: 'Giá hiện hành',
      dataIndex: 'currentPrice',
      key: 'currentPrice',
      render: (price) => <span style={{ color: '#08979c', fontWeight: 'bold' }}>{formatVND(price)}</span>,
    },
    {
      title: 'Đồng thuận',
      dataIndex: 'requiresConsent',
      key: 'requiresConsent',
      render: (val) => val ? <Tag color="orange">Cần ký</Tag> : <Tag color="default">Không</Tag>,
    },
    {
      title: 'Gói vô trùng',
      dataIndex: 'requiresSterilePack',
      key: 'requiresSterilePack',
      render: (val) => val ? <Tag color="cyan">Cần gói</Tag> : <Tag color="default">Không</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (val) => val ? <Badge status="success" text="Hoạt động" /> : <Badge status="error" text="Ngưng" />,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button icon={<HistoryOutlined />} size="small" onClick={() => openPriceModal(record)}>
            Bảng giá ({record.priceVersionNo ? `v${record.priceVersionNo}` : 'Chưa có'})
          </Button>
          {isAdmin && (
            <Popconfirm
              title="Xác nhận xóa mềm?"
              description="Dịch vụ sẽ được chuyển sang bảng Services_Deleted qua trigger SQL."
              onConfirm={() => handleDelete(record.serviceId)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button danger icon={<DeleteOutlined />} size="small" />
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const deletedColumns = [
    { title: 'Mã DV', dataIndex: 'Code', key: 'Code', render: (c) => <Text code>{c}</Text> },
    { title: 'Tên dịch vụ', dataIndex: 'Name', key: 'Name' },
    { title: 'Thời điểm xóa', dataIndex: 'DeletedAt', key: 'DeletedAt', render: (d) => new Date(d).toLocaleString('vi-VN') },
    { title: 'Người xóa', dataIndex: 'DeletedBy', key: 'DeletedBy', render: (u) => <Tag color="volcano">{u}</Tag> },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Button icon={<UndoOutlined />} type="primary" size="small" onClick={() => handleRestore(record.ServiceId)}>
          Khôi phục
        </Button>
      ),
    },
  ];

  return (
    <Card
      title="Module 2: Danh mục Dịch vụ & Phiên bản Giá (ServicePriceVersions)"
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => activeTab === 'services' ? loadServices() : loadDeleted()}>
            Làm mới
          </Button>
          {isAdmin && (
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setCreateModalOpen(true)} style={{ background: '#08979c', borderColor: '#08979c' }}>
              Thêm dịch vụ mới
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
            key: 'services',
            label: `Danh mục dịch vụ (${services.length})`,
            children: <Table dataSource={services} columns={columns} rowKey="serviceId" loading={loading} pagination={{ pageSize: 10 }} />,
          },
          ...(isAdmin
            ? [
                {
                  key: 'deleted',
                  label: `Thùng rác Soft-Delete (${deletedServices.length})`,
                  children: <Table dataSource={deletedServices} columns={deletedColumns} rowKey="ServiceId" loading={loading} pagination={{ pageSize: 10 }} />,
                },
              ]
            : []),
        ]}
      />

      {/* Modal tạo dịch vụ mới */}
      <Modal
        title="Thêm dịch vụ nha khoa mới"
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="code" label="Mã dịch vụ" rules={[{ required: true, message: 'Nhập mã dịch vụ' }]}>
            <Input placeholder="ví dụ: NHORANG_KHON" />
          </Form.Item>
          <Form.Item name="name" label="Tên dịch vụ" rules={[{ required: true, message: 'Nhập tên dịch vụ' }]}>
            <Input placeholder="ví dụ: Nhổ răng khôn hàm dưới" />
          </Form.Item>
          <Form.Item name="initialPrice" label="Đơn giá ban đầu (VNĐ)">
            <InputNumber
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              placeholder="ví dụ: 1,500,000"
            />
          </Form.Item>
          <Space style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <Form.Item name="requiresConsent" label="Cần ký đồng thuận" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
            <Form.Item name="requiresSterilePack" label="Cần gói vô trùng" valuePropName="checked" style={{ marginBottom: 0 }}>
              <Switch />
            </Form.Item>
          </Space>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCreateModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" style={{ background: '#08979c', borderColor: '#08979c' }}>
                Lưu dịch vụ
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal quản lý phiên bản giá (AT-16 & AT-21) */}
      <Modal
        title={`Quản lý Phiên bản Giá: ${selectedService?.name || ''} (${selectedService?.code || ''})`}
        open={priceModalOpen}
        onCancel={() => setPriceModalOpen(false)}
        width={750}
        footer={null}
      >
        <div style={{ marginBottom: 16 }}>
          <Table
            dataSource={selectedService?.priceVersions || []}
            rowKey="priceVersionId"
            size="small"
            pagination={false}
            columns={[
              { title: 'Phiên bản', dataIndex: 'versionNo', key: 'versionNo', render: (v) => <Tag color="blue">v{v}</Tag> },
              { title: 'Đơn giá', dataIndex: 'unitPrice', key: 'unitPrice', render: (p) => <strong>{formatVND(p)}</strong> },
              { title: 'Hiệu lực từ', dataIndex: 'effectiveFrom', key: 'effectiveFrom', render: (d) => new Date(d).toLocaleDateString('vi-VN') },
              { title: 'Hiệu lực đến', dataIndex: 'effectiveTo', key: 'effectiveTo', render: (d) => d ? new Date(d).toLocaleDateString('vi-VN') : 'Hiện hành' },
              {
                title: 'Trạng thái',
                dataIndex: 'status',
                key: 'status',
                render: (s) => (
                  <Tag color={s === 'APPROVED' ? 'success' : s === 'DRAFT' ? 'warning' : 'default'}>
                    {s}
                  </Tag>
                ),
              },
              {
                title: 'Duyệt (Maker-Checker)',
                key: 'action',
                render: (_, record) => {
                  if (record.status === 'DRAFT' && canApprove) {
                    return (
                      <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => handleApprovePrice(record.priceVersionId)}>
                        Phê duyệt
                      </Button>
                    );
                  }
                  return <Text type="secondary">—</Text>;
                },
              },
            ]}
          />
        </div>

        {isAdmin && (
          <Card size="small" title="Tạo phiên bản giá mới (AT-16: Lưu giữ giá cũ cho giao dịch đã lập)">
            <Form form={priceForm} layout="inline" onFinish={handleAddPrice}>
              <Form.Item name="unitPrice" label="Đơn giá mới" rules={[{ required: true, message: 'Nhập giá' }]}>
                <InputNumber
                  style={{ width: 160 }}
                  formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
                  placeholder="Giá mới (VNĐ)"
                />
              </Form.Item>
              <Form.Item name="effectiveFrom" label="Hiệu lực từ" rules={[{ required: true, message: 'Chọn ngày' }]}>
                <DatePicker style={{ width: 140 }} />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" style={{ background: '#08979c', borderColor: '#08979c' }}>
                  Tạo bản nháp
                </Button>
              </Form.Item>
            </Form>
          </Card>
        )}
      </Modal>
    </Card>
  );
}
