import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Space,
  Modal,
  Form,
  InputNumber,
  Input,
  Select,
  Typography,
  Tabs,
  Row,
  Col,
  Statistic,
  Descriptions,
  message,
  Divider,
  Alert,
  DatePicker,
} from 'antd';
import {
  DollarOutlined,
  LockOutlined,
  AuditOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PlusOutlined,
  ReloadOutlined,
  FileTextOutlined,
  CalendarOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { accountingApi, billingApi } from '../../services/api-client.js';
import { useAuth } from '../../context/auth-context.jsx';

const { Title, Text } = Typography;

export function AccountingPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('reconcile');

  // Master Data
  const [currentShift, setCurrentShift] = useState(null);
  const [discrepancies, setDiscrepancies] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);

  // Modals
  const [countModal, setCountModal] = useState(false);
  const [resolveModal, setResolveModal] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState(null);
  const [createPeriodModal, setCreatePeriodModal] = useState(false);
  const [createEntryModal, setCreateEntryModal] = useState(false);

  // Forms
  const [formCount] = Form.useForm();
  const [formResolve] = Form.useForm();
  const [formPeriod] = Form.useForm();
  const [formEntry] = Form.useForm();

  // Denominations for cash counting
  const denominations = [500000, 200000, 100000, 50000, 20000, 10000, 5000, 2000, 1000];

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [shiftRes, discRes, perRes, accRes, entriesRes] = await Promise.all([
        billingApi.getCurrentShift().catch(() => ({ data: null })),
        accountingApi.getDiscrepancies(),
        accountingApi.getPeriods(),
        accountingApi.getAccounts(),
        accountingApi.getJournalEntries(),
      ]);

      setCurrentShift(shiftRes.data || null);
      setDiscrepancies(discRes.data || []);
      setPeriods(perRes.data || []);
      setAccounts(accRes.data || []);
      setJournalEntries(entriesRes.data || []);
    } catch (err) {
      message.error(err.message || 'Không thể tải dữ liệu kế toán');
    } finally {
      setLoading(false);
    }
  }

  // --- Handlers ---
  async function handleReconcileShift(values) {
    if (!currentShift) {
      message.warning('Không có ca thu ngân nào đang mở để đối soát');
      return;
    }

    try {
      setLoading(true);
      // Map denomination inputs to counts array
      const counts = denominations.map((denom) => ({
        denomination: denom,
        quantity: Number(values[`denom_${denom}`] || 0),
      })).filter((c) => c.quantity > 0);

      const res = await accountingApi.reconcileShift(currentShift.cashShiftId, {
        counts,
        reason: values.reason,
      });

      if (res.data.hasDiscrepancy) {
        message.warning(`Phát hiện chênh lệch ${res.data.discrepancyAmount.toLocaleString()} đ! Biên bản đã được chuyển sang trạng thái PENDING (AT-09).`);
      } else {
        message.success('Đối soát tiền mặt ca thu ngân khớp 100% với hệ thống!');
      }

      setCountModal(false);
      formCount.resetFields();
      loadData();
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      if (errCode === 'DISCREPANCY_REASON_REQUIRED') {
        message.error('AT-09 BẮT BUỘC: Phát hiện tiền mặt bị lệch, bắt buộc phải nhập lý do giải trình!');
      } else {
        message.error(err.response?.data?.error?.message || err.message || 'Lỗi đối soát ca');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResolveDiscrepancy(values) {
    if (!selectedDiscrepancy) return;
    try {
      setLoading(true);
      await accountingApi.resolveDiscrepancy(selectedDiscrepancy.cashDiscrepancyId, {
        status: values.status,
        resolutionNote: values.resolutionNote,
      });
      message.success('Đã phê duyệt xử lý biên bản chênh lệch thành công (Maker-Checker AT-09)!');
      setResolveModal(false);
      formResolve.resetFields();
      loadData();
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      if (errCode === 'MAKER_CANNOT_APPROVE') {
        message.error('AT-09 VI PHẠM: Thu ngân lập biên bản không được phép tự duyệt (Maker-Checker)! Cần Kế toán trưởng duyệt.');
      } else {
        message.error(err.response?.data?.error?.message || err.message || 'Lỗi phê duyệt');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePeriod(values) {
    try {
      setLoading(true);
      await accountingApi.createPeriod({
        code: values.code,
        startsOn: values.dateRange[0].format('YYYY-MM-DD'),
        endsOn: values.dateRange[1].format('YYYY-MM-DD'),
      });
      message.success('Khởi tạo kỳ kế toán thành công!');
      setCreatePeriodModal(false);
      formPeriod.resetFields();
      loadData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || err.message || 'Lỗi khởi tạo kỳ kế toán');
    } finally {
      setLoading(false);
    }
  }

  async function handleClosePeriod(period) {
    Modal.confirm({
      title: `Khóa sổ Kỳ kế toán: ${period.code} (AT-10)`,
      content: 'Sau khi khóa sổ, hệ thống sẽ CHẶN TUYỆT ĐỐI mọi hành vi ghi lùi ngày hoặc sửa đổi chứng từ thuộc kỳ này. Bạn có chắc chắn muốn khóa sổ không?',
      okText: 'Xác nhận Khóa sổ',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          await accountingApi.closePeriod(period.accountingPeriodId);
          message.success(`Đã khóa sổ kỳ kế toán ${period.code} thành công!`);
          loadData();
        } catch (err) {
          message.error(err.response?.data?.error?.message || err.message || 'Lỗi khóa sổ kỳ');
        }
      },
    });
  }

  async function handleCreateEntry(values) {
    try {
      setLoading(true);
      const lines = [
        {
          accountId: values.debitAccountId,
          debit: Number(values.amount),
          credit: 0,
          description: values.description,
        },
        {
          accountId: values.creditAccountId,
          debit: 0,
          credit: Number(values.amount),
          description: values.description,
        },
      ];

      await accountingApi.createJournalEntry({
        entryNo: values.entryNo || ('PKT-' + Math.floor(100000 + Math.random() * 900000)),
        accountingPeriodId: values.accountingPeriodId,
        branchId: user?.branchId,
        documentDate: values.documentDate.format('YYYY-MM-DD'),
        postingDate: values.postingDate.format('YYYY-MM-DD'),
        lines,
      });

      message.success('Tạo bút toán sổ cái thành công!');
      setCreateEntryModal(false);
      formEntry.resetFields();
      loadData();
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      if (errCode === 'PERIOD_ALREADY_CLOSED_CANNOT_POST') {
        message.error('AT-10 CHẶN: Kỳ kế toán chứa ngày này đã bị khóa sổ! Không được phép ghi lùi ngày.');
      } else {
        message.error(err.response?.data?.error?.message || err.message || 'Lỗi tạo bút toán');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handlePostEntry(entry) {
    try {
      setLoading(true);
      await accountingApi.postJournalEntry(entry.journalEntryId);
      message.success(`Đã ghi sổ thành công bút toán ${entry.entryNo}!`);
      loadData();
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      if (errCode === 'MAKER_CANNOT_APPROVE') {
        message.error('MAKER-CHECKER: Người lập bút toán không được phép tự duyệt ghi sổ!');
      } else {
        message.error(err.response?.data?.error?.message || err.message || 'Lỗi ghi sổ');
      }
    } finally {
      setLoading(false);
    }
  }

  // --- Statistics ---
  const pendingDiscrepanciesCount = discrepancies.filter((d) => d.status === 'PENDING').length;
  const openPeriodsCount = periods.filter((p) => p.status === 'OPEN').length;
  const closedPeriodsCount = periods.filter((p) => p.status === 'CLOSED').length;
  const postedEntriesCount = journalEntries.filter((e) => e.status === 'POSTED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title level={2} className="!mb-1">
            Kế toán & Đối soát Ca thu ngân (AT-09, AT-10)
          </Title>
          <Text type="secondary">
            Đối soát kiểm đếm tiền mặt & chênh lệch (AT-09), Khóa sổ kế toán ngày (AT-10), Bút toán hạch toán kép & Maker-Checker
          </Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={loadData} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<DollarOutlined />}
            onClick={() => setCountModal(true)}
            disabled={!currentShift}
          >
            Kiểm đếm tiền mặt ca
          </Button>
          <Button
            icon={<CalendarOutlined />}
            onClick={() => setCreatePeriodModal(true)}
          >
            Mở kỳ kế toán
          </Button>
          <Button
            icon={<FileTextOutlined />}
            onClick={() => setCreateEntryModal(true)}
          >
            Lập bút toán
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-red-500">
            <Statistic
              title="Chênh lệch tiền chờ duyệt (AT-09)"
              value={pendingDiscrepanciesCount}
              valueStyle={{ color: '#cf1322' }}
              prefix={<WarningOutlined />}
              suffix="biên bản"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-green-500">
            <Statistic
              title="Kỳ kế toán đang mở (OPEN)"
              value={openPeriodsCount}
              valueStyle={{ color: '#389e0d' }}
              prefix={<CalendarOutlined />}
              suffix="kỳ"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-blue-500">
            <Statistic
              title="Kỳ kế toán đã khóa sổ (AT-10)"
              value={closedPeriodsCount}
              valueStyle={{ color: '#096dd9' }}
              prefix={<LockOutlined />}
              suffix="kỳ"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-purple-500">
            <Statistic
              title="Bút toán đã ghi sổ (POSTED)"
              value={postedEntriesCount}
              valueStyle={{ color: '#722ed1' }}
              prefix={<AuditOutlined />}
              suffix="chứng từ"
            />
          </Card>
        </Col>
      </Row>

      {/* Main Tabs */}
      <Card bordered={false} className="shadow-sm">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'reconcile',
              label: (
                <span>
                  <DollarOutlined /> Đối soát Ca & Chênh lệch tiền (AT-09)
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <Alert
                    type="warning"
                    showIcon
                    message="Quy định Đối soát & Xử lý Chênh lệch tiền mặt cuối ca (AT-09)"
                    description="Khi đóng ca thu ngân, nếu số tiền thực đếm lệch so với số tiền trên hệ thống (lý thuyết = Đầu ca + Thu tiền mặt - Chi tiền mặt), hệ thống BẮT BUỘC tạo biên bản chênh lệch kèm lý do giải trình. Thu ngân không được phép tự duyệt; bắt buộc Kế toán trưởng duyệt phân xử (Maker-Checker)."
                  />

                  {currentShift && (
                    <Card size="small" className="bg-gray-50 mb-4">
                      <Row gutter={16}>
                        <Col span={6}>
                          <Text type="secondary">Ca thu ngân hiện tại:</Text> <Text strong>Đang mở</Text>
                        </Col>
                        <Col span={6}>
                          <Text type="secondary">Tiền đầu ca:</Text> <Text strong>{Number(currentShift.openingFloat || 0).toLocaleString()} đ</Text>
                        </Col>
                        <Col span={6}>
                          <Text type="secondary">Thu ngân phụ trách:</Text> <Text strong>{currentShift.cashier?.displayName || user?.displayName}</Text>
                        </Col>
                        <Col span={6}>
                          <Button size="small" type="primary" onClick={() => setCountModal(true)}>
                            Kiểm đếm mệnh giá ngay
                          </Button>
                        </Col>
                      </Row>
                    </Card>
                  )}

                  <Divider className="!my-2">Danh sách Biên bản Chênh lệch Tiền mặt (Cash Discrepancies)</Divider>

                  <Table
                    rowKey="cashDiscrepancyId"
                    dataSource={discrepancies}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Mã biên bản',
                        dataIndex: 'cashDiscrepancyId',
                        key: 'id',
                        render: (id) => <Text code>{id.slice(0, 8)}...</Text>,
                      },
                      {
                        title: 'Số tiền chênh lệch',
                        dataIndex: 'amount',
                        key: 'amount',
                        render: (val) => {
                          const n = Number(val);
                          return (
                            <Tag color={n < 0 ? 'red' : 'green'} className="text-sm font-semibold">
                              {n > 0 ? '+' : ''}{n.toLocaleString()} đ
                            </Tag>
                          );
                        },
                      },
                      {
                        title: 'Lý do giải trình',
                        dataIndex: 'reason',
                        key: 'reason',
                      },
                      {
                        title: 'Người lập',
                        dataIndex: 'createdBy',
                        key: 'createdBy',
                        render: (u) => <Tag>{u}</Tag>,
                      },
                      {
                        title: 'Trạng thái',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => (
                          <Tag
                            color={
                              status === 'APPROVED'
                                ? 'success'
                                : status === 'PENDING'
                                ? 'warning'
                                : 'error'
                            }
                          >
                            {status === 'APPROVED' ? 'ĐÃ DUYỆT' : status === 'PENDING' ? 'CHỜ DUYỆT' : status}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Người duyệt',
                        dataIndex: ['approver', 'displayName'],
                        key: 'approver',
                        render: (app) => app || <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Thời gian lập',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—'),
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        render: (_, r) => (
                          <Space>
                            {r.status === 'PENDING' && (user?.isApprover || user?.role === 'ADMIN') && (
                              <Button
                                size="small"
                                type="primary"
                                onClick={() => {
                                  setSelectedDiscrepancy(r);
                                  setResolveModal(true);
                                }}
                              >
                                Phê duyệt phân xử
                              </Button>
                            )}
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'periods',
              label: (
                <span>
                  <CalendarOutlined /> Kỳ kế toán & Khóa sổ (AT-10)
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <Alert
                    type="info"
                    showIcon
                    message="Nguyên tắc Khóa sổ Kế toán ngày / kỳ kế toán (AT-10)"
                    description="Khi kỳ kế toán chuyển sang CLOSED, hệ thống lập tức kích hoạt cơ chế khóa sổ bất biến. Mọi thao tác lập chứng từ ghi lùi ngày vào kỳ đã đóng sẽ bị API từ chối lập tức với mã lỗi PERIOD_ALREADY_CLOSED_CANNOT_POST."
                  />

                  <Table
                    rowKey="accountingPeriodId"
                    dataSource={periods}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Mã kỳ',
                        dataIndex: 'code',
                        key: 'code',
                        render: (code) => <Text strong>{code}</Text>,
                      },
                      {
                        title: 'Từ ngày',
                        dataIndex: 'startsOn',
                        key: 'startsOn',
                      },
                      {
                        title: 'Đến ngày',
                        dataIndex: 'endsOn',
                        key: 'endsOn',
                      },
                      {
                        title: 'Trạng thái',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => (
                          <Tag color={status === 'OPEN' ? 'green' : 'red'}>
                            {status === 'OPEN' ? 'ĐANG MỞ' : 'ĐÃ KHÓA SỔ'}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Người khóa sổ',
                        dataIndex: ['closer', 'displayName'],
                        key: 'closer',
                        render: (name) => name || <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Thời điểm khóa sổ',
                        dataIndex: 'closedAt',
                        key: 'closedAt',
                        render: (d) => (d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—'),
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        render: (_, r) => (
                          <Space>
                            {r.status === 'OPEN' && (user?.isApprover || user?.role === 'ADMIN') && (
                              <Button
                                size="small"
                                danger
                                icon={<LockOutlined />}
                                onClick={() => handleClosePeriod(r)}
                              >
                                Khóa sổ kỳ (AT-10)
                              </Button>
                            )}
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'journal',
              label: (
                <span>
                  <FileTextOutlined /> Sổ Nhật ký chung & Hạch toán kép
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <Alert
                    type="success"
                    showIcon
                    message="Hạch toán kép và Kiểm soát Cân bằng Nợ - Có"
                    description="Trigger CSDL TR_JournalEntries_PostBalanced tự động kiểm tra tổng phát sinh Nợ phải bằng tổng phát sinh Có trước khi cho phép ghi sổ (POSTED). Ràng buộc Maker-Checker ngăn chặn người tạo tự phê duyệt."
                  />

                  <Table
                    rowKey="journalEntryId"
                    dataSource={journalEntries}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Số chứng từ',
                        dataIndex: 'entryNo',
                        key: 'entryNo',
                        render: (no) => <Text strong>{no}</Text>,
                      },
                      {
                        title: 'Ngày chứng từ',
                        dataIndex: 'documentDate',
                        key: 'documentDate',
                      },
                      {
                        title: 'Ngày ghi sổ',
                        dataIndex: 'postingDate',
                        key: 'postingDate',
                      },
                      {
                        title: 'Kỳ kế toán',
                        dataIndex: ['period', 'code'],
                        key: 'periodCode',
                        render: (code) => <Tag color="blue">{code}</Tag>,
                      },
                      {
                        title: 'Trạng thái',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => (
                          <Tag color={status === 'POSTED' ? 'purple' : 'default'}>
                            {status === 'POSTED' ? 'ĐÃ GHI SỔ' : 'DỰ THẢO (DRAFT)'}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Người lập',
                        dataIndex: ['creator', 'displayName'],
                        key: 'creator',
                        render: (name) => name || <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Người duyệt',
                        dataIndex: ['approver', 'displayName'],
                        key: 'approver',
                        render: (name) => name || <Text type="secondary">—</Text>,
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        render: (_, r) => (
                          <Space>
                            {r.status === 'DRAFT' && (user?.isApprover || user?.role === 'ADMIN') && (
                              <Button
                                size="small"
                                type="primary"
                                icon={<CheckCircleOutlined />}
                                onClick={() => handlePostEntry(r)}
                              >
                                Duyệt ghi sổ
                              </Button>
                            )}
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* MODAL 1: KIỂM ĐẾM MỆNH GIÁ TIỀN MẶT (AT-09) */}
      <Modal
        title="Kiểm đếm Tiền mặt Cuối ca & Đối soát (AT-09)"
        open={countModal}
        onCancel={() => setCountModal(false)}
        footer={null}
        destroyOnClose
        width={650}
      >
        <Form form={formCount} layout="vertical" onFinish={handleReconcileShift}>
          <Alert
            type="info"
            message={`Tiền đầu ca: ${Number(currentShift?.openingFloat || 0).toLocaleString()} đ`}
            description="Nhập số tờ tiền thực tế có trong két theo từng mệnh giá để hệ thống tự động đối chiếu."
            className="mb-4"
          />

          <Row gutter={[16, 8]}>
            {denominations.map((denom) => (
              <Col span={8} key={denom}>
                <Form.Item
                  name={`denom_${denom}`}
                  label={`${denom.toLocaleString()} đ`}
                  initialValue={0}
                >
                  <InputNumber min={0} className="w-full" placeholder="Số tờ" />
                </Form.Item>
              </Col>
            ))}
          </Row>

          <Form.Item
            name="reason"
            label="Lý do giải trình (Bắt buộc nếu có chênh lệch tiền mặt)"
            extra="Nếu số tiền thực đếm lệch so với số tiền lý thuyết, hệ thống sẽ từ chối nếu không có giải trình (AT-09)."
          >
            <Input.TextArea rows={2} placeholder="VD: Thối nhầm tiền cho khách hàng hoặc thừa do làm tròn..." />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setCountModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Xác nhận Đối soát
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 2: PHÊ DUYỆT PHÂN XỬ CHÊNH LỆCH TIỀN (AT-09 MAKER-CHECKER) */}
      <Modal
        title="Phê duyệt Phân xử Chênh lệch Tiền mặt (Maker-Checker AT-09)"
        open={resolveModal}
        onCancel={() => setResolveModal(false)}
        footer={null}
        destroyOnClose
      >
        {selectedDiscrepancy && (
          <Form form={formResolve} layout="vertical" onFinish={handleResolveDiscrepancy}>
            <Descriptions bordered size="small" column={1} className="mb-4">
              <Descriptions.Item label="Số tiền lệch">
                <Text strong type={Number(selectedDiscrepancy.amount) < 0 ? 'danger' : 'success'}>
                  {Number(selectedDiscrepancy.amount) > 0 ? '+' : ''}{Number(selectedDiscrepancy.amount).toLocaleString()} đ
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Lý do thu ngân giải trình">
                {selectedDiscrepancy.reason}
              </Descriptions.Item>
              <Descriptions.Item label="Người lập biên bản">
                {selectedDiscrepancy.createdBy}
              </Descriptions.Item>
            </Descriptions>

            <Form.Item
              name="status"
              label="Quyết định phân xử"
              initialValue="APPROVED"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { label: 'Chấp thuận (APPROVED)', value: 'APPROVED' },
                  { label: 'Từ chối / Yêu cầu thu ngân bồi hoàn (REJECTED)', value: 'REJECTED' },
                ]}
              />
            </Form.Item>

            <Form.Item name="resolutionNote" label="Ý kiến Kế toán trưởng">
              <Input.TextArea rows={2} placeholder="Nhập căn cứ xử lý..." />
            </Form.Item>

            <div className="flex justify-end gap-2 mt-4">
              <Button onClick={() => setResolveModal(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Xác nhận Duyệt
              </Button>
            </div>
          </Form>
        )}
      </Modal>

      {/* MODAL 3: MỞ KỲ KẾ TOÁN MỚI */}
      <Modal
        title="Mở Kỳ Kế toán Mới"
        open={createPeriodModal}
        onCancel={() => setCreatePeriodModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={formPeriod} layout="vertical" onFinish={handleCreatePeriod}>
          <Form.Item
            name="code"
            label="Mã kỳ kế toán"
            rules={[{ required: true, message: 'Vui lòng nhập mã kỳ' }]}
            initialValue={'PER-' + dayjs().format('YYYY-MM')}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="dateRange"
            label="Khoảng thời gian của kỳ"
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu và kết thúc' }]}
            initialValue={[dayjs().startOf('month'), dayjs().endOf('month')]}
          >
            <DatePicker.RangePicker className="w-full" format="YYYY-MM-DD" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setCreatePeriodModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Khởi tạo Kỳ
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 4: LẬP BÚT TOÁN SỔ CÁI */}
      <Modal
        title="Lập Bút toán Sổ cái Kế toán"
        open={createEntryModal}
        onCancel={() => setCreateEntryModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={formEntry} layout="vertical" onFinish={handleCreateEntry}>
          <Form.Item
            name="accountingPeriodId"
            label="Kỳ kế toán"
            rules={[{ required: true, message: 'Vui lòng chọn kỳ kế toán' }]}
          >
            <Select
              options={periods.map((p) => ({
                label: `${p.code} (${p.startsOn} ~ ${p.endsOn}) - ${p.status === 'OPEN' ? 'ĐANG MỞ' : 'ĐÃ KHÓA'}`,
                value: p.accountingPeriodId,
              }))}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="documentDate"
                label="Ngày chứng từ"
                rules={[{ required: true }]}
                initialValue={dayjs()}
              >
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="postingDate"
                label="Ngày ghi sổ"
                rules={[{ required: true }]}
                initialValue={dayjs()}
              >
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="debitAccountId"
                label="Tài khoản NỢ"
                rules={[{ required: true, message: 'Vui lòng chọn tài khoản Nợ' }]}
              >
                <Select
                  options={accounts.map((a) => ({
                    label: `${a.code} - ${a.name}`,
                    value: a.accountId,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="creditAccountId"
                label="Tài khoản CÓ"
                rules={[{ required: true, message: 'Vui lòng chọn tài khoản Có' }]}
              >
                <Select
                  options={accounts.map((a) => ({
                    label: `${a.code} - ${a.name}`,
                    value: a.accountId,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="amount"
            label="Số tiền phát sinh (VND)"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
          >
            <InputNumber min={1} className="w-full" />
          </Form.Item>

          <Form.Item name="description" label="Diễn giải nghiệp vụ" initialValue="Thu tiền dịch vụ nha khoa">
            <Input />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setCreateEntryModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Tạo Bút toán
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
export default AccountingPage;
