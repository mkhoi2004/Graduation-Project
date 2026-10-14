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
} from 'antd';
import {
  DollarOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  PlusOutlined,
  SwapOutlined,
  RollbackOutlined,
  PercentageOutlined,
  ReloadOutlined,
  AuditOutlined,
} from '@ant-design/icons';
import { billingApi, visitApi, patientApi } from '../../services/api-client.js';
import { useAuth } from '../../context/auth-context.jsx';

const { Title, Text } = Typography;

export function CashierPage() {
  const { user } = useAuth();
  const [currentShift, setCurrentShift] = useState(null);
  const [visits, setVisits] = useState([]);
  const [selectedVisitId, setSelectedVisitId] = useState(null);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [patientDeposits, setPatientDeposits] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [openShiftModal, setOpenShiftModal] = useState(false);
  const [closeShiftModal, setCloseShiftModal] = useState(false);
  const [createDepositModal, setCreateDepositModal] = useState(false);
  const [issueInvoiceModal, setIssueInvoiceModal] = useState(false);
  const [payModal, setPayModal] = useState(false);
  const [applyDepositModal, setApplyDepositModal] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [selectedTxnForRefund, setSelectedTxnForRefund] = useState(null);
  const [discountModal, setDiscountModal] = useState(false);

  const [formOpenShift] = Form.useForm();
  const [formCloseShift] = Form.useForm();
  const [formDeposit] = Form.useForm();
  const [formInvoice] = Form.useForm();
  const [formPay] = Form.useForm();
  const [formApplyDeposit] = Form.useForm();
  const [formRefund] = Form.useForm();
  const [formDiscount] = Form.useForm();

  const isCashier = ['ADMIN', 'RECEPTIONIST', 'ACCOUNTANT'].includes(user?.role);
  const isApprover = user?.isApprover || user?.role === 'ADMIN';

  // Load Shift & Initial Data
  const loadShift = async () => {
    try {
      const res = await billingApi.getCurrentShift();
      setCurrentShift(res.data);
    } catch {
      setCurrentShift(null);
    }
  };

  const loadVisits = async () => {
    try {
      setLoading(true);
      const res = await visitApi.getVisits();
      const list = res.data?.items || res.data || [];
      setVisits(list);
    } catch {
      message.error('Không thể tải danh sách lượt khám.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShift();
    loadVisits();
  }, []);

  // When a visit is selected
  const handleSelectVisit = async (visitId) => {
    setSelectedVisitId(visitId);
    const v = visits.find((item) => item.visitId === visitId);
    setSelectedVisit(v);
    setSelectedInvoice(null);
    if (!visitId) return;

    try {
      setLoading(true);
      const invRes = await billingApi.getInvoicesByVisit(visitId);
      setInvoices(invRes.data || []);

      if (v?.patientId) {
        const depRes = await billingApi.getPatientDeposits(v.patientId);
        setPatientDeposits(depRes.data || []);
      }
    } catch {
      message.error('Lỗi khi tải thông tin tài chính của lượt khám.');
    } finally {
      setLoading(false);
    }
  };

  // Reload selected visit data
  const refreshFinancialData = async () => {
    if (selectedVisitId) {
      await handleSelectVisit(selectedVisitId);
    }
    loadShift();
  };

  // 1. Shift Handlers
  const handleOpenShiftSubmit = async (values) => {
    try {
      await billingApi.openShift({
        openingFloat: values.openingFloat,
        branchId: user?.branchId,
      });
      message.success('Đã mở ca làm việc thu ngân thành công!');
      setOpenShiftModal(false);
      formOpenShift.resetFields();
      loadShift();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể mở ca làm việc.');
    }
  };

  const handleCloseShiftSubmit = async (values) => {
    try {
      await billingApi.closeShift(currentShift.cashShiftId, {
        actualCash: values.actualCash,
      });
      message.success('Đã đóng ca làm việc và chốt đối soát tiền mặt thành công!');
      setCloseShiftModal(false);
      formCloseShift.resetFields();
      loadShift();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể đóng ca làm việc.');
    }
  };

  // 2. Deposit Handlers
  const handleCreateDepositSubmit = async (values) => {
    try {
      await billingApi.createDeposit({
        patientId: selectedVisit?.patientId,
        amount: values.amount,
        method: values.method,
        payerName: values.payerName || selectedVisit?.patient?.fullName,
      });
      message.success('Thu tiền cọc / tạm ứng thành công!');
      setCreateDepositModal(false);
      formDeposit.resetFields();
      refreshFinancialData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi khi thu tiền cọc.');
    }
  };

  const handleApplyDepositSubmit = async (values) => {
    try {
      await billingApi.applyDeposit(selectedInvoice.invoiceId, {
        depositId: values.depositId,
        amount: values.amount,
      });
      message.success('Cấn trừ tiền cọc vào hóa đơn thành công (AT-15)!');
      setApplyDepositModal(false);
      formApplyDeposit.resetFields();
      refreshFinancialData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi cấn trừ cọc.');
    }
  };

  // 3. Invoice Handlers
  const handleIssueInvoiceSubmit = async (values) => {
    try {
      await billingApi.createInvoice(selectedVisitId, {
        approvedDiscount: values.approvedDiscount || 0,
        tax: values.tax || 0,
      });
      message.success('Xuất hóa đơn viện phí thành công (AT-01)!');
      setIssueInvoiceModal(false);
      formInvoice.resetFields();
      refreshFinancialData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể xuất hóa đơn.');
    }
  };

  // 4. Payment Handlers
  const handlePaySubmit = async (values) => {
    try {
      await billingApi.payInvoice(selectedInvoice.invoiceId, {
        amount: values.amount,
        method: values.method,
        externalReference: values.externalReference,
      });
      message.success('Ghi nhận thanh toán thành công (AT-01)!');
      setPayModal(false);
      formPay.resetFields();
      refreshFinancialData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể thực hiện thanh toán.');
    }
  };

  // 5. Refund Handlers (Maker-Checker, AT-20)
  const handleRequestRefundSubmit = async (values) => {
    try {
      await billingApi.requestRefund(selectedTxnForRefund.paymentTransactionId, {
        amount: values.amount,
        reason: values.reason,
      });
      message.success('Đã gửi đề xuất hoàn tiền (Chờ phê duyệt Maker-Checker)!');
      setRefundModal(false);
      formRefund.resetFields();
      refreshFinancialData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi gửi yêu cầu hoàn tiền.');
    }
  };

  const handleApproveRefund = async (refundId) => {
    try {
      await billingApi.approveRefund(refundId);
      message.success('Đã phê duyệt phiếu hoàn tiền thành công (Maker-Checker)!');
      refreshFinancialData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể duyệt hoàn tiền.');
    }
  };

  // 6. Discount Handlers (Maker-Checker, AT-18)
  const handleRequestDiscountSubmit = async (values) => {
    try {
      await billingApi.requestDiscount(selectedInvoice.invoiceId, {
        amount: values.amount,
        reason: values.reason,
      });
      message.success('Đã lập đề xuất giảm giá (Chờ phê duyệt Maker-Checker)!');
      setDiscountModal(false);
      formDiscount.resetFields();
      refreshFinancialData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Lỗi gửi đề xuất giảm giá.');
    }
  };

  const handleApproveDiscount = async (approvalId) => {
    try {
      await billingApi.approveDiscount(approvalId);
      message.success('Đã phê duyệt đề xuất giảm giá thành công!');
      refreshFinancialData();
    } catch (err) {
      message.error(err.response?.data?.error?.message || 'Không thể phê duyệt giảm giá.');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header & Shift Status */}
      <Card style={{ marginBottom: 20 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              <DollarOutlined /> Thu ngân & Viện phí (Module 6)
            </Title>
            <Text type="secondary">
              Quản lý ca làm việc, xuất hóa đơn (AT-01), cấn trừ cọc (AT-15), chặn thu vượt nợ (AT-02) & kiểm soát tiền tệ (AT-20)
            </Text>
          </Col>
          <Col>
            <Space>
              {currentShift ? (
                <>
                  <Tag color="green" icon={<CheckCircleOutlined />} style={{ fontSize: 14, padding: '4px 10px' }}>
                    Ca đang mở (Mở lúc: {new Date(currentShift.openedAt).toLocaleTimeString('vi-VN')})
                  </Tag>
                  <Tag color="blue" style={{ fontSize: 14, padding: '4px 10px' }}>
                    Tiền đầu ca: {Number(currentShift.openingFloat).toLocaleString('vi-VN')} đ
                  </Tag>
                  <Button type="primary" danger onClick={() => setCloseShiftModal(true)}>
                    Đóng ca thu ngân
                  </Button>
                </>
              ) : (
                <>
                  <Tag color="red" icon={<ClockCircleOutlined />} style={{ fontSize: 14, padding: '4px 10px' }}>
                    Chưa mở ca làm việc
                  </Tag>
                  {isCashier && (
                    <Button type="primary" onClick={() => setOpenShiftModal(true)}>
                      Mở ca làm việc
                    </Button>
                  )}
                </>
              )}
              <Button icon={<ReloadOutlined />} onClick={refreshFinancialData}>
                Làm mới
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Select Visit to Bill */}
      <Row gutter={16}>
        <Col span={7}>
          <Card title="Danh sách lượt khám" style={{ height: '100%' }}>
            <Select
              showSearch
              placeholder="Chọn hoặc tìm lượt khám..."
              style={{ width: '100%', marginBottom: 16 }}
              onChange={handleSelectVisit}
              value={selectedVisitId}
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={visits.map((v) => ({
                value: v.visitId,
                label: `${v.patient?.fullName || 'Bệnh nhân'} - ${v.visitCode || v.visitId.slice(0, 8)} (${v.status})`,
              }))}
            />

            {selectedVisit && (
              <Descriptions size="small" column={1} bordered>
                <Descriptions.Item label="Bệnh nhân">
                  <strong>{selectedVisit.patient?.fullName}</strong>
                </Descriptions.Item>
                <Descriptions.Item label="Số điện thoại">
                  {selectedVisit.patient?.phone}
                </Descriptions.Item>
                <Descriptions.Item label="Mã hồ sơ">
                  {selectedVisit.patient?.patientCode || 'Chưa cấp'}
                </Descriptions.Item>
                <Descriptions.Item label="Bác sĩ khám">
                  {selectedVisit.assignedDoctor?.displayName || 'Chưa chỉ định'}
                </Descriptions.Item>
                <Descriptions.Item label="Trạng thái">
                  <Tag color="purple">{selectedVisit.status}</Tag>
                </Descriptions.Item>
              </Descriptions>
            )}

            {selectedVisit && (
              <div style={{ marginTop: 16 }}>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  block
                  style={{ marginBottom: 8 }}
                  onClick={() => setIssueInvoiceModal(true)}
                  disabled={!currentShift}
                >
                  Xuất Hóa Đơn Mới (AT-01)
                </Button>
                <Button
                  icon={<CreditCardOutlined />}
                  block
                  onClick={() => setCreateDepositModal(true)}
                  disabled={!currentShift}
                >
                  Thu Tiền Tạm Ứng / Cọc (AT-20)
                </Button>
              </div>
            )}
          </Card>
        </Col>

        {/* Financial Details Tabs */}
        <Col span={17}>
          <Card>
            <Tabs defaultActiveKey="invoices">
              <Tabs.TabPane tab="Hóa Đơn & Thu Viện Phí" key="invoices">
                {invoices.length === 0 ? (
                  <Alert
                    message="Chưa có hóa đơn nào cho lượt khám này"
                    description="Nhấn nút 'Xuất Hóa Đơn Mới' ở bảng bên trái khi bác sĩ đã hoàn tất thủ thuật."
                    type="info"
                    showIcon
                  />
                ) : (
                  <>
                    <Table
                      dataSource={invoices}
                      rowKey="invoiceId"
                      pagination={false}
                      onRow={(record) => ({
                        onClick: () => setSelectedInvoice(record),
                        style: {
                          cursor: 'pointer',
                          background: selectedInvoice?.invoiceId === record.invoiceId ? '#e6f7ff' : undefined,
                        },
                      })}
                      columns={[
                        {
                          title: 'Số Hóa Đơn',
                          dataIndex: 'invoiceNo',
                          key: 'invoiceNo',
                          render: (t) => <strong>{t}</strong>,
                        },
                        {
                          title: 'Tổng dịch vụ (Gross)',
                          dataIndex: 'gross',
                          key: 'gross',
                          render: (v) => `${Number(v).toLocaleString('vi-VN')} đ`,
                        },
                        {
                          title: 'Giảm giá',
                          dataIndex: 'approvedDiscount',
                          key: 'approvedDiscount',
                          render: (v) => `${Number(v).toLocaleString('vi-VN')} đ`,
                        },
                        {
                          title: 'Còn phải trả',
                          key: 'netPayable',
                          render: (_, r) => {
                            const net = Number(r.gross) - Number(r.approvedDiscount || 0) + Number(r.tax || 0);
                            return <strong>{net.toLocaleString('vi-VN')} đ</strong>;
                          },
                        },
                        {
                          title: 'Trạng thái',
                          dataIndex: 'status',
                          key: 'status',
                          render: (st) => (
                            <Tag color={st === 'PAID' ? 'green' : st === 'PARTIALLY_PAID' ? 'orange' : 'blue'}>
                              {st === 'PAID' ? 'Đã tất toán' : st === 'PARTIALLY_PAID' ? 'Đã thanh toán 1 phần' : 'Mới lập'}
                            </Tag>
                          ),
                        },
                      ]}
                    />

                    {selectedInvoice && (
                      <div style={{ marginTop: 24, padding: 16, background: '#fafafa', borderRadius: 8 }}>
                        <Row justify="space-between" align="middle">
                          <Col>
                            <Title level={4} style={{ margin: 0 }}>
                              Chi tiết HĐ: {selectedInvoice.invoiceNo}
                            </Title>
                          </Col>
                          <Col>
                            <Space>
                              <Button
                                type="primary"
                                icon={<DollarOutlined />}
                                onClick={() => setPayModal(true)}
                                disabled={selectedInvoice.status === 'PAID'}
                              >
                                Thu Tiền (AT-01, AT-02)
                              </Button>
                              <Button
                                icon={<SwapOutlined />}
                                onClick={() => setApplyDepositModal(true)}
                                disabled={selectedInvoice.status === 'PAID'}
                              >
                                Cấn Cọc (AT-15)
                              </Button>
                              <Button
                                icon={<PercentageOutlined />}
                                onClick={() => setDiscountModal(true)}
                                disabled={selectedInvoice.status === 'PAID'}
                              >
                                Đề Xuất Giảm Giá
                              </Button>
                            </Space>
                          </Col>
                        </Row>

                        <Divider style={{ margin: '12px 0' }} />

                        {/* Invoice Lines Table */}
                        <Text strong>Các mục dịch vụ trong hóa đơn:</Text>
                        <Table
                          size="small"
                          dataSource={selectedInvoice.lines || []}
                          rowKey="invoiceLineId"
                          pagination={false}
                          columns={[
                            { title: 'Dịch vụ / Thủ thuật', dataIndex: 'description', key: 'desc' },
                            { title: 'Số lượng', dataIndex: 'quantity', key: 'qty' },
                            {
                              title: 'Đơn giá',
                              dataIndex: 'unitPrice',
                              key: 'price',
                              render: (v) => `${Number(v).toLocaleString('vi-VN')} đ`,
                            },
                            {
                              title: 'Thành tiền',
                              key: 'total',
                              render: (_, r) => `${(Number(r.quantity) * Number(r.unitPrice)).toLocaleString('vi-VN')} đ`,
                            },
                          ]}
                        />

                        {/* Payment Transactions List */}
                        <div style={{ marginTop: 16 }}>
                          <Text strong>Lịch sử thanh toán & cấn cọc:</Text>
                          <Table
                            size="small"
                            dataSource={selectedInvoice.transactions || []}
                            rowKey="paymentTransactionId"
                            pagination={false}
                            columns={[
                              {
                                title: 'Thời gian',
                                dataIndex: 'confirmedAt',
                                key: 'time',
                                render: (d) => (d ? new Date(d).toLocaleString('vi-VN') : '-'),
                              },
                              {
                                title: 'Số tiền',
                                dataIndex: 'amount',
                                key: 'amount',
                                render: (v) => <strong style={{ color: '#52c41a' }}>+{Number(v).toLocaleString('vi-VN')} đ</strong>,
                              },
                              { title: 'Hình thức', dataIndex: 'method', key: 'method' },
                              { title: 'Người thu', dataIndex: 'createdBy', key: 'cashier' },
                              {
                                title: 'Hành động',
                                key: 'action',
                                render: (_, txn) => (
                                  <Button
                                    size="small"
                                    danger
                                    icon={<RollbackOutlined />}
                                    onClick={() => {
                                      setSelectedTxnForRefund(txn);
                                      setRefundModal(true);
                                    }}
                                  >
                                    Yêu cầu hoàn tiền (AT-20)
                                  </Button>
                                ),
                              },
                            ]}
                          />
                        </div>

                        {/* Discount Approvals Table */}
                        {selectedInvoice.discountApprovals?.length > 0 && (
                          <div style={{ marginTop: 16 }}>
                            <Text strong>Đề xuất giảm giá (Maker-Checker):</Text>
                            <Table
                              size="small"
                              dataSource={selectedInvoice.discountApprovals}
                              rowKey="discountApprovalId"
                              pagination={false}
                              columns={[
                                {
                                  title: 'Số tiền',
                                  dataIndex: 'amount',
                                  key: 'amt',
                                  render: (v) => `${Number(v).toLocaleString('vi-VN')} đ`,
                                },
                                { title: 'Lý do', dataIndex: 'reason', key: 'reason' },
                                {
                                  title: 'Trạng thái',
                                  dataIndex: 'status',
                                  key: 'st',
                                  render: (st) => (
                                    <Tag color={st === 'APPROVED' ? 'green' : 'orange'}>{st}</Tag>
                                  ),
                                },
                                {
                                  title: 'Phê duyệt',
                                  key: 'approve',
                                  render: (_, r) =>
                                    r.status === 'REQUESTED' && isApprover ? (
                                      <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => handleApproveDiscount(r.discountApprovalId)}
                                      >
                                        Duyệt giảm giá
                                      </Button>
                                    ) : null,
                                },
                              ]}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </Tabs.TabPane>

              {/* Tab Deposits */}
              <Tabs.TabPane tab="Tiền Tạm Ứng / Cọc (Deposits)" key="deposits">
                <Row gutter={16} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="Tổng tiền cọc đã nộp"
                        value={patientDeposits.reduce((sum, d) => sum + Number(d.amount), 0)}
                        precision={0}
                        suffix="đ"
                      />
                    </Card>
                  </Col>
                  <Col span={8}>
                    <Card size="small">
                      <Statistic
                        title="Số dư cọc khả dụng (AT-15)"
                        value={patientDeposits.reduce((sum, d) => sum + Number(d.balance), 0)}
                        precision={0}
                        valueStyle={{ color: '#3f8600' }}
                        suffix="đ"
                      />
                    </Card>
                  </Col>
                </Row>

                <Table
                  dataSource={patientDeposits}
                  rowKey="depositId"
                  columns={[
                    {
                      title: 'Mã Cọc',
                      dataIndex: 'depositId',
                      key: 'id',
                      render: (t) => t.slice(0, 8),
                    },
                    {
                      title: 'Người nộp',
                      dataIndex: 'payerName',
                      key: 'payer',
                    },
                    {
                      title: 'Số tiền ban đầu',
                      dataIndex: 'amount',
                      key: 'amount',
                      render: (v) => `${Number(v).toLocaleString('vi-VN')} đ`,
                    },
                    {
                      title: 'Số dư khả dụng (Balance)',
                      dataIndex: 'balance',
                      key: 'balance',
                      render: (v) => <strong style={{ color: '#1890ff' }}>{Number(v).toLocaleString('vi-VN')} đ</strong>,
                    },
                    { title: 'Hình thức', dataIndex: 'method', key: 'method' },
                    {
                      title: 'Ngày nộp',
                      dataIndex: 'confirmedAt',
                      key: 'date',
                      render: (d) => (d ? new Date(d).toLocaleString('vi-VN') : '-'),
                    },
                    {
                      title: 'Trạng thái',
                      dataIndex: 'status',
                      key: 'status',
                      render: (st) => <Tag color={st === 'CONFIRMED' ? 'green' : 'default'}>{st}</Tag>,
                    },
                  ]}
                />
              </Tabs.TabPane>
            </Tabs>
          </Card>
        </Col>
      </Row>

      {/* Modal 1: Open Shift */}
      <Modal
        title="Mở ca làm việc thu ngân"
        open={openShiftModal}
        onCancel={() => setOpenShiftModal(false)}
        onOk={() => formOpenShift.submit()}
      >
        <Form form={formOpenShift} layout="vertical" onFinish={handleOpenShiftSubmit}>
          <Form.Item
            name="openingFloat"
            label="Tiền mặt đầu ca (Opening Float)"
            initialValue={0}
            rules={[{ required: true, message: 'Vui lòng nhập tiền đầu ca' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              addonAfter="VNĐ"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 2: Close Shift */}
      <Modal
        title="Đóng ca làm việc và đối soát tiền mặt"
        open={closeShiftModal}
        onCancel={() => setCloseShiftModal(false)}
        onOk={() => formCloseShift.submit()}
      >
        <Alert
          message="Đối soát doanh thu ca"
          description="Hệ thống sẽ đối chiếu số tiền thực tế bạn bàn giao với doanh số ghi nhận từ các hóa đơn thanh toán tiền mặt trong ca."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={formCloseShift} layout="vertical" onFinish={handleCloseShiftSubmit}>
          <Form.Item
            name="actualCash"
            label="Số tiền mặt thực kiểm đếm được"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền thực tế' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              addonAfter="VNĐ"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 3: Create Deposit */}
      <Modal
        title="Thu tiền đặt cọc / tạm ứng (AT-20)"
        open={createDepositModal}
        onCancel={() => setCreateDepositModal(false)}
        onOk={() => formDeposit.submit()}
      >
        <Form form={formDeposit} layout="vertical" onFinish={handleCreateDepositSubmit}>
          <Form.Item name="payerName" label="Họ tên người nộp tiền" initialValue={selectedVisit?.patient?.fullName}>
            <Input />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Số tiền cọc (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền cọc lớn hơn 0' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item name="method" label="Phương thức thanh toán" initialValue="CASH">
            <Select>
              <Select.Option value="CASH">Tiền mặt (CASH)</Select.Option>
              <Select.Option value="BANK_TRANSFER">Chuyển khoản (BANK_TRANSFER)</Select.Option>
              <Select.Option value="CARD">Quẹt thẻ (CARD)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 4: Issue Invoice */}
      <Modal
        title="Xuất Hóa Đơn Dịch Vụ Đã Hoàn Thành (AT-01)"
        open={issueInvoiceModal}
        onCancel={() => setIssueInvoiceModal(false)}
        onOk={() => formInvoice.submit()}
      >
        <Alert
          message="Quy trình xuất hóa đơn (AT-01)"
          description="Hệ thống tự động tổng hợp toàn bộ các dịch vụ đã được bác sĩ chốt hoàn tất (COMPLETED) trong lượt khám này và lập bảng kê chi tiết."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={formInvoice} layout="vertical" onFinish={handleIssueInvoiceSubmit}>
          <Form.Item name="approvedDiscount" label="Chiết khấu / Giảm giá trực tiếp (nếu có)" initialValue={0}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              addonAfter="VNĐ"
            />
          </Form.Item>
          <Form.Item name="tax" label="Thuế VAT" initialValue={0}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              addonAfter="VNĐ"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 5: Pay Invoice (AT-01, AT-02) */}
      <Modal
        title={`Thanh toán hóa đơn: ${selectedInvoice?.invoiceNo}`}
        open={payModal}
        onCancel={() => setPayModal(false)}
        onOk={() => formPay.submit()}
      >
        <Alert
          message="Bảo vệ thu trùng lặp / thu vượt nợ (AT-02)"
          description="Hệ thống sử dụng khóa độc quyền hàng (UPDLOCK, HOLDLOCK) để ngăn chặn 2 thu ngân cùng thu vượt quá số tiền còn nợ của hóa đơn."
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={formPay} layout="vertical" onFinish={handlePaySubmit}>
          <Form.Item
            name="amount"
            label="Số tiền thanh toán (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền thanh toán' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item name="method" label="Phương thức thanh toán" initialValue="CASH">
            <Select>
              <Select.Option value="CASH">Tiền mặt (CASH)</Select.Option>
              <Select.Option value="BANK_TRANSFER">Chuyển khoản (BANK_TRANSFER)</Select.Option>
              <Select.Option value="CARD">Quẹt thẻ (CARD)</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="externalReference" label="Mã giao dịch / Ghi chú">
            <Input placeholder="Mã tham chiếu ngân hàng (nếu có)" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 6: Apply Deposit (AT-15) */}
      <Modal
        title="Cấn trừ tiền cọc vào hóa đơn (AT-15)"
        open={applyDepositModal}
        onCancel={() => setApplyDepositModal(false)}
        onOk={() => formApplyDeposit.submit()}
      >
        <Alert
          message="Kiểm soát đồng thời cấn cọc (AT-15)"
          description="Hệ thống kiểm tra số dư khả dụng tức thời của tiền cọc để đảm bảo không bị cấn vượt quá số dư khi nhiều thu ngân thao tác cùng lúc."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Form form={formApplyDeposit} layout="vertical" onFinish={handleApplyDepositSubmit}>
          <Form.Item
            name="depositId"
            label="Chọn khoản cọc cần cấn trừ"
            rules={[{ required: true, message: 'Vui lòng chọn khoản cọc' }]}
          >
            <Select
              options={patientDeposits
                .filter((d) => Number(d.balance) > 0)
                .map((d) => ({
                  value: d.depositId,
                  label: `Cọc ngày ${new Date(d.confirmedAt).toLocaleDateString('vi-VN')} - Dư: ${Number(d.balance).toLocaleString('vi-VN')} đ`,
                }))}
            />
          </Form.Item>
          <Form.Item
            name="amount"
            label="Số tiền cấn trừ (VNĐ)"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền cấn trừ' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 7: Refund (Maker-Checker, AT-20) */}
      <Modal
        title="Lập phiếu đề xuất hoàn tiền (AT-20 - Maker-Checker)"
        open={refundModal}
        onCancel={() => setRefundModal(false)}
        onOk={() => formRefund.submit()}
      >
        <Form form={formRefund} layout="vertical" onFinish={handleRequestRefundSubmit}>
          <Form.Item
            name="amount"
            label="Số tiền cần hoàn"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền hoàn' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              addonAfter="VNĐ"
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do hoàn tiền"
            rules={[{ required: true, message: 'Vui lòng nêu rõ lý do hoàn tiền' }]}
          >
            <Input.TextArea rows={3} placeholder="VD: Khách hàng đổi kế hoạch, rút thủ thuật..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal 8: Discount (Maker-Checker, AT-18) */}
      <Modal
        title="Lập đề xuất giảm giá sau hóa đơn (Maker-Checker)"
        open={discountModal}
        onCancel={() => setDiscountModal(false)}
        onOk={() => formDiscount.submit()}
      >
        <Form form={formDiscount} layout="vertical" onFinish={handleRequestDiscountSubmit}>
          <Form.Item
            name="amount"
            label="Số tiền giảm giá đề xuất"
            rules={[{ required: true, message: 'Vui lòng nhập số tiền' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1000}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/\$\s?|(,*)/g, '')}
              addonAfter="VNĐ"
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do giảm giá"
            rules={[{ required: true, message: 'Vui lòng nhập lý do giảm giá' }]}
          >
            <Input.TextArea rows={3} placeholder="VD: Giảm giá tri ân khách hàng thân thiết..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
