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
  InboxOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  StopOutlined,
  PlusOutlined,
  SearchOutlined,
  HistoryOutlined,
  ReloadOutlined,
  MedicineBoxOutlined,
  SafetyCertificateOutlined,
  BarcodeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { inventoryApi } from '../../services/api-client.js';
import { useAuth } from '../../context/auth-context.jsx';

const { Title, Text } = Typography;

export function InventoryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('balances');

  // Master Data
  const [warehouses, setWarehouses] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');

  // Tab Data
  const [balances, setBalances] = useState([]);
  const [lots, setLots] = useState([]);
  const [serials, setSerials] = useState([]);

  // Modals
  const [receiptModal, setReceiptModal] = useState(false);
  const [dispenseModal, setDispenseModal] = useState(false);
  const [recallModal, setRecallModal] = useState(false);
  const [traceModal, setTraceModal] = useState(false);
  const [implantModal, setImplantModal] = useState(false);

  // Trace Data
  const [selectedLotForRecall, setSelectedLotForRecall] = useState(null);
  const [traceData, setTraceData] = useState(null);

  // Forms
  const [formReceipt] = Form.useForm();
  const [formDispense] = Form.useForm();
  const [formRecall] = Form.useForm();
  const [formImplant] = Form.useForm();

  useEffect(() => {
    loadMasterData();
  }, []);

  useEffect(() => {
    loadBalances();
  }, [selectedWarehouseId]);

  async function loadMasterData() {
    try {
      setLoading(true);
      const [whRes, supRes, itemsRes] = await Promise.all([
        inventoryApi.getWarehouses(),
        inventoryApi.getSuppliers(),
        inventoryApi.getItems(),
      ]);

      const whList = whRes.data || [];
      setWarehouses(whList);
      if (whList.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(whList[0].warehouseId);
      }
      setSuppliers(supRes.data || []);
      setItems(itemsRes.data || []);
    } catch (err) {
      message.error(err.message || 'Không thể tải dữ liệu danh mục kho');
    } finally {
      setLoading(false);
    }
  }

  async function loadBalances() {
    try {
      setLoading(true);
      const [balRes, lotsRes, serialsRes] = await Promise.all([
        inventoryApi.getBalances(selectedWarehouseId || undefined),
        inventoryApi.getLots(),
        inventoryApi.getSerials(),
      ]);
      setBalances(balRes.data || []);
      setLots(lotsRes.data || []);
      setSerials(serialsRes.data || []);
    } catch (err) {
      message.error(err.message || 'Không thể tải tồn kho');
    } finally {
      setLoading(false);
    }
  }

  // --- Handlers ---
  async function handleCreateReceipt(values) {
    try {
      setLoading(true);
      const payload = {
        warehouseId: values.warehouseId,
        supplierId: values.supplierId,
        receiptNo: values.receiptNo,
        items: [
          {
            itemId: values.itemId,
            lotNumber: values.lotNumber,
            expiryDate: values.expiryDate.format('YYYY-MM-DD'),
            quantity: Number(values.quantity),
            unitCost: Number(values.unitCost || 0),
            serialNumbers: values.serialNumbers
              ? values.serialNumbers.split(',').map((s) => s.trim()).filter(Boolean)
              : [],
          },
        ],
      };

      await inventoryApi.createGoodsReceipt(payload);
      message.success('Nhập kho thành công!');
      setReceiptModal(false);
      formReceipt.resetFields();
      loadBalances();
    } catch (err) {
      message.error(err.response?.data?.error?.message || err.message || 'Lỗi nhập kho');
    } finally {
      setLoading(false);
    }
  }

  async function handleDispense(values) {
    try {
      setLoading(true);
      await inventoryApi.dispense({
        warehouseId: selectedWarehouseId,
        itemId: values.itemId,
        quantity: Number(values.quantity),
        specificLotId: values.specificLotId || undefined,
        note: values.note,
      });
      message.success('Xuất kho thành công theo nguyên tắc FEFO!');
      setDispenseModal(false);
      formDispense.resetFields();
      loadBalances();
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      if (errCode === 'EXPIRED_LOT_CANNOT_DISPENSE') {
        message.error('AT-07 CHẶN: Lô hàng đã hết hạn sử dụng, không được phép xuất cấp!');
      } else if (errCode === 'LOT_RECALLED_CANNOT_DISPENSE') {
        message.error('AT-08 CHẶN: Lô hàng đang có quyết định thu hồi khẩn cấp!');
      } else {
        message.error(err.response?.data?.error?.message || err.message || 'Lỗi xuất kho');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleRecallLot(values) {
    if (!selectedLotForRecall) return;
    try {
      setLoading(true);
      await inventoryApi.recallLot(selectedLotForRecall.stockLotId, {
        reason: values.reason,
      });
      message.warning(`Đã ban hành lệnh THU HỒI LÔ (${selectedLotForRecall.lotNumber})! Toàn bộ tồn kho đã bị khóa (AT-08).`);
      setRecallModal(false);
      formRecall.resetFields();
      loadBalances();
    } catch (err) {
      message.error(err.response?.data?.error?.message || err.message || 'Lỗi ban hành thu hồi');
    } finally {
      setLoading(false);
    }
  }

  async function handleOpenTrace(lot) {
    try {
      setLoading(true);
      const res = await inventoryApi.traceLot(lot.stockLotId);
      setTraceData(res.data);
      setTraceModal(true);
    } catch (err) {
      message.error(err.message || 'Không thể truy vết bệnh nhân');
    } finally {
      setLoading(false);
    }
  }

  async function handleImplant(values) {
    try {
      setLoading(true);
      await inventoryApi.implantSerial({
        serialNumber: values.serialNumber,
      });
      message.success(`Đã ghi nhận cấy ghép thành công Trụ Implant (${values.serialNumber})!`);
      setImplantModal(false);
      formImplant.resetFields();
      loadBalances();
    } catch (err) {
      const errCode = err.response?.data?.error?.code;
      if (errCode === 'SERIAL_ALREADY_IMPLANTED') {
        message.error('AT-12 VI PHẠM: Trụ Implant này đã cấy ghép cho bệnh nhân khác trước đó! Nghiêm cấm tái sử dụng.');
      } else {
        message.error(err.response?.data?.error?.message || err.message || 'Lỗi cấy ghép');
      }
    } finally {
      setLoading(false);
    }
  }

  // --- Calculations for Statistics ---
  const today = dayjs();
  const expiredLotsCount = lots.filter(
    (l) => l.expiryDate && dayjs(l.expiryDate).isBefore(today, 'day')
  ).length;
  const expiringLotsCount = lots.filter((l) => {
    if (!l.expiryDate) return false;
    const diff = dayjs(l.expiryDate).diff(today, 'day');
    return diff >= 0 && diff <= 30;
  }).length;
  const recalledLotsCount = lots.filter((l) => l.status === 'RECALLED').length;
  const consumedSerialsCount = serials.filter((s) => s.status === 'CONSUMED').length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title level={2} className="!mb-1">
            Kho Dược phẩm & Vật tư Y tế (AT-07, AT-08, AT-12)
          </Title>
          <Text type="secondary">
            Kiểm soát Hạn dùng FEFO (AT-07), Thu hồi Lô khẩn cấp & Truy vết bệnh nhân (AT-08), Quản lý Serial Implant chống tái sử dụng (AT-12)
          </Text>
        </div>
        <Space wrap>
          <Select
            style={{ width: 220 }}
            placeholder="Chọn kho"
            value={selectedWarehouseId}
            onChange={(val) => setSelectedWarehouseId(val)}
            options={warehouses.map((w) => ({
              label: `${w.code} - ${w.name}`,
              value: w.warehouseId,
            }))}
          />
          <Button icon={<ReloadOutlined />} onClick={loadBalances} loading={loading}>
            Làm mới
          </Button>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setReceiptModal(true)}
          >
            Nhập kho
          </Button>
          <Button
            danger
            icon={<StopOutlined />}
            onClick={() => setDispenseModal(true)}
          >
            Xuất dùng (FEFO)
          </Button>
        </Space>
      </div>

      {/* KPI Cards */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-blue-500">
            <Statistic
              title="Tổng mặt hàng tồn kho"
              value={balances.length}
              prefix={<InboxOutlined />}
              suffix="mặt hàng"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-yellow-500">
            <Statistic
              title="Lô sắp hết hạn (<= 30 ngày)"
              value={expiringLotsCount}
              valueStyle={{ color: '#d48806' }}
              prefix={<WarningOutlined />}
              suffix="lô (FEFO)"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-red-500">
            <Statistic
              title="Lô quá hạn (Chặn xuất AT-07)"
              value={expiredLotsCount}
              valueStyle={{ color: '#cf1322' }}
              prefix={<StopOutlined />}
              suffix="lô"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card bordered={false} className="shadow-sm border-l-4 border-l-purple-500">
            <Statistic
              title="Trụ Implant đã cấy ghép (AT-12)"
              value={consumedSerialsCount}
              valueStyle={{ color: '#722ed1' }}
              prefix={<BarcodeOutlined />}
              suffix={`/ ${serials.length} trụ`}
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
              key: 'balances',
              label: (
                <span>
                  <InboxOutlined /> Tồn kho & Kiểm soát FEFO (AT-07)
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <Alert
                    type="info"
                    showIcon
                    message="Nguyên tắc xuất kho FEFO (First Expired, First Out)"
                    description="Hệ thống tự động sắp xếp theo thứ tự hạn dùng gần nhất để xuất trước. Bất kỳ lô nào quá hạn sử dụng sẽ bị chặn xuất cấp tuyệt đối (Mã lỗi: EXPIRED_LOT_CANNOT_DISPENSE)."
                  />
                  <Table
                    rowKey="stockBalanceId"
                    dataSource={balances}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Mã hàng',
                        dataIndex: ['item', 'code'],
                        key: 'itemCode',
                        render: (text) => <Text strong>{text}</Text>,
                      },
                      {
                        title: 'Tên hàng hóa / Vật tư',
                        dataIndex: ['item', 'name'],
                        key: 'itemName',
                      },
                      {
                        title: 'Lô sản xuất',
                        dataIndex: ['lot', 'lotNumber'],
                        key: 'lotNumber',
                        render: (text, r) => (
                          <Space>
                            <Tag color="cyan">{text || 'N/A'}</Tag>
                            {r.lot?.status === 'RECALLED' && (
                              <Tag color="error">ĐANG THU HỒI</Tag>
                            )}
                          </Space>
                        ),
                      },
                      {
                        title: 'Hạn dùng (Expiry Date)',
                        dataIndex: ['lot', 'expiryDate'],
                        key: 'expiryDate',
                        render: (date) => {
                          if (!date) return <Text type="secondary">Không có</Text>;
                          const isExpired = dayjs(date).isBefore(today, 'day');
                          const isNear = dayjs(date).diff(today, 'day') <= 30;
                          return (
                            <Tag color={isExpired ? 'red' : isNear ? 'warning' : 'green'}>
                              {date} {isExpired ? '(Đã hết hạn)' : isNear ? '(Sắp hết hạn)' : ''}
                            </Tag>
                          );
                        },
                      },
                      {
                        title: 'Tồn thực tế',
                        dataIndex: 'onHand',
                        key: 'onHand',
                        render: (val, r) => (
                          <Text strong>
                            {Number(val).toLocaleString()} {r.item?.baseUnit}
                          </Text>
                        ),
                      },
                      {
                        title: 'Khóa (Blocked)',
                        dataIndex: 'blocked',
                        key: 'blocked',
                        render: (val, r) => (
                          <Text type={Number(val) > 0 ? 'danger' : 'secondary'}>
                            {Number(val).toLocaleString()} {r.item?.baseUnit}
                          </Text>
                        ),
                      },
                      {
                        title: 'Khả dụng (Available)',
                        dataIndex: 'available',
                        key: 'available',
                        render: (val, r) => (
                          <Tag color={Number(val) > 0 ? 'blue' : 'default'}>
                            {Number(val).toLocaleString()} {r.item?.baseUnit}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        render: (_, r) => (
                          <Space>
                            {r.lot && r.lot.status !== 'RECALLED' && (
                              <Button
                                size="small"
                                danger
                                icon={<WarningOutlined />}
                                onClick={() => {
                                  setSelectedLotForRecall(r.lot);
                                  setRecallModal(true);
                                }}
                              >
                                Thu hồi lô
                              </Button>
                            )}
                            {r.lot && (
                              <Button
                                size="small"
                                icon={<SearchOutlined />}
                                onClick={() => handleOpenTrace(r.lot)}
                              >
                                Truy vết (AT-08)
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
              key: 'lots',
              label: (
                <span>
                  <SafetyCertificateOutlined /> Thu hồi Lô & Truy vết bệnh nhân (AT-08)
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <Alert
                    type="warning"
                    showIcon
                    message="Quy trình Thu hồi Lô thuốc / Vật tư khẩn cấp (AT-08)"
                    description="Khi phát hiện lô thuốc có vấn đề hoặc có công văn từ Cục Quản lý Dược, ban hành lệnh thu hồi sẽ lập tức khóa toàn bộ số lượng tồn kho còn lại và kích hoạt cơ chế truy vết danh sách toàn bộ bệnh nhân đã sử dụng lô này."
                  />
                  <Table
                    rowKey="stockLotId"
                    dataSource={lots}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Số Lô',
                        dataIndex: 'lotNumber',
                        key: 'lotNumber',
                        render: (text) => <Text strong>{text}</Text>,
                      },
                      {
                        title: 'Mặt hàng',
                        dataIndex: ['item', 'name'],
                        key: 'itemName',
                      },
                      {
                        title: 'Hạn dùng',
                        dataIndex: 'expiryDate',
                        key: 'expiryDate',
                        render: (date) => (
                          <Tag color={dayjs(date).isBefore(today) ? 'red' : 'blue'}>
                            {date}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Trạng thái Lô',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => (
                          <Tag
                            color={
                              status === 'RELEASED'
                                ? 'success'
                                : status === 'RECALLED'
                                ? 'error'
                                : 'default'
                            }
                          >
                            {status === 'RELEASED'
                              ? 'LƯU HÀNH'
                              : status === 'RECALLED'
                              ? 'ĐANG THU HỒI'
                              : status}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Thao tác',
                        key: 'action',
                        render: (_, r) => (
                          <Space>
                            {r.status !== 'RECALLED' ? (
                              <Button
                                size="small"
                                danger
                                icon={<WarningOutlined />}
                                onClick={() => {
                                  setSelectedLotForRecall(r);
                                  setRecallModal(true);
                                }}
                              >
                                Ban hành thu hồi
                              </Button>
                            ) : (
                              <Tag color="error">ĐÃ KHÓA TOÀN BỘ</Tag>
                            )}
                            <Button
                              size="small"
                              type="primary"
                              ghost
                              icon={<SearchOutlined />}
                              onClick={() => handleOpenTrace(r)}
                            >
                              Truy vết bệnh nhân
                            </Button>
                          </Space>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: 'implants',
              label: (
                <span>
                  <BarcodeOutlined /> Quản lý Serial Implant & Chống tái sử dụng (AT-12)
                </span>
              ),
              children: (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Alert
                      type="success"
                      showIcon
                      message="Kiểm soát nghiêm ngặt Trụ Implant theo Mã Serial duy nhất (AT-12)"
                      description="Mỗi trụ implant có mã serial riêng biệt gắn liền với hồ sơ ca cấy ghép của bệnh nhân. Trụ đã cấy ghép (CONSUMED) sẽ bị từ chối tái sử dụng vĩnh viễn (Mã lỗi: SERIAL_ALREADY_IMPLANTED)."
                    />
                    <Button
                      type="primary"
                      icon={<MedicineBoxOutlined />}
                      onClick={() => setImplantModal(true)}
                    >
                      Ghi nhận Cấy ghép
                    </Button>
                  </div>
                  <Table
                    rowKey="stockSerialId"
                    dataSource={serials}
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      {
                        title: 'Số Serial Duy Nhất',
                        dataIndex: 'serialNumber',
                        key: 'serialNumber',
                        render: (text) => (
                          <Text strong copyable>
                            {text}
                          </Text>
                        ),
                      },
                      {
                        title: 'Tên Trụ Implant',
                        dataIndex: ['lot', 'item', 'name'],
                        key: 'itemName',
                      },
                      {
                        title: 'Số Lô',
                        dataIndex: ['lot', 'lotNumber'],
                        key: 'lotNumber',
                        render: (text) => <Tag color="cyan">{text}</Tag>,
                      },
                      {
                        title: 'Hạn dùng',
                        dataIndex: ['lot', 'expiryDate'],
                        key: 'expiryDate',
                      },
                      {
                        title: 'Trạng thái Serial',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => (
                          <Tag
                            color={
                              status === 'AVAILABLE'
                                ? 'green'
                                : status === 'CONSUMED'
                                ? 'purple'
                                : 'red'
                            }
                          >
                            {status === 'AVAILABLE'
                              ? 'TRONG KHO (SẴN SÀNG)'
                              : status === 'CONSUMED'
                              ? 'ĐÃ CẤY GHÉP (TIÊU HAO)'
                              : status}
                          </Tag>
                        ),
                      },
                      {
                        title: 'Ngày tạo',
                        dataIndex: 'createdAt',
                        key: 'createdAt',
                        render: (date) => (date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '—'),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* MODAL 1: NHẬP KHO */}
      <Modal
        title="Phiếu Nhập kho Dược phẩm / Vật tư (Goods Receipt)"
        open={receiptModal}
        onCancel={() => setReceiptModal(false)}
        footer={null}
        destroyOnClose
        width={650}
      >
        <Form form={formReceipt} layout="vertical" onFinish={handleCreateReceipt}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="warehouseId"
                label="Kho nhập"
                rules={[{ required: true, message: 'Vui lòng chọn kho' }]}
                initialValue={selectedWarehouseId}
              >
                <Select
                  options={warehouses.map((w) => ({
                    label: w.name,
                    value: w.warehouseId,
                  }))}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="supplierId"
                label="Nhà cung cấp"
                rules={[{ required: true, message: 'Vui lòng chọn nhà cung cấp' }]}
              >
                <Select
                  options={suppliers.map((s) => ({
                    label: s.name,
                    value: s.supplierId,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="receiptNo"
                label="Số phiếu nhập"
                rules={[{ required: true, message: 'Vui lòng nhập số phiếu' }]}
                initialValue={'PNK-' + Math.floor(1000 + Math.random() * 9000)}
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="itemId"
                label="Mặt hàng"
                rules={[{ required: true, message: 'Vui lòng chọn mặt hàng' }]}
              >
                <Select
                  options={items.map((i) => ({
                    label: `${i.code} - ${i.name} (${i.isSerialized ? 'Có Serial' : 'Theo Lô'})`,
                    value: i.itemId,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="lotNumber"
                label="Số Lô (Lot Number)"
                rules={[{ required: true, message: 'Vui lòng nhập số lô' }]}
              >
                <Input placeholder="VD: LIDO-2026-01" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="expiryDate"
                label="Hạn dùng (Expiry)"
                rules={[{ required: true, message: 'Vui lòng chọn hạn dùng' }]}
              >
                <DatePicker className="w-full" format="YYYY-MM-DD" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="quantity"
                label="Số lượng nhập"
                rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
              >
                <InputNumber min={1} className="w-full" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="serialNumbers"
            label="Danh sách Serial (nếu mặt hàng quản lý Serial Implant)"
            extra="Nhập các số serial cách nhau bằng dấu phẩy. Số lượng serial phải khớp đúng số lượng nhập."
          >
            <Input.TextArea
              rows={2}
              placeholder="VD: SN-STRAU-001, SN-STRAU-002"
            />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setReceiptModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Xác nhận Nhập kho
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 2: XUẤT KHO FEFO */}
      <Modal
        title="Xuất Dược phẩm / Vật tư dùng (Theo nguyên tắc FEFO AT-07)"
        open={dispenseModal}
        onCancel={() => setDispenseModal(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={formDispense} layout="vertical" onFinish={handleDispense}>
          <Form.Item
            name="itemId"
            label="Mặt hàng cần xuất"
            rules={[{ required: true, message: 'Vui lòng chọn mặt hàng' }]}
          >
            <Select
              options={items.map((i) => ({
                label: `${i.code} - ${i.name}`,
                value: i.itemId,
              }))}
            />
          </Form.Item>

          <Form.Item
            name="quantity"
            label="Số lượng cần xuất"
            rules={[{ required: true, message: 'Vui lòng nhập số lượng' }]}
          >
            <InputNumber min={1} className="w-full" />
          </Form.Item>

          <Form.Item
            name="specificLotId"
            label="Chỉ định Lô cụ thể (Tùy chọn)"
            extra="Nếu để trống, hệ thống sẽ tự động xuất theo Lô có hạn dùng gần nhất (FEFO). Nếu chọn lô quá hạn, giao dịch sẽ bị từ chối."
          >
            <Select
              allowClear
              placeholder="Mặc định tự động chọn theo FEFO"
              options={lots.map((l) => ({
                label: `${l.lotNumber} - HSD: ${l.expiryDate} (${l.status})`,
                value: l.stockLotId,
              }))}
            />
          </Form.Item>

          <Form.Item name="note" label="Ghi chú xuất kho">
            <Input placeholder="VD: Xuất cho phòng tiểu phẫu số 2" />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setDispenseModal(false)}>Hủy</Button>
            <Button type="primary" danger htmlType="submit" loading={loading}>
              Xác nhận Xuất dùng
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 3: BAN HÀNH LỆNH THU HỒI LÔ (AT-08) */}
      <Modal
        title={
          <Space>
            <WarningOutlined className="text-red-500" />
            <span>Ban hành lệnh Thu hồi Lô khẩn cấp (AT-08)</span>
          </Space>
        }
        open={recallModal}
        onCancel={() => setRecallModal(false)}
        footer={null}
        destroyOnClose
      >
        <Alert
          type="error"
          showIcon
          message="Cảnh báo khẩn cấp"
          description={`Lệnh thu hồi áp dụng cho Lô: ${selectedLotForRecall?.lotNumber}. Ngay khi ban hành, toàn bộ số lượng tồn kho còn lại của lô này sẽ bị KHÓA NGAY LẬP TỨC và chặn mọi hành vi xuất dùng.`}
          className="mb-4"
        />

        <Form form={formRecall} layout="vertical" onFinish={handleRecallLot}>
          <Form.Item
            name="reason"
            label="Lý do thu hồi"
            rules={[{ required: true, message: 'Vui lòng nhập lý do thu hồi' }]}
            initialValue="Phát hiện tạp chất hoặc theo công văn khẩn cấp của Cục Quản lý Dược"
          >
            <Input.TextArea rows={3} />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setRecallModal(false)}>Hủy</Button>
            <Button type="primary" danger htmlType="submit" loading={loading}>
              Ban hành Lệnh Thu Hồi
            </Button>
          </div>
        </Form>
      </Modal>

      {/* MODAL 4: TRUY VẾT BỆNH NHÂN ĐÃ DÙNG LÔ THU HỒI (AT-08) */}
      <Modal
        title={
          <Space>
            <SearchOutlined className="text-blue-500" />
            <span>
              Báo cáo Truy vết Bệnh nhân đã sử dụng Lô ({traceData?.lot?.lotNumber}) (AT-08)
            </span>
          </Space>
        }
        open={traceModal}
        onCancel={() => setTraceModal(false)}
        footer={[
          <Button key="close" onClick={() => setTraceModal(false)}>
            Đóng
          </Button>,
        ]}
        width={750}
      >
        {traceData && (
          <div className="space-y-4">
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Mặt hàng">
                {traceData.lot?.item?.name}
              </Descriptions.Item>
              <Descriptions.Item label="Số Lô">
                <Tag color="red">{traceData.lot?.lotNumber}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Hạn dùng">
                {traceData.lot?.expiryDate}
              </Descriptions.Item>
              <Descriptions.Item label="Trạng thái Lô">
                <Tag color="error">{traceData.lot?.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Tổng số lượng đã xuất">
                <Text strong>{traceData.totalDispensed}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Số bệnh nhân cần theo dõi">
                <Text strong className="text-red-500">
                  {traceData.tracedPatients?.length || 0} bệnh nhân
                </Text>
              </Descriptions.Item>
            </Descriptions>

            <Divider className="!my-2">Danh sách Bệnh nhân cần liên hệ theo dõi</Divider>

            <Table
              size="small"
              rowKey="movementId"
              dataSource={traceData.tracedPatients}
              pagination={false}
              columns={[
                {
                  title: 'Họ tên Bệnh nhân',
                  dataIndex: ['patient', 'fullName'],
                  key: 'patientName',
                  render: (text) => <Text strong>{text}</Text>,
                },
                {
                  title: 'Số điện thoại',
                  dataIndex: ['patient', 'phone'],
                  key: 'patientPhone',
                  render: (phone) => <Text copyable>{phone}</Text>,
                },
                {
                  title: 'Mã lượt khám',
                  dataIndex: ['visit', 'visitCode'],
                  key: 'visitCode',
                },
                {
                  title: 'Bác sĩ phụ trách',
                  dataIndex: ['doctor', 'displayName'],
                  key: 'doctorName',
                },
                {
                  title: 'Số lượng dùng',
                  dataIndex: 'quantity',
                  key: 'quantity',
                  render: (qty) => <Tag color="orange">{qty}</Tag>,
                },
                {
                  title: 'Thời điểm dùng',
                  dataIndex: 'occurredAt',
                  key: 'occurredAt',
                  render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
                },
              ]}
            />
          </div>
        )}
      </Modal>

      {/* MODAL 5: GHI NHẬN CẤY GHÉP SERIAL IMPLANT (AT-12) */}
      <Modal
        title="Ghi nhận Cấy ghép Trụ Implant (AT-12)"
        open={implantModal}
        onCancel={() => setImplantModal(false)}
        footer={null}
        destroyOnClose
      >
        <Alert
          type="info"
          showIcon
          message="Quy tắc Chống tái sử dụng Thiết bị Y tế Cấy ghép (AT-12)"
          description="Hệ thống sẽ kiểm tra mã Serial trên toàn cơ sở dữ liệu. Nếu Serial đã từng được đánh dấu cấy ghép trước đó, lệnh sẽ bị từ chối với lỗi 409 Conflict."
          className="mb-4"
        />

        <Form form={formImplant} layout="vertical" onFinish={handleImplant}>
          <Form.Item
            name="serialNumber"
            label="Mã Serial Trụ Implant"
            rules={[{ required: true, message: 'Vui lòng nhập hoặc quét mã Serial' }]}
          >
            <Input
              placeholder="VD: SN-STRAU-001 hoặc quét barcode"
              prefix={<BarcodeOutlined />}
            />
          </Form.Item>

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setImplantModal(false)}>Hủy</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              Xác nhận Cấy ghép
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
export default InventoryPage;
