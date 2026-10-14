import React, { useState, useEffect } from 'react';
import { reconciliationApi, operationsApi } from '../../services/api-client';
import { useAuth } from '../../context/auth-context.jsx';

export default function ReconciliationPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('daily-report'); // 'daily-report' | 'items' | 'maintenance' | 'refund-at11' | 'integrity-at19'

  // Data states
  const [report, setReport] = useState(null);
  const [items, setItems] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [assets, setAssets] = useState([]);
  const [integrityData, setIntegrityData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filter & Form states
  const [filterDate, setFilterDate] = useState(new Date().toISOString().slice(0, 10));
  const [itemStatusFilter, setItemStatusFilter] = useState('');
  
  // Modals
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [resolutionText, setResolutionText] = useState('');
  const [resolveStatus, setResolveStatus] = useState('RESOLVED');

  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    assetId: '',
    maintenanceType: 'PERIODIC_INSPECTION',
    performedAt: new Date().toISOString().slice(0, 16),
    result: 'PASS',
    nextDueAt: '',
    details: '',
    performedBy: user?.displayName || user?.username || 'Kỹ thuật viên',
  });

  const [refundForm, setRefundForm] = useState({
    paymentTransactionId: '',
    refundAmount: '',
    reason: '',
    currentOpenPeriodId: '',
  });

  // Load initial data
  useEffect(() => {
    loadDailyReport();
    loadItems();
    loadAssets();
  }, [filterDate]);

  const loadDailyReport = async () => {
    try {
      setLoading(true);
      const res = await reconciliationApi.getDailyReport({ date: filterDate });
      setReport(res);
    } catch (err) {
      console.error(err);
      setError('Không thể tải báo cáo đối soát tổng hợp');
    } finally {
      setLoading(false);
    }
  };

  const loadItems = async () => {
    try {
      const res = await reconciliationApi.getReconciliationItems({ status: itemStatusFilter || undefined });
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
      setError('');
      setSuccess('');
      const res = await reconciliationApi.runDailyReconciliation({ date: filterDate });
      setSuccess(`Chạy đối soát hoàn tất! Đã quét và phát hiện ${res.newAnomaliesCount} sai lệch bất thường cần xử lý.`);
      loadDailyReport();
      loadItems();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Lỗi khi chạy quy trình đối soát');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveItem = async (e) => {
    e.preventDefault();
    if (!selectedItem) return;
    try {
      setLoading(true);
      await reconciliationApi.resolveReconciliationItem(selectedItem.reconciliationItemId, {
        status: resolveStatus,
        resolution: resolutionText,
      });
      setSuccess('Đã cập nhật phân xử giải quyết sai lệch thành công');
      setShowResolveModal(false);
      setSelectedItem(null);
      setResolutionText('');
      loadItems();
      loadDailyReport();
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Lỗi khi phân xử mục đối soát');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMaintenance = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await reconciliationApi.createMaintenanceLog(maintenanceForm);
      setSuccess('Đã ghi nhận nhật ký bảo trì thiết bị thành công!');
      setShowMaintenanceModal(false);
      loadAssets();
      if (maintenanceForm.assetId) {
        loadMaintenanceLogs(maintenanceForm.assetId);
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Lỗi khi lưu nhật ký bảo trì');
    } finally {
      setLoading(false);
    }
  };

  const handlePostClosingRefund = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await reconciliationApi.processPostClosingRefund(refundForm);
      setSuccess(`[AT-11] Hoàn tiền sau khóa sổ thành công! Mã hoàn tiền: ${res.refundId}, ghi nhận vào kỳ mở: ${res.appliedAccountingPeriod}`);
      setRefundForm({ paymentTransactionId: '', refundAmount: '', reason: '', currentOpenPeriodId: '' });
      loadDailyReport();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.response?.data?.message || err.message || 'Lỗi khi hoàn tiền sau khóa sổ');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyIntegrity = async () => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      const res = await reconciliationApi.verifySystemIntegrity();
      setIntegrityData(res);
      if (res.status === 'INTEGRITY_VERIFIED') {
        setSuccess('[AT-19] Kiểm tra toàn vẹn CSDL & EMR hoàn tất: TẤT CẢ CHỮ KÝ VÀ KHÓA NGOẠI ĐỀU NGUYÊN VẸN 100%!');
      } else {
        setError('[CẢNH BÁO AT-19] Phát hiện bất thường tính toàn vẹn cơ sở dữ liệu!');
      }
    } catch (err) {
      setError(err?.response?.data?.message || err.message || 'Lỗi khi kiểm tra toàn vẹn');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">⚖️</span>
            Đối soát Cuối ngày & Toàn vẹn Hệ thống
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Quy trình đối soát 5 nguồn bất thường tự động, Tiêu chuẩn AT-11 (Hoàn tiền sau khóa sổ), AT-19 (Toàn vẹn EMR) & AT-24 (Báo cáo tổng hợp).
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleRunReconciliation}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <span>🔄</span> Chạy Đối Soát Tự Động
          </button>
          <button
            onClick={handleVerifyIntegrity}
            disabled={loading}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 transition flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <span>🛡️</span> Kiểm Tra Toàn Vẹn AT-19
          </button>
        </div>
      </div>

      {/* Thông báo Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-800 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-800 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>✅</span>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-emerald-500 hover:text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="flex border-b border-slate-200 space-x-1 overflow-x-auto">
        <button
          onClick={() => setActiveTab('daily-report')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'daily-report'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <span>📊</span> Báo Cáo Cuối Ngày (AT-24)
        </button>
        <button
          onClick={() => { setActiveTab('items'); loadItems(); }}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'items'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <span>🔍</span> Sai Lệch Đối Soát
          {items.filter(i => i.status === 'OPEN').length > 0 && (
            <span className="px-2 py-0.5 text-xs bg-rose-500 text-white rounded-full">
              {items.filter(i => i.status === 'OPEN').length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab('maintenance'); loadAssets(); }}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'maintenance'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <span>🛠️</span> Bảo Trì Thiết Bị Y Tế
        </button>
        <button
          onClick={() => setActiveTab('refund-at11')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'refund-at11'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <span>💰</span> Hoàn Tiền Sau Khóa Sổ (AT-11)
        </button>
        <button
          onClick={() => setActiveTab('integrity-at19')}
          className={`py-3 px-5 text-sm font-semibold border-b-2 transition whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'integrity-at19'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <span>🛡️</span> Toàn Vẹn EMR & CSDL (AT-19)
        </button>
      </div>

      {/* TAB 1: BÁO CÁO ĐỐI SOÁT CUỐI NGÀY (AT-24) */}
      {activeTab === 'daily-report' && report && (
        <div className="space-y-6">
          {/* KPI Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiền mặt thực thu</span>
              <div className="text-2xl font-bold text-slate-800 mt-2">
                {Number(report.cashAndBilling?.totalActualCash || 0).toLocaleString('vi-VN')} đ
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Kỳ vọng: {Number(report.cashAndBilling?.totalExpectedCash || 0).toLocaleString('vi-VN')} đ
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chênh lệch tiền mặt</span>
              <div className={`text-2xl font-bold mt-2 ${
                Number(report.cashAndBilling?.totalDiscrepancy || 0) === 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {Number(report.cashAndBilling?.totalDiscrepancy || 0).toLocaleString('vi-VN')} đ
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {Number(report.cashAndBilling?.totalDiscrepancy || 0) === 0 ? 'Khớp hoàn toàn' : 'Cần lập biên bản sai lệch'}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Doanh thu hóa đơn</span>
              <div className="text-2xl font-bold text-slate-800 mt-2">
                {Number(report.cashAndBilling?.totalBilled || 0).toLocaleString('vi-VN')} đ
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Số lượng: {report.cashAndBilling?.invoiceCount || 0} hóa đơn phát hành
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bất thường cần xử lý</span>
              <div className={`text-2xl font-bold mt-2 ${
                report.reconciliationSummary?.pendingAnomalies > 0 ? 'text-rose-600' : 'text-emerald-600'
              }`}>
                {report.reconciliationSummary?.pendingAnomalies || 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Nghiêm trọng (Critical): {report.reconciliationSummary?.criticalAnomalies || 0}
              </div>
            </div>
          </div>

          {/* Chi tiết Vận hành & Tiệt trùng / Labo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>🧪</span> Tiệt Trùng & Kiểm Soát Nhiễm Khuẩn
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-xl font-bold text-slate-800">{report.operationsAndSterilization?.totalCycles || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Tổng chu kỳ</div>
                </div>
                <div className="p-4 bg-emerald-50 rounded-lg">
                  <div className="text-xl font-bold text-emerald-600">{report.operationsAndSterilization?.passedCycles || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Đạt chuẩn (PASS)</div>
                </div>
                <div className="p-4 bg-rose-50 rounded-lg">
                  <div className="text-xl font-bold text-rose-600">{report.operationsAndSterilization?.failedCycles || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Không đạt (FAIL)</div>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>🦷</span> Gia Công Răng Sứ & Khí Cụ Labo
              </h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <div className="text-xl font-bold text-slate-800">{report.operationsAndSterilization?.totalLabOrders || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Tổng đơn trong ngày</div>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="text-xl font-bold text-blue-600">{report.operationsAndSterilization?.deliveredOrders || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">Đã nhận hàng</div>
                </div>
                <div className="p-4 bg-amber-50 rounded-lg">
                  <div className="text-xl font-bold text-amber-600">{report.operationsAndSterilization?.reworkOrders || 0}</div>
                  <div className="text-xs text-slate-500 mt-1">QC không đạt (Rework)</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DANH SÁCH SAI LỆCH ĐỐI SOÁT (RECONCILIATION ITEMS) */}
      {activeTab === 'items' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-800">Các Bất Thường Hệ Thống Tự Động Quét Được</h3>
            <select
              value={itemStatusFilter}
              onChange={(e) => setItemStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm bg-white focus:outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="OPEN">Chờ xử lý (OPEN)</option>
              <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
              <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
              <option value="CLOSED">Đã đóng (CLOSED)</option>
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="p-3">Loại bất thường</th>
                  <th className="p-3">Mức độ</th>
                  <th className="p-3">Mô tả chi tiết</th>
                  <th className="p-3">Người chịu trách nhiệm</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-8 text-center text-slate-400">
                      Không có sai lệch đối soát nào trong hệ thống!
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr key={item.reconciliationItemId} className="hover:bg-slate-50">
                      <td className="p-3 font-semibold text-slate-800">{item.itemType}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                          item.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' :
                          item.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                          item.severity === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {item.severity}
                        </span>
                      </td>
                      <td className="p-3 text-slate-700 max-w-md">{item.description}</td>
                      <td className="p-3 text-slate-600">{item.owner?.displayName || item.owner?.username || 'Chưa gán'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                          item.status === 'RESOLVED' || item.status === 'CLOSED' ? 'bg-emerald-100 text-emerald-700' :
                          item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        {item.status !== 'RESOLVED' && item.status !== 'CLOSED' && (
                          <button
                            onClick={() => { setSelectedItem(item); setShowResolveModal(true); }}
                            className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
                          >
                            Phân xử
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: BẢO TRÌ & HIỆU CHUẨN THIẾT BỊ Y TẾ */}
      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-800">Danh Sách Thiết Bị Y Tế & Trạng Thái Vận Hành</h3>
            <button
              onClick={() => setShowMaintenanceModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
            >
              + Ghi Nhận Bảo Trì / Kiểm Định
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.assetId} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-800">{asset.name}</h4>
                    <span className="text-xs text-slate-400">{asset.assetCode} - {asset.assetType}</span>
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                    asset.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' :
                    asset.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                  }`}>
                    {asset.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500 space-y-1">
                  <div>Kiểm định hiệu chuẩn: {asset.calibrationExpiresAt ? new Date(asset.calibrationExpiresAt).toLocaleDateString('vi-VN') : 'Chưa có'}</div>
                  <div>Hạn bảo trì kế tiếp: {asset.nextMaintenanceDueAt ? new Date(asset.nextMaintenanceDueAt).toLocaleDateString('vi-VN') : 'Chưa có'}</div>
                </div>
                <button
                  onClick={() => {
                    setMaintenanceForm({ ...maintenanceForm, assetId: asset.assetId });
                    loadMaintenanceLogs(asset.assetId);
                  }}
                  className="w-full mt-2 py-1.5 border border-slate-200 rounded text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Xem Nhật Ký Bảo Trì
                </button>
              </div>
            ))}
          </div>

          {maintenanceLogs.length > 0 && (
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
              <h4 className="font-bold text-slate-800">Lịch Sử Kiểm Định & Bảo Trì Thiết Bị Đã Chọn</h4>
              <div className="divide-y divide-slate-100">
                {maintenanceLogs.map((log) => (
                  <div key={log.maintenanceLogId} className="py-2.5 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-semibold text-slate-700">{log.maintenanceType}</span> - <span className="text-slate-500">{new Date(log.performedAt).toLocaleString('vi-VN')}</span>
                      <div className="text-xs text-slate-500">{log.details} - Thực hiện: {log.performedBy}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                      log.result === 'PASS' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                    }`}>
                      {log.result}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: HOÀN TIỀN SAU KHÓA SỔ (AT-11) */}
      {activeTab === 'refund-at11' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>💰</span> Quy Trình Hoàn Tiền Sau Khóa Sổ Kế Toán (AT-11)
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Nguyên tắc kế toán chuẩn: Khi kỳ kế toán trước đã đóng (CLOSED), không được sửa đè chứng từ cũ.
              Giao dịch hoàn tiền bắt buộc ghi nhận điều chỉnh vào kỳ kế toán đang MỞ (OPEN) hiện tại, lưu vết liên kết chứng từ thanh toán gốc.
            </p>
          </div>

          <form onSubmit={handlePostClosingRefund} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Mã Giao Dịch Thanh Toán Gốc (PaymentTransactionId)
              </label>
              <input
                type="text"
                required
                placeholder="UUID giao dịch đã thu trong kỳ cũ..."
                value={refundForm.paymentTransactionId}
                onChange={(e) => setRefundForm({ ...refundForm, paymentTransactionId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Số Tiền Hoàn (VNĐ)
              </label>
              <input
                type="number"
                step="0.01"
                required
                placeholder="Ví dụ: 300000"
                value={refundForm.refundAmount}
                onChange={(e) => setRefundForm({ ...refundForm, refundAmount: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Mã Kỳ Kế Toán Đang Mở (Current Open AccountingPeriodId)
              </label>
              <input
                type="text"
                required
                placeholder="UUID kỳ kế toán trạng thái OPEN..."
                value={refundForm.currentOpenPeriodId}
                onChange={(e) => setRefundForm({ ...refundForm, currentOpenPeriodId: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Lý Do Hoàn Tiền Điều Chỉnh
              </label>
              <textarea
                rows="3"
                required
                placeholder="Giải thích lý do hoàn sau khóa sổ..."
                value={refundForm.reason}
                onChange={(e) => setRefundForm({ ...refundForm, reason: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              Phê Duyệt & Ghi Nhận Hoàn Tiền Vào Kỳ Mở
            </button>
          </form>
        </div>
      )}

      {/* TAB 5: KIỂM TRA TOÀN VẸN EMR & CSDL (AT-19) */}
      {activeTab === 'integrity-at19' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-3xl mx-auto space-y-5">
          <div className="border-b border-slate-100 pb-4 flex justify-between items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <span>🛡️</span> Kiểm Tra Toàn Vẹn Cơ Sở Dữ Liệu & Audit (AT-19)
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Xác thực mã băm chữ ký số EMR SHA-256 và tính toàn vẹn tham chiếu khóa ngoại giữa các bảng nghiệp vụ.
              </p>
            </div>
            <button
              onClick={handleVerifyIntegrity}
              disabled={loading}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
            >
              Quét Ngay
            </button>
          </div>

          {integrityData && (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${
                integrityData.status === 'INTEGRITY_VERIFIED'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}>
                <div className="font-bold text-base flex items-center gap-2">
                  <span>{integrityData.status === 'INTEGRITY_VERIFIED' ? '✅' : '❌'}</span>
                  <span>Trạng thái: {integrityData.status}</span>
                </div>
                <div className="text-xs mt-1">Thời điểm kiểm tra: {new Date(integrityData.timestamp).toLocaleString('vi-VN')}</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="font-bold text-slate-800">Chữ Ký Số EMR (SHA-256)</div>
                  <div className="text-xs text-slate-600">Số lượng đã kiểm tra: {integrityData.emrSignatures.checkedCount}</div>
                  <div className="text-xs text-slate-600">Số bản ghi sai lệch: {integrityData.emrSignatures.corruptedCount}</div>
                  <div className={`text-xs font-bold ${integrityData.emrSignatures.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Kết luận: {integrityData.emrSignatures.valid ? 'ĐẠT CHUẨN TOÀN VẸN' : 'CÓ NGUY CƠ BỊ SỬA ĐỔI'}
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <div className="font-bold text-slate-800">Ràng Buộc Khóa Ngoại (Foreign Keys)</div>
                  <div className="text-xs text-slate-600">Lượt khám mồ côi (Orphan Visits): {integrityData.foreignKeyIntegrity.orphanVisits}</div>
                  <div className={`text-xs font-bold ${integrityData.foreignKeyIntegrity.valid ? 'text-emerald-600' : 'text-rose-600'}`}>
                    Kết luận: {integrityData.foreignKeyIntegrity.valid ? 'TOÀN VẸN KHÓA NGOẠI 100%' : 'CÓ DỮ LIỆU MỒ CÔI'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Phân xử sai lệch đối soát */}
      {showResolveModal && selectedItem && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-800">Phân Xử Sai Lệch Đối Soát</h3>
            <p className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              {selectedItem.description}
            </p>

            <form onSubmit={handleResolveItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Trạng Thái Xử Lý</label>
                <select
                  value={resolveStatus}
                  onChange={(e) => setResolveStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="IN_PROGRESS">Đang xử lý (IN_PROGRESS)</option>
                  <option value="RESOLVED">Đã giải quyết (RESOLVED)</option>
                  <option value="CLOSED">Đóng vấn đề (CLOSED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Biên Bản & Hướng Giải Quyết</label>
                <textarea
                  rows="3"
                  required
                  placeholder="Ghi rõ biện pháp đã thực hiện..."
                  value={resolutionText}
                  onChange={(e) => setResolutionText(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  Xác Nhận Giải Quyết
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Ghi nhận bảo trì thiết bị */}
      {showMaintenanceModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-800">Ghi Nhận Bảo Trì / Kiểm Định Thiết Bị</h3>

            <form onSubmit={handleCreateMaintenance} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Thiết Bị Y Tế</label>
                <select
                  required
                  value={maintenanceForm.assetId}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, assetId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {assets.map((a) => (
                    <option key={a.assetId} value={a.assetId}>{a.name} ({a.assetCode})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Loại Nghiệp Vụ</label>
                <select
                  value={maintenanceForm.maintenanceType}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, maintenanceType: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="PERIODIC_INSPECTION">Bảo trì định kỳ</option>
                  <option value="CALIBRATION">Hiệu chuẩn / Kiểm định</option>
                  <option value="REPAIR">Sửa chữa đột xuất</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kết Quả Đánh Giá</label>
                <select
                  value={maintenanceForm.result}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, result: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="PASS">Đạt chuẩn (PASS - Sẵn sàng vận hành)</option>
                  <option value="FAIL">Không đạt (FAIL - Tự động chuyển Bảo trì)</option>
                  <option value="LIMITED">Hạn chế sử dụng (LIMITED)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Hạn Kiểm Định Kế Tiếp</label>
                <input
                  type="date"
                  value={maintenanceForm.nextDueAt}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, nextDueAt: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Người / Đơn Vị Thực Hiện</label>
                <input
                  type="text"
                  required
                  value={maintenanceForm.performedBy}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, performedBy: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chi Tiết Kỹ Thuật</label>
                <textarea
                  rows="2"
                  value={maintenanceForm.details}
                  onChange={(e) => setMaintenanceForm({ ...maintenanceForm, details: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                ></textarea>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowMaintenanceModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
                >
                  Lưu Nhật Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
