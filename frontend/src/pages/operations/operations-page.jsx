import React, { useState, useEffect } from 'react';
import { operationsApi } from '../../services/api-client';
import { useAuth } from '../../context/auth-context.jsx';

export default function OperationsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('sterilization'); // 'sterilization' | 'assets' | 'lab' | 'incidents'

  // Data states
  const [cycles, setCycles] = useState([]);
  const [packs, setPacks] = useState([]);
  const [assets, setAssets] = useState([]);
  const [labOrders, setLabOrders] = useState([]);
  const [warranties, setWarranties] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals
  const [showCycleModal, setShowCycleModal] = useState(false);
  const [showCompleteCycleModal, setShowCompleteCycleModal] = useState(false);
  const [showPackModal, setShowPackModal] = useState(false);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [showUsePackModal, setShowUsePackModal] = useState(false);
  const [showAssetModal, setShowAssetModal] = useState(false);
  const [showLabModal, setShowLabModal] = useState(false);
  const [showReworkModal, setShowReworkModal] = useState(false);
  const [showResolveIncidentModal, setShowResolveIncidentModal] = useState(false);

  // Selection states
  const [selectedCycle, setSelectedCycle] = useState(null);
  const [selectedPack, setSelectedPack] = useState(null);
  const [selectedLabOrder, setSelectedLabOrder] = useState(null);
  const [selectedIncident, setSelectedIncident] = useState(null);

  // Forms
  const [cycleForm, setCycleForm] = useState({ assetId: '', cycleNo: '' });
  const [completeCycleForm, setCompleteCycleForm] = useState({ indicatorResult: 'PASS' });
  const [packForm, setPackForm] = useState({ sterilizationCycleId: '', packCode: '', packType: 'GENERAL_SURGERY_KIT' });
  const [releaseForm, setReleaseForm] = useState({ sterileFrom: '', expiresAt: '' });
  const [usePackForm, setUsePackForm] = useState({ visitId: '', patientId: '', isEmergency: false, emergencyReason: '' });
  const [assetForm, setAssetForm] = useState({
    branchId: user?.branchId || '',
    assetCode: '',
    name: '',
    assetType: 'AUTOCLAVE',
    status: 'ACTIVE',
    calibrationExpiresAt: '',
  });
  const [labForm, setLabForm] = useState({
    visitId: '',
    specimen: '',
    instructions: '',
    dueAt: '',
    cost: '',
  });
  const [reworkForm, setReworkForm] = useState({
    reason: '',
    costBearer: 'LAB',
    cost: '',
  });
  const [resolveForm, setResolveForm] = useState({ resolution: '', status: 'RESOLVED' });

  const isDoctor = user?.role === 'DOCTOR' || user?.role === 'ADMIN';
  const isApprover = user?.role === 'ADMIN' || user?.isApprover;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'sterilization') {
        const [cRes, pRes, aRes] = await Promise.all([
          operationsApi.getSterilizationCycles(),
          operationsApi.getPacks(),
          operationsApi.getAssets(),
        ]);
        setCycles(cRes.data || []);
        setPacks(pRes.data || []);
        setAssets(aRes.data || []);
      } else if (activeTab === 'assets') {
        const aRes = await operationsApi.getAssets();
        setAssets(aRes.data || []);
      } else if (activeTab === 'lab') {
        const lRes = await operationsApi.getLabOrders();
        setLabOrders(lRes.data || []);
      } else if (activeTab === 'incidents') {
        const [wRes, iRes] = await Promise.all([
          operationsApi.getWarranties(),
          operationsApi.getIncidents(),
        ]);
        setWarranties(wRes.data || []);
        setIncidents(iRes.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể tải dữ liệu.');
    } finally {
      setLoading(false);
    }
  };

  // HANDLERS
  const handleStartCycle = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await operationsApi.createSterilizationCycle(cycleForm);
      setSuccess('Khởi chạy chu trình tiệt trùng thành công (Thiết bị đủ điều kiện an toàn).');
      setShowCycleModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể chạy chu trình tiệt trùng.');
    }
  };

  const handleCompleteCycle = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await operationsApi.completeSterilizationCycle(selectedCycle.sterilizationCycleId, completeCycleForm);
      setSuccess(
        completeCycleForm.indicatorResult === 'PASS'
          ? 'Đánh giá chu trình đạt chuẩn (PASS). Các gói dụng cụ sẵn sàng giải phóng.'
          : 'Chu trình thất bại (FAIL). Đã tự động cách ly toàn bộ gói dụng cụ (AT-22)!'
      );
      setShowCompleteCycleModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể hoàn tất chu trình.');
    }
  };

  const handleCreatePack = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await operationsApi.createPack(packForm);
      setSuccess('Đóng gói dụng cụ tiệt trùng thành công.');
      setShowPackModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể đóng gói.');
    }
  };

  const handleReleasePack = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await operationsApi.releasePack(selectedPack.instrumentPackId, releaseForm);
      setSuccess('Giải phóng kiểm định gói dụng cụ thành công.');
      setShowReleaseModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể giải phóng gói.');
    }
  };

  const handleUsePack = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await operationsApi.usePack({
        instrumentPackId: selectedPack.instrumentPackId,
        visitId: usePackForm.visitId,
        patientId: usePackForm.patientId,
        isEmergency: usePackForm.isEmergency,
        emergencyReason: usePackForm.emergencyReason,
      });
      setSuccess(res.message || 'Xác nhận sử dụng gói dụng cụ thành công.');
      setShowUsePackModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể sử dụng gói dụng cụ.');
    }
  };

  const handleCreateAsset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await operationsApi.createAsset(assetForm);
      setSuccess('Đăng ký thiết bị y tế thành công.');
      setShowAssetModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể đăng ký thiết bị.');
    }
  };

  const handleCreateLab = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await operationsApi.createLabOrder({
        ...labForm,
        cost: labForm.cost ? Number(labForm.cost) : 0,
      });
      setSuccess('Tạo chỉ định gia công Labo thành công.');
      setShowLabModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể tạo đơn Labo.');
    }
  };

  const handleRequestRework = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await operationsApi.requestLabRework(selectedLabOrder.labOrderId, {
        ...reworkForm,
        cost: reworkForm.cost ? Number(reworkForm.cost) : 0,
      });
      setSuccess('Yêu cầu làm lại Labo thành công (không sửa đè đơn hàng gốc).');
      setShowReworkModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể yêu cầu làm lại.');
    }
  };

  const handleApproveRework = async (reworkId) => {
    setError('');
    setSuccess('');
    try {
      await operationsApi.approveLabRework(reworkId, { status: 'APPROVED' });
      setSuccess('Đã phê duyệt làm lại Labo và xác nhận bên chịu chi phí.');
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể duyệt làm lại.');
    }
  };

  const handleResolveIncident = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await operationsApi.resolveIncident(selectedIncident.incidentId, resolveForm);
      setSuccess('Đã phê duyệt kết luận xử lý sự cố.');
      setShowResolveIncidentModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể xử lý sự cố.');
    }
  };

  const formatMoney = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>🔬</span> Quản Lý Tiệt Trùng, Labo & Vận Hành (Module 10)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Kiểm soát tiệt trùng chống nhiễm khuẩn (AT-22), quản lý thiết bị y tế, gia công Labo răng sứ và bảo hành.
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'sterilization' && (
            <>
              <button
                onClick={() => {
                  setCycleForm({ assetId: assets[0]?.assetId || '', cycleNo: '' });
                  setShowCycleModal(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition text-sm flex items-center gap-1.5"
              >
                <span>+</span> Chạy Chu Trình Tiệt Trùng
              </button>
              <button
                onClick={() => {
                  setPackForm({ sterilizationCycleId: cycles[0]?.sterilizationCycleId || '', packCode: '', packType: 'GENERAL_SURGERY_KIT' });
                  setShowPackModal(true);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg shadow transition text-sm flex items-center gap-1.5"
              >
                <span>+</span> Đóng Gói Dụng Cụ
              </button>
            </>
          )}
          {activeTab === 'assets' && (
            <button
              onClick={() => setShowAssetModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition text-sm flex items-center gap-1.5"
            >
              <span>+</span> Đăng Ký Thiết Bị Mới
            </button>
          )}
          {activeTab === 'lab' && isDoctor && (
            <button
              onClick={() => setShowLabModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition text-sm flex items-center gap-1.5"
            >
              <span>+</span> Lập Chỉ Định Labo Mới
            </button>
          )}
        </div>
      </div>

      {/* ALERTS */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-r-lg shadow-sm flex items-start gap-2">
          <span className="text-lg">⚠️</span>
          <div className="flex-1 font-medium">{error}</div>
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 text-emerald-700 rounded-r-lg shadow-sm flex items-start gap-2">
          <span className="text-lg">✅</span>
          <div className="flex-1 font-medium">{success}</div>
        </div>
      )}

      {/* TABS */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('sterilization')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'sterilization'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🧼 Tiệt Trùng & Gói Dụng Cụ (AT-22)
        </button>
        <button
          onClick={() => setActiveTab('assets')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'assets'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          ⚙️ Thiết Bị & Kiểm Chuẩn
        </button>
        <button
          onClick={() => setActiveTab('lab')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'lab'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🦷 Gia Công Labo & Làm Lại
        </button>
        <button
          onClick={() => setActiveTab('incidents')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'incidents'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🚨 Sự Cố Y Khoa ({incidents.length}) & Bảo Hành
        </button>
      </div>

      {/* TAB 1: STERILIZATION */}
      {activeTab === 'sterilization' && (
        <div className="space-y-6">
          {/* CYCLES */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="font-semibold text-slate-700">Chu Trình Nồi Hấp Tiệt Trùng (Sterilization Cycles)</h2>
              <span className="text-xs text-slate-500">Tổng cộng: {cycles.length} chu trình</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                    <th className="py-3 px-4">Mã Chu Trình</th>
                    <th className="py-3 px-4">Thiết Bị Nồi Hấp</th>
                    <th className="py-3 px-4">Thời Gian Bắt Đầu</th>
                    <th className="py-3 px-4">Chỉ Thị Vi Sinh</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {cycles.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">
                        Chưa có chu trình tiệt trùng nào được ghi nhận.
                      </td>
                    </tr>
                  ) : (
                    cycles.map((c) => (
                      <tr key={c.sterilizationCycleId} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{c.cycleNo}</td>
                        <td className="py-3 px-4 font-medium text-slate-800">{c.asset?.name || '---'}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">{new Date(c.startedAt).toLocaleString('vi-VN')}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              c.indicatorResult === 'PASS'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.indicatorResult === 'FAIL'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {c.indicatorResult || 'Chờ kiểm định'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              c.status === 'PASSED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : c.status === 'FAILED'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {c.status === 'STARTED' && (
                            <button
                              onClick={() => {
                                setSelectedCycle(c);
                                setShowCompleteCycleModal(true);
                              }}
                              className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium rounded border border-indigo-200 transition"
                            >
                              📊 Đánh Giá Chỉ Thị (AT-22)
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

          {/* PACKS */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="font-semibold text-slate-700">Gói Dụng Cụ Tiệt Trùng & Quản Lý Ca Khám (AT-22)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Kiểm soát hạn tiệt trùng. Chặn gói lỗi/quá hạn, tự động ghi nhận sự cố y khoa nếu cố tình sử dụng.
                </p>
              </div>
              <span className="text-xs text-slate-500">Tổng cộng: {packs.length} gói</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                    <th className="py-3 px-4">Mã Gói Dụng Cụ</th>
                    <th className="py-3 px-4">Loại Bộ Dụng Cụ</th>
                    <th className="py-3 px-4">Hiệu Lực Tiệt Trùng</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {packs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-400">
                        Chưa có gói dụng cụ nào.
                      </td>
                    </tr>
                  ) : (
                    packs.map((p) => {
                      const isExpired = p.expiresAt && new Date(p.expiresAt) < new Date();
                      return (
                        <tr key={p.instrumentPackId} className="hover:bg-slate-50 transition">
                          <td className="py-3 px-4 font-mono font-medium text-slate-900">{p.packCode}</td>
                          <td className="py-3 px-4 font-medium text-slate-800">{p.packType}</td>
                          <td className="py-3 px-4 text-xs">
                            {p.expiresAt ? (
                              <span className={isExpired ? 'text-red-600 font-bold' : 'text-slate-600'}>
                                Hết hạn: {new Date(p.expiresAt).toLocaleDateString('vi-VN')} {isExpired && '⚠️ (QUÁ HẠN)'}
                              </span>
                            ) : (
                              <span className="text-slate-400">Chưa giải phóng</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                                p.status === 'RELEASED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : p.status === 'USED'
                                  ? 'bg-slate-200 text-slate-700'
                                  : p.status === 'EXPIRED'
                                  ? 'bg-red-100 text-red-800'
                                  : p.status === 'QUARANTINED'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center space-x-1.5 whitespace-nowrap">
                            {p.status === 'PENDING_RELEASE' && (
                              <button
                                onClick={() => {
                                  setSelectedPack(p);
                                  setShowReleaseModal(true);
                                }}
                                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-medium rounded border border-emerald-200 transition"
                              >
                                🔓 Giải Phóng (Release)
                              </button>
                            )}
                            {p.status !== 'USED' && isDoctor && (
                              <button
                                onClick={() => {
                                  setSelectedPack(p);
                                  setShowUsePackModal(true);
                                }}
                                className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-medium rounded border border-indigo-200 transition"
                              >
                                🩺 Dùng Trong Ca Khám (AT-22)
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ASSETS */}
      {activeTab === 'assets' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-semibold text-slate-700">Danh Mục Thiết Bị Y Tế & Hạn Kiểm Chuẩn (Assets)</h2>
            <span className="text-xs text-slate-500">Tổng cộng: {assets.length} thiết bị</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                  <th className="py-3 px-4">Mã Thiết Bị</th>
                  <th className="py-3 px-4">Tên Thiết Bị</th>
                  <th className="py-3 px-4">Loại Thiết Bị</th>
                  <th className="py-3 px-4">Hạn Kiểm Chuẩn An Toàn</th>
                  <th className="py-3 px-4">Trạng Thái Vận Hành</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {assets.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">
                      Chưa có thiết bị nào được đăng ký.
                    </td>
                  </tr>
                ) : (
                  assets.map((a) => (
                    <tr key={a.assetId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{a.assetCode}</td>
                      <td className="py-3 px-4 font-semibold text-slate-800">{a.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-600">{a.assetType}</td>
                      <td className="py-3 px-4 text-xs">
                        {a.calibrationExpiresAt ? new Date(a.calibrationExpiresAt).toLocaleDateString('vi-VN') : 'Không áp dụng'}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            a.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800'
                              : a.status === 'MAINTENANCE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: LAB */}
      {activeTab === 'lab' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h2 className="font-semibold text-slate-700">Đơn Hàng Gia Công Phục Hình Labo & Yêu Cầu Làm Lại</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Quản lý chế tác răng sứ, hàm giả. Khi lỗi khớp cắn/sai màu tạo đơn làm lại (LabReworks) độc lập, không sửa đè đơn gốc.
              </p>
            </div>
            <span className="text-xs text-slate-500">Tổng cộng: {labOrders.length} đơn hàng</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                  <th className="py-3 px-4">Mã Đơn / Mẫu Dấu</th>
                  <th className="py-3 px-4">Hướng Dẫn Chế Tác</th>
                  <th className="py-3 px-4">Hạn Giao Hàng</th>
                  <th className="py-3 px-4">QC Result</th>
                  <th className="py-3 px-4">Chi Phí</th>
                  <th className="py-3 px-4">Làm Lại (Reworks)</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {labOrders.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      Chưa có đơn hàng gia công Labo nào.
                    </td>
                  </tr>
                ) : (
                  labOrders.map((lo) => (
                    <tr key={lo.labOrderId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">
                        {lo.specimen || 'Mẫu thạch cao'}
                      </td>
                      <td className="py-3 px-4 max-w-xs text-xs text-slate-700">{lo.instructions}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{new Date(lo.dueAt).toLocaleDateString('vi-VN')}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-xs font-semibold ${
                            lo.qcResult === 'PASS'
                              ? 'bg-emerald-100 text-emerald-800'
                              : lo.qcResult === 'FAIL'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {lo.qcResult || 'QC PENDING'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{formatMoney(lo.cost)}</td>
                      <td className="py-3 px-4 text-xs">
                        {lo.reworks?.length > 0 ? (
                          <span className="text-red-600 font-semibold">Đã làm lại {lo.reworks.length} lần</span>
                        ) : (
                          <span className="text-slate-400">Không có</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center space-x-1.5 whitespace-nowrap">
                        {isDoctor && (
                          <button
                            onClick={() => {
                              setSelectedLabOrder(lo);
                              setShowReworkModal(true);
                            }}
                            className="px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-medium rounded border border-amber-200 transition"
                          >
                            🔄 Làm Lại Labo
                          </button>
                        )}
                        {lo.reworks?.some((r) => r.status === 'REQUESTED') && isApprover && (
                          <button
                            onClick={() => handleApproveRework(lo.reworks.find((r) => r.status === 'REQUESTED').labReworkId)}
                            className="px-2.5 py-1 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium rounded shadow transition"
                          >
                            ✍️ Duyệt Chi Phí
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

      {/* TAB 4: INCIDENTS & WARRANTIES */}
      {activeTab === 'incidents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="font-semibold text-slate-700">Sổ Theo Dõi Sự Cố Y Khoa & Cảnh Báo An Toàn (AT-22)</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tự động ghi nhận khi phát hiện vi phạm tiệt trùng, thiết bị quá hạn kiểm chuẩn hoặc kích hoạt ngoại lệ cấp cứu.
                </p>
              </div>
              <span className="text-xs text-slate-500">Tổng cộng: {incidents.length} sự cố</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                    <th className="py-3 px-4">Loại Sự Cố</th>
                    <th className="py-3 px-4">Mức Độ</th>
                    <th className="py-3 px-4">Nội Dung Sự Cố</th>
                    <th className="py-3 px-4">Phương Án Xử Lý</th>
                    <th className="py-3 px-4">Trạng Thái</th>
                    <th className="py-3 px-4 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {incidents.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-slate-400">
                        Hệ thống an toàn tiệt trùng vận hành bình thường; Không có sự cố y khoa nào.
                      </td>
                    </tr>
                  ) : (
                    incidents.map((inc) => (
                      <tr key={inc.incidentId} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-bold text-xs text-slate-800">{inc.incidentType}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-xs font-bold ${
                              inc.severity === 'CRITICAL'
                                ? 'bg-red-200 text-red-900 border border-red-300'
                                : inc.severity === 'HIGH'
                                ? 'bg-amber-100 text-amber-900'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {inc.severity}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-sm text-xs text-slate-800">{inc.description}</td>
                        <td className="py-3 px-4 max-w-xs text-xs text-slate-600">{inc.resolution || 'Đang thẩm định'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              ['RESOLVED', 'CLOSED'].includes(inc.status)
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {inc.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          {inc.status === 'OPEN' && isApprover && (
                            <button
                              onClick={() => {
                                setSelectedIncident(inc);
                                setResolveForm({ resolution: 'Hội đồng chuyên môn đã kiểm thảo và phê duyệt phương án xử lý sự cố an toàn y tế.', status: 'RESOLVED' });
                                setShowResolveIncidentModal(true);
                              }}
                              className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium rounded shadow transition"
                            >
                              ✍️ Phê Duyệt Kết Luận
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
        </div>
      )}

      {/* MODAL: CHẠY CHU TRÌNH TIỆT TRÙNG */}
      {showCycleModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Khởi Chạy Chu Trình Tiệt Trùng Nồi Hấp</h3>
            <form onSubmit={handleStartCycle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Chọn Thiết Bị Nồi Hấp</label>
                <select
                  value={cycleForm.assetId}
                  onChange={(e) => setCycleForm({ ...cycleForm, assetId: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm"
                  required
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {assets.map((a) => (
                    <option key={a.assetId} value={a.assetId}>
                      {a.name} ({a.assetCode} - {a.status})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mã Số Chu Trình (Cycle No)</label>
                <input
                  type="text"
                  value={cycleForm.cycleNo}
                  onChange={(e) => setCycleForm({ ...cycleForm, cycleNo: e.target.value })}
                  placeholder="Để trống hệ thống sẽ tự sinh mã"
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCycleModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium shadow"
                >
                  Bắt Đầu Chu Trình
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ĐÁNH GIÁ CHỈ THỊ TIỆT TRÙNG (AT-22) */}
      {showCompleteCycleModal && selectedCycle && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>📊</span> Đánh Giá Chỉ Thị Vi Sinh / Hóa Học Chu Trình
            </h3>
            <p className="text-xs text-slate-500">
              Quy tắc AT-22: Nếu chỉ thị <b>FAIL</b>, hệ thống tự động khóa và cách ly khẩn cấp toàn bộ gói dụng cụ thuộc chu trình.
            </p>
            <form onSubmit={handleCompleteCycle} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Kết Quả Kiểm Tra Chỉ Thị</label>
                <select
                  value={completeCycleForm.indicatorResult}
                  onChange={(e) => setCompleteCycleForm({ indicatorResult: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm font-bold"
                >
                  <option value="PASS" className="text-emerald-700 font-bold">PASS - Đạt chuẩn tiệt trùng</option>
                  <option value="FAIL" className="text-red-700 font-bold">FAIL - Không đạt (Cách ly khẩn cấp)</option>
                  <option value="INCONCLUSIVE" className="text-amber-700 font-bold">INCONCLUSIVE - Không xác định</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCompleteCycleModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium shadow"
                >
                  Lưu Kết Quả
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DÙNG GÓI DỤNG CỤ TRONG CA KHÁM (AT-22) */}
      {showUsePackModal && selectedPack && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>🩺</span> Xác Nhận Dùng Gói Dụng Cụ Trong Ca Khám (AT-22)
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
              <p><b>Gói dụng cụ:</b> <span className="font-mono font-bold text-slate-800">{selectedPack.packCode}</span></p>
              <p><b>Loại bộ:</b> {selectedPack.packType}</p>
              <p><b>Hạn tiệt trùng:</b> {selectedPack.expiresAt ? new Date(selectedPack.expiresAt).toLocaleDateString('vi-VN') : 'Chưa giải phóng'}</p>
            </div>
            <form onSubmit={handleUsePack} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mã Lượt Khám (Visit ID)</label>
                <input
                  type="text"
                  value={usePackForm.visitId}
                  onChange={(e) => setUsePackForm({ ...usePackForm, visitId: e.target.value })}
                  placeholder="Nhập VisitId của ca khám"
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mã Bệnh Nhân (Patient ID)</label>
                <input
                  type="text"
                  value={usePackForm.patientId}
                  onChange={(e) => setUsePackForm({ ...usePackForm, patientId: e.target.value })}
                  placeholder="Nhập PatientId"
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm font-mono"
                  required
                />
              </div>

              {/* TOGGLE NGOẠI LỆ CẤP CỨU AT-22 */}
              <div className="pt-2 border-t border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={usePackForm.isEmergency}
                    onChange={(e) => setUsePackForm({ ...usePackForm, isEmergency: e.target.checked })}
                    className="rounded text-red-600 focus:ring-red-500 h-4 w-4"
                  />
                  <span className="text-xs font-bold text-red-700">
                    🚨 Kích Hoạt Ngoại Lệ Cấp Cứu (AT-22 Emergency Override)
                  </span>
                </label>
                {usePackForm.isEmergency && (
                  <div className="mt-2 space-y-1">
                    <label className="block text-xs font-semibold text-red-700">Lý Do Cấp Cứu Bắt Buộc (Báo cáo sự cố y khoa)</label>
                    <textarea
                      rows="2"
                      value={usePackForm.emergencyReason}
                      onChange={(e) => setUsePackForm({ ...usePackForm, emergencyReason: e.target.value })}
                      placeholder="Ghi rõ diễn biến cấp cứu đe dọa tính mạng cần can thiệp ngay..."
                      className="w-full p-2 border border-red-300 rounded text-xs"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUsePackModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium shadow"
                >
                  Xác Nhận Sử Dụng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LÀM LẠI LABO */}
      {showReworkModal && selectedLabOrder && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Yêu Cầu Làm Lại Sản Phẩm Labo (LabReworks)</h3>
            <form onSubmit={handleRequestRework} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Lý Do Làm Lại</label>
                <textarea
                  rows="3"
                  value={reworkForm.reason}
                  onChange={(e) => setReworkForm({ ...reworkForm, reason: e.target.value })}
                  placeholder="Lệch khớp cắn, sai màu sứ, không khít sát viền nướu..."
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-xs"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Bên Chịu Chi Phí</label>
                  <select
                    value={reworkForm.costBearer}
                    onChange={(e) => setReworkForm({ ...reworkForm, costBearer: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded text-sm"
                  >
                    <option value="LAB">Xưởng Labo chịu</option>
                    <option value="CLINIC">Phòng khám chịu</option>
                    <option value="PATIENT">Bệnh nhân chịu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Chi Phí Làm Lại</label>
                  <input
                    type="number"
                    min="0"
                    step="10000"
                    value={reworkForm.cost}
                    onChange={(e) => setReworkForm({ ...reworkForm, cost: e.target.value })}
                    placeholder="0 VND"
                    className="w-full mt-1 p-2 border border-slate-300 rounded text-sm"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReworkModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm font-medium shadow"
                >
                  Lập Yêu Cầu Làm Lại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: GIẢI QUYẾT SỰ CỐ Y KHOA */}
      {showResolveIncidentModal && selectedIncident && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Phê Duyệt Kết Luận Xử Lý Sự Cố Y Khoa (Maker-Checker)</h3>
            <form onSubmit={handleResolveIncident} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Kết Luận & Phương Án Khắc Phục (Resolution)</label>
                <textarea
                  rows="3"
                  value={resolveForm.resolution}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolution: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-xs"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveIncidentModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium shadow"
                >
                  Xác Nhận Phê Duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
