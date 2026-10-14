import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Table,
  Button,
  Tag,
  Modal,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Select,
  Space,
  Typography,
  Row,
  Col,
  Statistic,
  message,
  Divider,
  Alert,
  Tooltip,
} from 'antd';
import {
  DollarOutlined,
  UsergroupAddOutlined,
  LockOutlined,
  PlusOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  ReloadOutlined,
  EditOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { hrApi, userApi } from '../../services/api-client.js';
import { useAuth } from '../../context/auth-context.jsx';

const { Title, Text } = Typography;
const { Option } = Select;

export default function HrPayrollPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('periods');
  const [loading, setLoading] = useState(false);

  // Data states
  const [periods, setPeriods] = useState([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [payrollSummary, setPayrollSummary] = useState(null);
  const [commissions, setCommissions] = useState([]);
  const [commissionRules, setCommissionRules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Modals
  const [isPeriodModalOpen, setIsPeriodModalOpen] = useState(false);
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [isCalcModalOpen, setIsCalcModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);
  const [targetCommission, setTargetCommission] = useState(null);

  // Forms
  const [periodForm] = Form.useForm();
  const [ruleForm] = Form.useForm();
  const [calcForm] = Form.useForm();
  const [adjustForm] = Form.useForm();
  const [employeeForm] = Form.useForm();

  // Load initial data
  useEffect(() => {
    loadPayrollPeriods();
    loadEmployees();
    loadCommissionRules();
    loadCommissions();
    if (['ADMIN', 'ACCOUNTANT'].includes(user?.role)) {
      loadUsers();
    }
  }, []);

  useEffect(() => {
    if (selectedPeriodId) {
      loadPayrollSummary(selectedPeriodId);
    }
  }, [selectedPeriodId]);

  const loadPayrollPeriods = async () => {
    try {
      setLoading(true);
      const res = await hrApi.getPayrollPeriods();
      const list = res || [];
      setPeriods(list);
      if (list.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(list[0].payrollPeriodId);
      }
    } catch (err) {
      message.error(err.message || 'Lỗi tải danh sách kỳ lương');
    } finally {
      setLoading(false);
    }
  };

  const loadPayrollSummary = async (periodId) => {
    try {
      setLoading(true);
      const res = await hrApi.getPayrollSummary(periodId);
      setPayrollSummary(res);
    } catch (err) {
      message.error(err.message || 'Lỗi tải tổng hợp bảng lương');
    } finally {
      setLoading(false);
    }
  };

  const loadCommissions = async () => {
    try {
      const res = await hrApi.getCommissions();
      setCommissions(res || []);
    } catch (err) {
      message.error(err.message || 'Lỗi tải danh sách hoa hồng');
    }
  };

  const loadCommissionRules = async () => {
    try {
      const res = await hrApi.getCommissionRules();
      setCommissionRules(res || []);
    } catch (err) {
      // Bác sĩ có thể không có quyền đọc danh sách rule admin
    }
  };

  const loadEmployees = async () => {
    try {
      const res = await hrApi.getEmployees();
      setEmployees(res || []);
    } catch (err) {
      // Ignored for doctor role
    }
  };

  const loadUsers = async () => {
    try {
      const res = await userApi.getUsers();
      setAllUsers(res?.data?.items || res?.data || res || []);
    } catch (err) {
      // Ignored
    }
  };

  // Handlers
  const handleCreatePeriod = async (values) => {
    try {
      setLoading(true);
      await hrApi.createPayrollPeriod({
        code: values.code,
        startsOn: values.dateRange[0].format('YYYY-MM-DD'),
        endsOn: values.dateRange[1].format('YYYY-MM-DD'),
      });
      message.success('Tạo kỳ lương mới thành công');
      setIsPeriodModalOpen(false);
      periodForm.resetFields();
      loadPayrollPeriods();
    } catch (err) {
      message.error(err.message || 'Lỗi tạo kỳ lương');
    } finally {
      setLoading(false);
    }
  };

  const handleLockPeriod = async (periodId) => {
    Modal.confirm({
      title: 'Xác nhận khóa sổ kỳ lương?',
      icon: <LockOutlined style={{ color: '#faad14' }} />,
      content: 'Sau khi khóa, hệ thống sẽ BẢO LƯU BẤT BIẾN bảng lương kỳ này. Không thể tính thêm hoa hồng hay điều chỉnh vào kỳ này nữa.',
      okText: 'Khóa kỳ lương',
      okType: 'danger',
      cancelText: 'Hủy',
      onOk: async () => {
        try {
          setLoading(true);
          await hrApi.lockPayrollPeriod(periodId);
          message.success('Kỳ lương đã được khóa an toàn');
          loadPayrollPeriods();
          loadPayrollSummary(periodId);
        } catch (err) {
          message.error(err.message || 'Lỗi khóa kỳ lương');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const handleCreateRule = async (values) => {
    try {
      setLoading(true);
      await hrApi.createCommissionRule({
        serviceId: values.serviceId || null,
        basis: values.basis,
        ratePercent: values.ratePercent,
        effectiveFrom: values.dateRange[0].toISOString(),
        effectiveTo: values.dateRange[1] ? values.dateRange[1].toISOString() : null,
      });
      message.success('Tạo quy tắc hoa hồng nháp thành công (DRAFT)');
      setIsRuleModalOpen(false);
      ruleForm.resetFields();
      loadCommissionRules();
    } catch (err) {
      message.error(err.message || 'Lỗi tạo quy tắc hoa hồng');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRule = async (ruleId) => {
    try {
      setLoading(true);
      await hrApi.approveCommissionRule(ruleId);
      message.success('Phê duyệt quy tắc hoa hồng thành công (APPROVED)');
      loadCommissionRules();
    } catch (err) {
      message.error(err.message || 'Lỗi phê duyệt quy tắc hoa hồng');
    } finally {
      setLoading(false);
    }
  };

  const handleCalculateCommission = async (values) => {
    try {
      setLoading(true);
      await hrApi.calculateCommission({
        employeeId: values.employeeId,
        serviceCompletionEventId: values.serviceCompletionEventId,
        commissionRuleVersionId: values.commissionRuleVersionId,
        payrollPeriodId: values.payrollPeriodId,
        basisAmount: values.basisAmount,
      });
      message.success('Tính hoa hồng thành công');
      setIsCalcModalOpen(false);
      calcForm.resetFields();
      loadCommissions();
      if (selectedPeriodId) loadPayrollSummary(selectedPeriodId);
    } catch (err) {
      message.error(err.message || 'Lỗi tính hoa hồng');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustCommission = async (values) => {
    try {
      setLoading(true);
      await hrApi.adjustCommission(targetCommission.commissionId, {
        payrollPeriodId: values.payrollPeriodId,
        amount: values.amount,
        reason: values.reason,
      });
      message.success('Lập điều chỉnh hoa hồng thành công');
      setIsAdjustModalOpen(false);
      adjustForm.resetFields();
      loadCommissions();
      if (selectedPeriodId) loadPayrollSummary(selectedPeriodId);
    } catch (err) {
      message.error(err.message || 'Lỗi điều chỉnh hoa hồng');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEmployee = async (values) => {
    try {
      setLoading(true);
      await hrApi.createEmployee({
        userId: values.userId,
        employeeCode: values.employeeCode,
        baseSalary: values.baseSalary,
      });
      message.success('Đăng ký nhân viên thành công');
      setIsEmployeeModalOpen(false);
      employeeForm.resetFields();
      loadEmployees();
    } catch (err) {
      message.error(err.message || 'Lỗi tạo nhân viên');
    } finally {
      setLoading(false);
    }
  };

  // Columns for Payroll Summary
  const summaryColumns = [
    {
      title: 'Mã NV',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Họ và tên',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      render: (role) => (
        <Tag color={role === 'DOCTOR' ? 'blue' : role === 'ACCOUNTANT' ? 'gold' : 'cyan'}>
          {role}
        </Tag>
      ),
    },
    {
      title: 'Lương cơ bản',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      align: 'right',
      render: (val) => `${Number(val).toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Tổng hoa hồng',
      dataIndex: 'totalCommissions',
      key: 'totalCommissions',
      align: 'right',
      render: (val, row) => (
        <Space>
          <Text style={{ color: '#389e0d' }}>+{Number(val).toLocaleString('vi-VN')} đ</Text>
          <Tag>{row.commissionCount} ca</Tag>
        </Space>
      ),
    },
    {
      title: 'Điều chỉnh',
      dataIndex: 'totalAdjustments',
      key: 'totalAdjustments',
      align: 'right',
      render: (val) => {
        const num = Number(val);
        return (
          <Text style={{ color: num < 0 ? '#cf1322' : '#389e0d' }}>
            {num > 0 ? `+${num.toLocaleString('vi-VN')}` : `${num.toLocaleString('vi-VN')}`} đ
          </Text>
        );
      },
    },
    {
      title: 'Thực lĩnh (Net Pay)',
      dataIndex: 'netPay',
      key: 'netPay',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#096dd9', fontSize: '15px' }}>
          {Number(val).toLocaleString('vi-VN')} đ
        </Text>
      ),
    },
  ];

  // Columns for Commissions
  const commissionColumns = [
    {
      title: 'Thời gian',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (val) => dayjs(val).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Nhân viên',
      dataIndex: ['employee', 'user', 'displayName'],
      key: 'employeeName',
      render: (text, row) => text || row.employee?.employeeCode,
    },
    {
      title: 'Quy tắc áp dụng',
      dataIndex: ['ruleVersion', 'ratePercent'],
      key: 'rule',
      render: (rate, row) => (
        <div>
          <Tag color="purple">{Number(rate)}%</Tag>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {row.ruleVersion?.basis === 'COMPLETION' ? 'Hoàn thành' : 'Thực thu'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Số tiền căn cứ',
      dataIndex: 'basisAmount',
      key: 'basisAmount',
      align: 'right',
      render: (val) => `${Number(val).toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Hoa hồng',
      dataIndex: 'commissionAmount',
      key: 'commissionAmount',
      align: 'right',
      render: (val) => (
        <Text strong style={{ color: '#389e0d' }}>
          +{Number(val).toLocaleString('vi-VN')} đ
        </Text>
      ),
    },
    {
      title: 'Điều chỉnh liên kết',
      dataIndex: 'adjustments',
      key: 'adjustments',
      render: (adjList) => {
        if (!adjList || adjList.length === 0) return <Text type="secondary">-</Text>;
        const total = adjList.reduce((sum, a) => sum + Number(a.amount), 0);
        return (
          <Tooltip title={adjList.map(a => `${a.reason}: ${Number(a.amount).toLocaleString('vi-VN')}đ`).join(', ')}>
            <Tag color={total < 0 ? 'red' : 'green'}>
              {total.toLocaleString('vi-VN')} đ ({adjList.length})
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st) => (
        <Tag color={st === 'PAID' ? 'green' : st === 'APPROVED' ? 'blue' : 'gold'}>
          {st}
        </Tag>
      ),
    },
    ...(['ADMIN', 'ACCOUNTANT'].includes(user?.role)
      ? [
          {
            title: 'Hành động',
            key: 'action',
            render: (_, row) => (
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setTargetCommission(row);
                  adjustForm.setFieldsValue({ payrollPeriodId: row.payrollPeriodId });
                  setIsAdjustModalOpen(true);
                }}
              >
                Điều chỉnh
              </Button>
            ),
          },
        ]
      : []),
  ];

  // Columns for Commission Rules
  const ruleColumns = [
    {
      title: 'Phiên bản',
      dataIndex: 'versionNo',
      key: 'versionNo',
      render: (v) => <Tag color="blue">v{v}</Tag>,
    },
    {
      title: 'Dịch vụ áp dụng',
      dataIndex: ['service', 'name'],
      key: 'serviceName',
      render: (text) => text || <Tag color="cyan">Toàn bộ dịch vụ (Global)</Tag>,
    },
    {
      title: 'Căn cứ tính',
      dataIndex: 'basis',
      key: 'basis',
      render: (b) => (
        <Tag color={b === 'COMPLETION' ? 'green' : 'orange'}>
          {b === 'COMPLETION' ? 'Hoàn thành thủ thuật' : 'Xác nhận thực thu'}
        </Tag>
      ),
    },
    {
      title: 'Tỷ lệ %',
      dataIndex: 'ratePercent',
      key: 'ratePercent',
      render: (r) => <Text strong style={{ color: '#722ed1' }}>{Number(r)}%</Text>,
    },
    {
      title: 'Thời gian hiệu lực',
      key: 'period',
      render: (_, row) => (
        <Text style={{ fontSize: '12px' }}>
          {dayjs(row.effectiveFrom).format('DD/MM/YYYY')}
          {row.effectiveTo ? ` ~ ${dayjs(row.effectiveTo).format('DD/MM/YYYY')}` : ' (Không thời hạn)'}
        </Text>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st) => (
        <Tag color={st === 'APPROVED' ? 'green' : st === 'RETIRED' ? 'default' : 'orange'}>
          {st}
        </Tag>
      ),
    },
    {
      title: 'Người duyệt',
      dataIndex: ['approver', 'displayName'],
      key: 'approverName',
      render: (text) => text || <Text type="secondary">Chưa duyệt</Text>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, row) => {
        if (row.status === 'DRAFT' && (user?.isApprover || user?.role === 'ADMIN')) {
          return (
            <Button
              type="primary"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleApproveRule(row.commissionRuleVersionId)}
            >
              Phê duyệt
            </Button>
          );
        }
        return null;
      },
    },
  ];

  // Columns for Employees
  const employeeColumns = [
    {
      title: 'Mã nhân viên',
      dataIndex: 'employeeCode',
      key: 'employeeCode',
      render: (code) => <Text strong>{code}</Text>,
    },
    {
      title: 'Tài khoản người dùng',
      dataIndex: ['user', 'displayName'],
      key: 'userName',
      render: (name, row) => (
        <div>
          <div>{name}</div>
          <Text type="secondary" style={{ fontSize: '11px' }}>@{row.user?.username}</Text>
        </div>
      ),
    },
    {
      title: 'Vai trò',
      dataIndex: ['user', 'role'],
      key: 'role',
      render: (role) => <Tag color="blue">{role}</Tag>,
    },
    {
      title: 'Lương cơ bản',
      dataIndex: 'baseSalary',
      key: 'baseSalary',
      align: 'right',
      render: (val) => `${Number(val).toLocaleString('vi-VN')} đ`,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (st) => (
        <Tag color={st === 'ACTIVE' ? 'green' : 'default'}>
          {st}
        </Tag>
      ),
    },
  ];

  const currentPeriod = periods.find((p) => p.payrollPeriodId === selectedPeriodId);

  return (
    <div style={{ padding: '0 8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <Title level={3} style={{ margin: 0 }}>Hoa hồng & Bảng lương (Module 11)</Title>
          <Text type="secondary">
            Kiểm soát hoa hồng, ngăn chặn tính trùng dòng tiền, hoàn tiền điều chỉnh số âm, khóa bảng lương bất biến
          </Text>
        </div>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => {
            loadPayrollPeriods();
            loadCommissions();
            if (selectedPeriodId) loadPayrollSummary(selectedPeriodId);
          }}>
            Làm mới
          </Button>
        </Space>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'periods',
            label: (
              <span>
                <DollarOutlined /> Bảng lương theo kỳ
              </span>
            ),
            children: (
              <Card>
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }} align="middle" justify="space-between">
                  <Col xs={24} md={12}>
                    <Space size="middle" wrap>
                      <Text strong>Chọn kỳ lương:</Text>
                      <Select
                        style={{ width: 220 }}
                        value={selectedPeriodId}
                        onChange={setSelectedPeriodId}
                        placeholder="Chọn kỳ lương"
                      >
                        {periods.map((p) => (
                          <Option key={p.payrollPeriodId} value={p.payrollPeriodId}>
                            {p.code} ({dayjs(p.startsOn).format('DD/MM')} - {dayjs(p.endsOn).format('DD/MM/YYYY')})
                          </Option>
                        ))}
                      </Select>
                      {currentPeriod && (
                        <Tag color={currentPeriod.status === 'LOCKED' ? 'red' : 'green'} icon={currentPeriod.status === 'LOCKED' ? <LockOutlined /> : null}>
                          {currentPeriod.status === 'LOCKED' ? 'ĐÃ KHÓA SỔ' : 'ĐANG MỞ (OPEN)'}
                        </Tag>
                      )}
                    </Space>
                  </Col>
                  <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                    <Space>
                      {['ADMIN', 'ACCOUNTANT'].includes(user?.role) && (
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setIsPeriodModalOpen(true)}
                        >
                          Mở kỳ lương mới
                        </Button>
                      )}
                      {currentPeriod?.status === 'OPEN' && (user?.isApprover || user?.role === 'ADMIN') && (
                        <Button
                          danger
                          icon={<LockOutlined />}
                          onClick={() => handleLockPeriod(currentPeriod.payrollPeriodId)}
                        >
                          Khóa sổ kỳ này
                        </Button>
                      )}
                    </Space>
                  </Col>
                </Row>

                {currentPeriod?.status === 'LOCKED' && (
                  <Alert
                    message="Kỳ lương này đã bị khóa sổ an toàn"
                    description="Tất cả dữ liệu hoa hồng và lương của kỳ này đã được chốt. Mọi điều chỉnh phát sinh mới phải được ghi vào kỳ lương tiếp theo."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 16 }}
                  />
                )}

                {payrollSummary && (
                  <>
                    <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                          <Statistic
                            title="Tổng quỹ lương thực lĩnh"
                            value={payrollSummary.totalPayrollAmount}
                            precision={0}
                            suffix="đ"
                            valueStyle={{ color: '#389e0d', fontWeight: 'bold' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small" style={{ background: '#e6f7ff', borderColor: '#91d5ff' }}>
                          <Statistic
                            title="Số nhân viên trong kỳ"
                            value={payrollSummary.summary?.length || 0}
                            valueStyle={{ color: '#096dd9' }}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Card size="small">
                          <Statistic
                            title="Thời gian kỳ"
                            value={`${dayjs(currentPeriod?.startsOn).format('DD/MM/YYYY')} ~ ${dayjs(currentPeriod?.endsOn).format('DD/MM/YYYY')}`}
                            valueStyle={{ fontSize: '16px' }}
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Table
                      rowKey="employeeId"
                      dataSource={payrollSummary.summary}
                      columns={summaryColumns}
                      loading={loading}
                      pagination={{ pageSize: 10 }}
                    />
                  </>
                )}
              </Card>
            ),
          },
          {
            key: 'commissions',
            label: (
              <span>
                <DollarOutlined /> Hoa hồng dịch vụ
              </span>
            ),
            children: (
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                  <Text strong>Danh sách hoa hồng theo ca thủ thuật:</Text>
                  {['ADMIN', 'ACCOUNTANT'].includes(user?.role) && (
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => setIsCalcModalOpen(true)}
                    >
                      Tính hoa hồng ca mới
                    </Button>
                  )}
                </div>
                <Table
                  rowKey="commissionId"
                  dataSource={commissions}
                  columns={commissionColumns}
                  loading={loading}
                  pagination={{ pageSize: 10 }}
                />
              </Card>
            ),
          },
          ...(['ADMIN', 'ACCOUNTANT'].includes(user?.role)
            ? [
                {
                  key: 'rules',
                  label: (
                    <span>
                      <FileTextOutlined /> Quy tắc hoa hồng
                    </span>
                  ),
                  children: (
                    <Card>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Text strong>Phiên bản quy tắc hoa hồng (Ngăn ngừa chồng chéo & Maker-Checker):</Text>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setIsRuleModalOpen(true)}
                        >
                          Tạo quy tắc hoa hồng mới
                        </Button>
                      </div>
                      <Table
                        rowKey="commissionRuleVersionId"
                        dataSource={commissionRules}
                        columns={ruleColumns}
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                      />
                    </Card>
                  ),
                },
                {
                  key: 'employees',
                  label: (
                    <span>
                      <UsergroupAddOutlined /> Danh sách nhân sự
                    </span>
                  ),
                  children: (
                    <Card>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                        <Text strong>Hồ sơ nhân viên & Lương cơ bản:</Text>
                        <Button
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => setIsEmployeeModalOpen(true)}
                        >
                          Đăng ký nhân sự mới
                        </Button>
                      </div>
                      <Table
                        rowKey="employeeId"
                        dataSource={employees}
                        columns={employeeColumns}
                        loading={loading}
                        pagination={{ pageSize: 10 }}
                      />
                    </Card>
                  ),
                },
              ]
            : []),
        ]}
      />

      {/* Modal Mở kỳ lương mới */}
      <Modal
        title="Mở kỳ lương mới"
        open={isPeriodModalOpen}
        onCancel={() => setIsPeriodModalOpen(false)}
        footer={null}
      >
        <Form form={periodForm} layout="vertical" onFinish={handleCreatePeriod}>
          <Form.Item
            name="code"
            label="Mã kỳ lương"
            rules={[{ required: true, message: 'Vui lòng nhập mã kỳ lương (VD: PR-2026-10)' }]}
          >
            <Input placeholder="PR-2026-10" />
          </Form.Item>
          <Form.Item
            name="dateRange"
            label="Khoảng thời gian kỳ"
            rules={[{ required: true, message: 'Vui lòng chọn ngày bắt đầu và kết thúc' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsPeriodModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Tạo kỳ lương
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Tạo quy tắc hoa hồng */}
      <Modal
        title="Tạo quy tắc hoa hồng mới"
        open={isRuleModalOpen}
        onCancel={() => setIsRuleModalOpen(false)}
        footer={null}
      >
        <Form form={ruleForm} layout="vertical" onFinish={handleCreateRule}>
          <Form.Item name="basis" label="Căn cứ tính" initialValue="COMPLETION" rules={[{ required: true }]}>
            <Select>
              <Option value="COMPLETION">Hoàn thành thủ thuật (COMPLETION)</Option>
              <Option value="CONFIRMED_COLLECTION">Xác nhận thực thu (CONFIRMED_COLLECTION)</Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="ratePercent"
            label="Tỷ lệ hoa hồng (%)"
            rules={[{ required: true, message: 'Vui lòng nhập tỷ lệ hoa hồng (0 - 100%)' }]}
          >
            <InputNumber min={0} max={100} step={0.5} style={{ width: '100%' }} placeholder="VD: 10.0" />
          </Form.Item>
          <Form.Item
            name="dateRange"
            label="Thời gian hiệu lực"
            rules={[{ required: true, message: 'Vui lòng chọn ngày hiệu lực' }]}
          >
            <DatePicker.RangePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsRuleModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Lưu quy tắc nháp (DRAFT)
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Tính hoa hồng ca mới */}
      <Modal
        title="Tính hoa hồng cho ca thủ thuật"
        open={isCalcModalOpen}
        onCancel={() => setIsCalcModalOpen(false)}
        footer={null}
      >
        <Form form={calcForm} layout="vertical" onFinish={handleCalculateCommission}>
          <Form.Item name="employeeId" label="Nhân viên hưởng hoa hồng" rules={[{ required: true, message: 'Chọn nhân viên' }]}>
            <Select placeholder="Chọn nhân viên">
              {employees.map((e) => (
                <Option key={e.employeeId} value={e.employeeId}>
                  {e.employeeCode} - {e.user?.displayName} ({e.user?.role})
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="serviceCompletionEventId"
            label="Mã sự kiện hoàn thành (ServiceCompletionEventId)"
            rules={[{ required: true, message: 'Nhập ID sự kiện chốt thủ thuật' }]}
          >
            <Input placeholder="UUID sự kiện hoàn thành" />
          </Form.Item>
          <Form.Item name="commissionRuleVersionId" label="Quy tắc hoa hồng áp dụng" rules={[{ required: true, message: 'Chọn quy tắc' }]}>
            <Select placeholder="Chọn quy tắc đã duyệt">
              {commissionRules
                .filter((r) => r.status === 'APPROVED')
                .map((r) => (
                  <Option key={r.commissionRuleVersionId} value={r.commissionRuleVersionId}>
                    v{r.versionNo} - {Number(r.ratePercent)}% ({r.basis})
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="payrollPeriodId" label="Kỳ lương ghi nhận" initialValue={selectedPeriodId} rules={[{ required: true }]}>
            <Select placeholder="Chọn kỳ lương">
              {periods
                .filter((p) => p.status === 'OPEN')
                .map((p) => (
                  <Option key={p.payrollPeriodId} value={p.payrollPeriodId}>
                    {p.code} (Đang mở)
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item name="basisAmount" label="Số tiền căn cứ tính hoa hồng (VNĐ)" rules={[{ required: true }]}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
              placeholder="VD: 2,000,000"
            />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsCalcModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Tính và lưu hoa hồng
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Điều chỉnh hoa hồng */}
      <Modal
        title="Lập điều chỉnh hoa hồng (Hoàn tiền / Đảo dịch vụ)"
        open={isAdjustModalOpen}
        onCancel={() => setIsAdjustModalOpen(false)}
        footer={null}
      >
        <Form form={adjustForm} layout="vertical" onFinish={handleAdjustCommission}>
          <Alert
            message="Quy tắc kế toán: Bất biến bản ghi gốc"
            description="Điều chỉnh hoa hồng sẽ tạo bản ghi CommissionAdjustment riêng biệt (thường mang số âm nếu hoàn tiền). Bản ghi hoa hồng gốc được giữ nguyên vẹn để phục vụ kiểm toán."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item name="payrollPeriodId" label="Kỳ lương ghi nhận điều chỉnh" rules={[{ required: true }]}>
            <Select placeholder="Chọn kỳ lương đang mở">
              {periods
                .filter((p) => p.status === 'OPEN')
                .map((p) => (
                  <Option key={p.payrollPeriodId} value={p.payrollPeriodId}>
                    {p.code} (Đang mở)
                  </Option>
                ))}
            </Select>
          </Form.Item>
          <Form.Item
            name="amount"
            label="Số tiền điều chỉnh (VNĐ - Nhập số âm nếu giảm trừ)"
            rules={[{ required: true, message: 'Nhập số tiền khác 0' }]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="VD: -100000"
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="Lý do điều chỉnh"
            rules={[{ required: true, message: 'Vui lòng giải trình lý do điều chỉnh' }]}
          >
            <Input.TextArea rows={3} placeholder="VD: Khách hàng hoàn tiền thủ thuật trám răng..." />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsAdjustModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Xác nhận điều chỉnh
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Modal Đăng ký nhân sự */}
      <Modal
        title="Đăng ký hồ sơ nhân sự mới"
        open={isEmployeeModalOpen}
        onCancel={() => setIsEmployeeModalOpen(false)}
        footer={null}
      >
        <Form form={employeeForm} layout="vertical" onFinish={handleCreateEmployee}>
          <Form.Item name="userId" label="Tài khoản người dùng" rules={[{ required: true, message: 'Chọn tài khoản' }]}>
            <Select placeholder="Chọn tài khoản hệ thống">
              {allUsers.map((u) => (
                <Option key={u.userId} value={u.userId}>
                  {u.displayName} (@{u.username}) - {u.role?.name || u.role}
                </Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="employeeCode" label="Mã nhân viên" rules={[{ required: true, message: 'Nhập mã NV' }]}>
            <Input placeholder="VD: NV-DOC-001" />
          </Form.Item>
          <Form.Item name="baseSalary" label="Lương cơ bản (VNĐ)" initialValue={10000000} rules={[{ required: true }]}>
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              formatter={(val) => `${val}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(val) => val.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item style={{ textAlign: 'right', marginBottom: 0 }}>
            <Space>
              <Button onClick={() => setIsEmployeeModalOpen(false)}>Hủy</Button>
              <Button type="primary" htmlType="submit" loading={loading}>
                Tạo hồ sơ
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
