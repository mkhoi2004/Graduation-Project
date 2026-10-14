import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Table,
  Button,
  Space,
  Tabs,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Statistic,
  Alert,
  Badge,
  Divider,
  message,
} from 'antd';
import {
  SyncOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
  DollarOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  MedicineBoxOutlined,
  ExperimentOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { reconciliationApi, operationsApi } from '../../services/api-client';
import { useAuth } from '../../context/auth-context.jsx';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

export default function ReconciliationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily-report');

  // Dữ liệu
  const [report, setReport] = useState(null);
  const [items, setItems] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [integrityData, setIntegrityData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Bộ lọc
  const [filterDate, setFilterDate] = useState(dayjs());
  const [itemStatusFilter, setItemStatusFilter] = useState('');

  // Modals
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [resolveForm] = Form.useForm();

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm] = Form.useForm();

  const [refundForm] = Form.useForm();

  // Tải dữ liệu ban đầu
  useEffect(() => {
    loadDailyReport();
    loadItems();
    loadAssets();
  }, [filterDate]);

  const loadDailyReport = async () => {
    try {
      setLoading(true);
      const dateStr = filterDate.format('YYYY-MM-DD');
      const res = await reconciliationApi.getDailyReport({ date: dateStr });
      setReport(res);
    } catch (err) {
      console.error(err);
      message.error('Không thể tải Báo cáo đối soát tổng hợp');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const res = await reconciliationApi.getReconciliationItems({
        status: itemStatusFilter || undefined,
      });
      setItems(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadAssets = async () => {
    try {
      const res = await operationsApi.getAssets();
      setAssets(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadMaintenanceLogs = async (assetId) => {
    try {
      const res = await reconciliationApi.getMaintenanceLogs({ assetId });
      setMaintenanceLogs(res || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRunReconciliation = async () => {
    try {
      setLoading(true);
      const dateStr = filterDate.format('YYYY-MM-DD');
      const res = await reconciliationApi.runDailyReconciliation({ date: dateStr });
      message.success(`Đã chạy đối soát thành công! Quét và phát hiện ${res.newAnomaliesCount} sai lệch bất thường.`);
      loadDailyReport();
      loadItems();
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Lỗi khi chạy đối soát');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveItem = async (values) => {
    if (!selectedItem) return;
    try {
      setLoading(true);
      await reconciliationApi.resolveReconciliationItem(selectedItem.reconciliationItemId, values);
      message.success('Đã phân xử giải quyết sai lệch thành công!');
      setShowResolveModal(false);
      setSelectedItem(null);
      resolveForm.resetFields();
      loadItems();
      loadDailyReport();
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Lỗi khi cập nhật phân xử');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaintenance = async (values) => {
    try {
      setLoading(true);
      const payload = {
        ...values,
        performedAt: values.performedAt ? values.performedAt.toISOString() : new Date().toISOString(),
        nextDueAt: values.nextDueAt ? values.nextDueAt.toISOString() : null,
      };
      await reconciliationApi.createMaintenanceLog(payload);
      message.success('Đã ghi nhận nhật ký bảo trì / kiểm định thiết bị thành công!');
      setShowMaintenanceModal(false);
      maintenanceForm.resetFields();
      loadAssets();
      if (values.assetId) {
        loadMaintenanceLogs(values.assetId);
      }
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Lỗi khi lưu bảo trì');
    } finally {
      setLoading(false);
    }
  };

  const handlePostClosingRefund = async (values) => {
    try {
      setLoading(true);
      const res = await reconciliationApi.processPostClosingRefund(values);
      message.success(`[AT-11] Hoàn tiền sau khóa sổ thành công! Mã hoàn tiền: ${res.refundId}, áp dụng kỳ mở: ${res.appliedAccountingPeriod}`);
      refundForm.resetFields();
      loadDailyReport();
    } catch (err) {
      message.error(err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Lỗi khi hoàn tiền');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    try {
      setLoading(true);
      const res = await reconciliationApi.verifySystemIntegrity();
      setIntegrityData(res);
      if (res.status === 'INTEGRITY_VERIFIED') {
        message.success('[AT-19] Kiểm tra toàn vẹn CSDL: 100% Chữ ký số EMR & Khóa ngoại nguyên vẹn!');
      } else {
        message.warning('[Cảnh báo AT-19] Phát hiện sai lệch toàn vẹn dữ liệu!');
      }
    } catch (err) {
      message.error(err?.response?.data?.message || err.message || 'Lỗi khi kiểm tra toàn vẹn');
    } finally {
      setLoading(false);
    }
  };

  // Cấu hình bảng sai lệch
  const itemColumns = [
    {
      title: 'Loại bất thường',
      dataIndex: 'itemType',
      key: 'itemType',
      width: 220,
      render: (type) => <Text strong>{type}</Text>,
    },
    {
      title: 'Mức độ',
      dataIndex: 'severity',
      key: 'severity',
      width: 120,
      render: (sev) => {
        const colorMap = {
          CRITICAL: 'red',
          HIGH: 'volcano',
          MEDIUM: 'gold',
          LOW: 'blue',
        };
        return <Tag color={colorMap[sev] || 'default'}>{sev}</Tag>;
      },
    },
    {
      title: 'Mô tả chi tiết',
      dataIndex: 'description',
      key: 'description',
      ellipsis: false,
    },
    {
      title: 'Người chịu trách nhiệm',
      key: 'owner',
      width: 200,
      render: (_, record) => record.owner?.displayName || record.owner?.username || 'Chưa gán',
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      render: (st) => {
        const colorMap = {
          OPEN: 'error',
          IN_PROGRESS: 'processing',
          RESOLVED: 'success',
          CLOSED: 'default',
        };
        return <Tag color={colorMap[st] || 'default'}>{st}</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 110,
      align: 'right',
      render: (_, record) => (
        record.status !== 'RESOLVED' && record.status !== 'CLOSED' ? (
          <Button
            type="primary"
            size="small"
            onClick={() => {
              setSelectedItem(record);
              resolveForm.setFieldsValue({ status: 'RESOLVED', resolution: '' });
              setShowResolveModal(true);
            }}
          >
            Phân xử
          </Button>
        ) : (
          <Text type="secondary">—</Text>
        )
      ),
    },
  ];

  const pendingItemsCount = items.filter((i) => i.status === 'OPEN').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header Panel */}
      <Card
        style={{
          borderRadius: 8,
          background: 'linear-gradient(90deg, #f6ffed 0%, #ffffff 100%)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
        }}
      >
        <Row align="middle" justify="space-between" gutter={[16, 16]}>
          <Col xs={24} md={14}>
            <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AuditOutlined style={{ color: '#52c41a' }} />
              Đối soát Cuối ngày & Toàn vẹn Hệ thống
            </Title>
            <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
              Quy trình đối soát tự động 5 nguồn bất thường, Tiêu chuẩn AT-11 (Hoàn tiền sau khóa sổ), AT-19 (Toàn vẹn EMR & CSDL) và AT-24 (Báo cáo tổng hợp v14).
            </Paragraph>
          </Col>
          <Col xs={24} md={10} style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, flexWrap: 'wrap' }}>
            <DatePicker
              value={filterDate}
              onChange={(d) => d && setFilterDate(d)}
              format="YYYY-MM-DD"
              allowClear={false}
              style={{ width: 140 }}
            />
            <Button
              type="primary"
              icon={<SyncOutlined spin={loading} />}
              onClick={handleRunReconciliation}
              loading={loading}
            >
              Chạy Đối Soát Tự Động
            </Button>
            <Button
              style={{ backgroundColor: '#52c41a', color: '#fff', borderColor: '#52c41a' }}
              icon={<SafetyCertificateOutlined />}
              onClick={handleVerifyIntegrity}
              loading={loading}
            >
              Kiểm Tra Toàn Vẹn AT-19
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Tabs Menu */}
      <Card bodyStyle={{ padding: '8px 16px' }}>
        <Tabs
          activeKey={activeTab}
          onChange={(k) => {
            setActiveTab(k);
            if (k === 'items') loadItems();
            if (k === 'maintenance') loadAssets();
          }}
          items={[
            {
              key: 'daily-report',
              label: (
                <span>
                  <FileSearchOutlined /> Báo Cáo Cuối Ngày (AT-24)
                </span>
              ),
            },
            {
              key: 'items',
              label: (
                <span>
                  <ExclamationCircleOutlined /> Sai Lệch Đối Soát{' '}
                  <Badge count={pendingItemsCount} style={{ backgroundColor: '#ff4d4f' }} />
                </span>
              ),
            },
            {
              key: 'maintenance',
              label: (
                <span>
                  <ToolOutlined /> Bảo Trì Thiết Bị Y Tế
                </span>
              ),
            },
            {
              key: 'refund-at11',
              label: (
                <span>
                  <DollarOutlined /> Hoàn Tiền Sau Khóa Sổ (AT-11)
                </span>
              ),
            },
            {
              key: 'integrity-at19',
              label: (
                <span>
                  <SafetyCertificateOutlined /> Toàn Vẹn EMR & CSDL (AT-19)
                </span>
              ),
            },
          ]}
        />
      </Card>

      {/* TAB 1: BÁO CÁO CUỐI NGÀY */}
      {activeTab === 'daily-report' && report && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          {/* Dashboard KPIs */}
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Tiền mặt thực thu"
                  value={Number(report.cashAndBilling?.totalActualCash || 0)}
                  precision={0}
                  suffix="đ"
                  valueStyle={{ color: '#1890ff', fontWeight: 600 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Kỳ vọng: {Number(report.cashAndBilling?.totalExpectedCash || 0).toLocaleString('vi-VN')} đ
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Chênh lệch ca thu ngân"
                  value={Number(report.cashAndBilling?.totalDiscrepancy || 0)}
                  precision={0}
                  suffix="đ"
                  valueStyle={{
                    color: Number(report.cashAndBilling?.totalDiscrepancy || 0) === 0 ? '#52c41a' : '#ff4d4f',
                    fontWeight: 600,
                  }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {Number(report.cashAndBilling?.totalDiscrepancy || 0) === 0
                    ? 'Khớp hoàn toàn'
                    : 'Cần phân xử biên bản lệch tiền'}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Doanh thu hóa đơn"
                  value={Number(report.cashAndBilling?.totalBilled || 0)}
                  precision={0}
                  suffix="đ"
                  valueStyle={{ color: '#722ed1', fontWeight: 600 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Số lượng: {report.cashAndBilling?.invoiceCount || 0} hóa đơn
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Sai lệch chờ xử lý"
                  value={report.reconciliationSummary?.pendingAnomalies || 0}
                  valueStyle={{
                    color: (report.reconciliationSummary?.pendingAnomalies || 0) > 0 ? '#ff4d4f' : '#52c41a',
                    fontWeight: 600,
                  }}
                  prefix={<ExclamationCircleOutlined />}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Mức độ nghiêm trọng (Critical): {report.reconciliationSummary?.criticalAnomalies || 0}
                </Text>
              </Card>
            </Col>
          </Row>

          {/* Vận hành & Tiệt trùng / Labo */}
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Card title={<Space><ExperimentOutlined style={{ color: '#13c2c2' }} /> Tiệt Trùng & Kiểm Soát Nhiễm Khuẩn</Space>}>
                <Row gutter={16} style={{ textAlign: 'center' }}>
                  <Col span={8}>
                    <Statistic title="Tổng chu kỳ" value={report.operationsAndSterilization?.totalCycles || 0} />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Đạt chuẩn (PASS)"
                      value={report.operationsAndSterilization?.passedCycles || 0}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Lỗi (FAIL)"
                      value={report.operationsAndSterilization?.failedCycles || 0}
                      valueStyle={{ color: '#ff4d4f' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title={<Space><MedicineBoxOutlined style={{ color: '#fa8c16' }} /> Gia Công Răng Sứ & Khí Cụ Labo</Space>}>
                <Row gutter={16} style={{ textAlign: 'center' }}>
                  <Col span={8}>
                    <Statistic title="Tổng đơn Labo" value={report.operationsAndSterilization?.totalLabOrders || 0} />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Đã nhận hàng"
                      value={report.operationsAndSterilization?.deliveredOrders || 0}
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="Làm lại (Rework)"
                      value={report.operationsAndSterilization?.reworkOrders || 0}
                      valueStyle={{ color: '#faad14' }}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </Space>
      )}

      {/* TAB 2: DANH SÁCH SAI LỆCH CẦN PHÂN XỬ */}
      {activeTab === 'items' && (
        <Card
          title="Các Bất Thường Hệ Thống Tự Động Quét Được"
          extra={
            <Select
              value={itemStatusFilter}
              onChange={(val) => {
                setItemStatusFilter(val);
                reconciliationApi.getReconciliationItems({ status: val || undefined }).then(setItems);
              }}
              style={{ width: 180 }}
            >
              <Option value="">Tất cả trạng thái</Option>
              <Option value="OPEN">Chờ xử lý (OPEN)</Option>
              <Option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</Option>
              <Option value="RESOLVED">Đã giải quyết (RESOLVED)</Option>
              <Option value="CLOSED">Đã đóng (CLOSED)</Option>
            </Select>
          }
        >
          <Table
            columns={itemColumns}
            dataSource={items}
            rowKey="reconciliationItemId"
            pagination={{ pageSize: 10, showTotal: (total) => `Tổng số ${total} mục đối soát` }}
            loading={loading}
          />
        </Card>
      )}

      {/* TAB 3: BẢO TRÌ & HIỆU CHUẨN THIẾT BỊ Y TẾ */}
      {activeTab === 'maintenance' && (
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Title level={4} style={{ margin: 0 }}>Danh Sách Thiết Bị Y Tế & Trạng Thái Vận Hành</Title>
            <Button
              type="primary"
              icon={<ToolOutlined />}
              onClick={() => {
                maintenanceForm.resetFields();
                maintenanceForm.setFieldsValue({
                  maintenanceType: 'PERIODIC_INSPECTION',
                  result: 'PASS',
                  performedAt: dayjs(),
                  performedBy: user?.displayName || user?.username || 'Kỹ thuật viên',
                });
                setShowMaintenanceModal(true);
              }}
            >
              + Ghi Nhận Bảo Trì / Kiểm Định
            </Button>
          </div>

          <Row gutter={[16, 16]}>
            {assets.map((asset) => (
              <Col xs={24} sm={12} md={8} key={asset.assetId}>
                <Card
                  title={asset.name}
                  extra={
                    <Tag color={asset.status === 'ACTIVE' ? 'success' : asset.status === 'MAINTENANCE' ? 'warning' : 'error'}>
                      {asset.status}
                    </Tag>
                  }
                  actions={[
                    <Button
                      type="link"
                      onClick={() => {
                        maintenanceForm.setFieldsValue({ assetId: asset.assetId });
                        loadMaintenanceLogs(asset.assetId);
                      }}
                    >
                      Xem lịch sử bảo trì
                    </Button>,
                  ]}
                >
                  <Paragraph style={{ margin: 0, fontSize: 13 }}>
                    <Text type="secondary">Mã thiết bị:</Text> {asset.assetCode} ({asset.assetType})
                  </Paragraph>
                  <Paragraph style={{ margin: '4px 0 0', fontSize: 13 }}>
                    <Text type="secondary">Hạn hiệu chuẩn:</Text>{' '}
                    {asset.calibrationExpiresAt ? dayjs(asset.calibrationExpiresAt).format('DD/MM/YYYY') : 'Chưa có'}
                  </Paragraph>
                  <Paragraph style={{ margin: '4px 0 0', fontSize: 13 }}>
                    <Text type="secondary">Bảo trì định kỳ kế tiếp:</Text>{' '}
                    {asset.nextMaintenanceDueAt ? dayjs(asset.nextMaintenanceDueAt).format('DD/MM/YYYY') : 'Chưa có'}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>

          {maintenanceLogs.length > 0 && (
            <Card title="Lịch Sử Kiểm Định & Bảo Trì Thiết Bị Đã Chọn">
              <Table
                dataSource={maintenanceLogs}
                rowKey="maintenanceLogId"
                pagination={{ pageSize: 5 }}
                columns={[
                  {
                    title: 'Loại bảo trì',
                    dataIndex: 'maintenanceType',
                    key: 'maintenanceType',
                    render: (t) => <Text strong>{t}</Text>,
                  },
                  {
                    title: 'Thời gian',
                    dataIndex: 'performedAt',
                    key: 'performedAt',
                    render: (d) => dayjs(d).format('DD/MM/YYYY HH:mm'),
                  },
                  {
                    title: 'Kết quả',
                    dataIndex: 'result',
                    key: 'result',
                    render: (r) => <Tag color={r === 'PASS' ? 'green' : 'red'}>{r}</Tag>,
                  },
                  {
                    title: 'Người thực hiện',
                    dataIndex: 'performedBy',
                    key: 'performedBy',
                  },
                  {
                    title: 'Nội dung chi tiết',
                    dataIndex: 'details',
                    key: 'details',
                  },
                ]}
              />
            </Card>
          )}
        </Space>
      )}

      {/* TAB 4: HOÀN TIỀN SAU KHÓA SỔ (AT-11) */}
      {activeTab === 'refund-at11' && (
        <Row justify="center">
          <Col xs={24} md={16} lg={12}>
            <Card title={<Space><DollarOutlined style={{ color: '#1890ff' }} /> Quy Trình Hoàn Tiền Sau Khóa Sổ Kế Toán (AT-11)</Space>}>
              <Alert
                message="Quy tắc kế toán bất biến"
                description="Khi kỳ kế toán trước đã đóng (CLOSED), không được sửa đè chứng từ cũ. Khoản hoàn tiền bắt buộc ghi nhận điều chỉnh vào kỳ kế toán đang MỞ (OPEN) hiện tại, lưu vết liên kết chứng từ thanh toán gốc."
                type="info"
                showIcon
                style={{ marginBottom: 20 }}
              />

              <Form form={refundForm} layout="vertical" onFinish={handlePostClosingRefund}>
                <Form.Item
                  label="Mã Giao Dịch Thanh Toán Gốc (PaymentTransactionId)"
                  name="paymentTransactionId"
                  rules={[{ required: true, message: 'Vui lòng nhập ID giao dịch gốc' }]}
                >
                  <Input placeholder="Nhập UUID thanh toán thuộc kỳ cũ..." />
                </Form.Item>

                <Form.Item
                  label="Số Tiền Hoàn (VNĐ)"
                  name="refundAmount"
                  rules={[{ required: true, message: 'Vui lòng nhập số tiền hoàn' }]}
                >
                  <Input type="number" step="0.01" placeholder="Ví dụ: 300000" suffix="VNĐ" />
                </Form.Item>

                <Form.Item
                  label="Mã Kỳ Kế Toán Đang Mở (Current Open AccountingPeriodId)"
                  name="currentOpenPeriodId"
                  rules={[{ required: true, message: 'Vui lòng nhập ID kỳ kế toán OPEN' }]}
                >
                  <Input placeholder="Nhập UUID kỳ kế toán đang MỞ hiện tại..." />
                </Form.Item>

                <Form.Item
                  label="Lý Do Hoàn Tiền Điều Chỉnh"
                  name="reason"
                  rules={[{ required: true, message: 'Vui lòng nhập lý do hoàn tiền' }]}
                >
                  <TextArea rows={3} placeholder="Ghi rõ lý do hoàn tiền sau khi kỳ trước đã đóng..." />
                </Form.Item>

                <Form.Item>
                  <Button type="primary" htmlType="submit" block loading={loading}>
                    Phê Duyệt & Ghi Nhận Hoàn Tiền Vào Kỳ Mở
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>
        </Row>
      )}

      {/* TAB 5: KIỂM TRA TOÀN VẸN EMR & CSDL (AT-19) */}
      {activeTab === 'integrity-at19' && (
        <Row justify="center">
          <Col xs={24} md={18} lg={14}>
            <Card
              title={<Space><SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Kiểm Tra Toàn Vẹn Cơ Sở Dữ Liệu & Audit (AT-19)</Space>}
              extra={
                <Button type="primary" icon={<SyncOutlined />} onClick={handleVerifyIntegrity} loading={loading}>
                  Quét Toàn Vẹn Ngay
                </Button>
              }
            >
              <Paragraph type="secondary">
                Xác thực định dạng mã băm chữ ký số EMR SHA-256 (64 ký tự hex) trên toàn bộ hồ sơ bệnh án đã ký và kiểm tra toàn vẹn tham chiếu khóa ngoại giữa các bảng nghiệp vụ cốt lõi.
              </Paragraph>

              {integrityData && (
                <Space direction="vertical" size="middle" style={{ width: '100%', marginTop: 10 }}>
                  <Alert
                    message={`Trạng thái: ${integrityData.status}`}
                    description={`Thời điểm kiểm tra: ${dayjs(integrityData.timestamp).format('DD/MM/YYYY HH:mm:ss')}`}
                    type={integrityData.status === 'INTEGRITY_VERIFIED' ? 'success' : 'error'}
                    showIcon
                  />

                  <Row gutter={16}>
                    <Col span={12}>
                      <Card size="small" title="Chữ Ký Số EMR (SHA-256)">
                        <Paragraph style={{ margin: 0 }}>
                          Số lượng đã kiểm tra: <Text strong>{integrityData.emrSignatures?.checkedCount || 0}</Text>
                        </Paragraph>
                        <Paragraph style={{ margin: '4px 0 0' }}>
                          Số bản ghi sai lệch: <Text strong type="danger">{integrityData.emrSignatures?.corruptedCount || 0}</Text>
                        </Paragraph>
                        <Divider style={{ margin: '8px 0' }} />
                        <Tag color={integrityData.emrSignatures?.valid ? 'green' : 'red'}>
                          {integrityData.emrSignatures?.valid ? 'ĐẠT CHUẨN TOÀN VẸN 100%' : 'CÓ NGUY CƠ BỊ SỬA ĐỔI'}
                        </Tag>
                      </Card>
                    </Col>
                    <Col span={12}>
                      <Card size="small" title="Ràng Buộc Khóa Ngoại (Foreign Keys)">
                        <Paragraph style={{ margin: 0 }}>
                          Lượt khám mồ côi (Orphan Visits): <Text strong>{integrityData.foreignKeyIntegrity?.orphanVisits || 0}</Text>
                        </Paragraph>
                        <Paragraph style={{ margin: '4px 0 0' }}>
                          Hóa đơn mồ côi (Orphan Invoices): <Text strong>{integrityData.foreignKeyIntegrity?.orphanInvoices || 0}</Text>
                        </Paragraph>
                        <Divider style={{ margin: '8px 0' }} />
                        <Tag color={integrityData.foreignKeyIntegrity?.valid ? 'green' : 'red'}>
                          {integrityData.foreignKeyIntegrity?.valid ? 'TOÀN VẸN KHÓA NGOẠI 100%' : 'CÓ DỮ LIỆU MỒ CÔI'}
                        </Tag>
                      </Card>
                    </Col>
                  </Row>
                </Space>
              )}
            </Card>
          </Col>
        </Row>
      )}

      {/* Modal Phân xử sai lệch đối soát */}
      <Modal
        title="Phân Xử Sai Lệch Đối Soát"
        open={showResolveModal}
        onCancel={() => setShowResolveModal(false)}
        footer={null}
        destroyOnClose
      >
        {selectedItem && (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Alert
              message={`Bất thường: [${selectedItem.itemType}] - Mức độ: ${selectedItem.severity}`}
              description={selectedItem.description}
              type="warning"
              showIcon
            />

            <Form form={resolveForm} layout="vertical" onFinish={handleResolveItem}>
              <Form.Item
                label="Trạng Thái Xử Lý"
                name="status"
                rules={[{ required: true }]}
              >
                <Select>
                  <Option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</Option>
                  <Option value="RESOLVED">Đã giải quyết (RESOLVED)</Option>
                  <Option value="CLOSED">Đóng vấn đề (CLOSED)</Option>
                </Select>
              </Form.Item>

              <Form.Item
                label="Biên Bản & Hướng Giải Quyết"
                name="resolution"
                rules={[{ required: true, message: 'Vui lòng nhập phương án xử lý' }]}
              >
                <TextArea rows={3} placeholder="Ghi rõ biện pháp đã thực hiện để khắc phục sai lệch..." />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                <Space>
                  <Button onClick={() => setShowResolveModal(false)}>Hủy</Button>
                  <Button type="primary" htmlType="submit" loading={loading}>
                    Xác Nhận Giải Quyết
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Space>
        )}
      </Modal>

      {/* Modal Ghi nhận bảo trì thiết bị */}
      <Modal
        title="Ghi Nhận Bảo Trì / Kiểm Định Thiết Bị Y Tế"
        open={showMaintenanceModal}
        onCancel={() => setShowMaintenanceModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={maintenanceForm} layout="vertical" onFinish={handleCreateMaintenance}>
          <Form.Item
            label="Thiết Bị Y Tế"
            name="assetId"
            rules={[{ required: true, message: 'Vui lòng chọn thiết bị' }]}
          >
            <Select placeholder="-- Chọn thiết bị y tế --">
              {assets.map((a) => (
                <Option key={a.assetId} value={a.assetId}>
                  {a.name} ({a.assetCode})
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item
            label="Loại Nghiệp Vụ"
            name="maintenanceType"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="PERIODIC_INSPECTION">Bảo trì định kỳ</Option>
              <Option value="CALIBRATION">Hiệu chuẩn / Kiểm định</Option>
              <Option value="REPAIR">Sửa chữa đột xuất</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="Kết Quả Đánh Giá"
            name="result"
            rules={[{ required: true }]}
          >
            <Select>
              <Option value="PASS">Đạt chuẩn (PASS - Sẵn sàng vận hành)</Option>
              <Option value="FAIL">Không đạt (FAIL - Tự động chuyển Bảo trì)</Option>
              <Option value="LIMITED">Hạn chế sử dụng (LIMITED)</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Thời Điểm Thực Hiện" name="performedAt">
            <DatePicker showTime style={{ width: '100%' }} format="YYYY-MM-DD HH:mm" />
          </Form.Item>

          <Form.Item label="Hạn Kiểm Định Kế Tiếp" name="nextDueAt">
            <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
          </Form.Item>

          <Form.Item
            label="Người / Đơn Vị Thực Hiện"
            name="performedBy"
            rules={[{ required: true, message: 'Vui lòng nhập người thực hiện' }]}
          >
            <Input placeholder="Tên kỹ sư / trung tâm kiểm định..." />
          </Form.Item>

          <Form.Item label="Chi Tiết Kỹ Thuật" name="details">
            <TextArea rows={2} placeholder="Nội dung kiểm tra, kết quả đo áp lực..." />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setShowMaintenanceModal(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Lưu Nhật Ký
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
