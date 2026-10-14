import React, { useState, useEffect } from 'react';
import { insuranceApi } from '../../services/api-client';
import { useAuth } from '../../context/auth-context.jsx';

export default function InsurancePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('claims'); // 'claims' | 'contracts' | 'disputes'

  // Data states
  const [claims, setClaims] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Modals / Action states
  const [selectedClaim, setSelectedClaim] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showAdjModal, setShowAdjModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showNewContractModal, setShowNewContractModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState(null);

  // Form states
  const [submitForm, setSubmitForm] = useState({ versionNo: 1, destination: 'BAO_VIET_GATEWAY', payload: '' });
  const [adjForm, setAdjForm] = useState({ approvedAmount: '', invoiceId: '' });
  const [payForm, setPayForm] = useState({ externalReference: '', amount: '' });
  const [resolveForm, setResolveForm] = useState({ resolution: '', status: 'RESOLVED' });
  const [contractForm, setContractForm] = useState({
    contractNo: '',
    payerName: '',
    effectiveFrom: '',
    effectiveTo: '',
    limitAmount: '',
    allowPatientRecovery: false,
    coveragePercent: 80,
  });

  const isApprover = user?.role === 'ADMIN' || user?.isApprover;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      if (activeTab === 'claims' || activeTab === 'disputes') {
        const res = await insuranceApi.getClaims();
        setClaims(res.data || []);
      }
      if (activeTab === 'contracts') {
        const res = await insuranceApi.getContracts();
        setContracts(res.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể tải dữ liệu bảo hiểm.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSubmit = (claim) => {
    setSelectedClaim(claim);
    setSubmitForm({ versionNo: 1, destination: 'BAO_VIET_GATEWAY', payload: JSON.stringify({ claimNo: claim.claimNo, amount: claim.requestedAmount }) });
    setShowSubmitModal(true);
  };

  const handleSubmitClaim = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await insuranceApi.submitClaim(selectedClaim.insuranceClaimId, {
        versionNo: Number(submitForm.versionNo),
        destination: submitForm.destination,
        payload: submitForm.payload,
      });
      setSuccess('Đã gửi hồ sơ bảo lãnh tới đối tác bồi thường (AT-14: chống gửi lặp thành công).');
      setShowSubmitModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Gửi hồ sơ thất bại.');
    }
  };

  const handleOpenAdjudicate = (claim) => {
    setSelectedClaim(claim);
    setAdjForm({ approvedAmount: claim.requestedAmount, invoiceId: '' });
    setShowAdjModal(true);
  };

  const handleAdjudicate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await insuranceApi.adjudicateClaim(selectedClaim.insuranceClaimId, {
        approvedAmount: Number(adjForm.approvedAmount),
        invoiceId: adjForm.invoiceId || undefined,
      });
      setSuccess(res.message || 'Ghi nhận phê duyệt bồi thường thành công.');
      setShowAdjModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Phê duyệt bồi thường thất bại.');
    }
  };

  const handleOpenPayment = (claim) => {
    setSelectedClaim(claim);
    setPayForm({
      externalReference: `TRX-${Date.now().toString().slice(-6)}`,
      amount: (Number(claim.approvedAmount || 0) - Number(claim.settledAmount || 0)).toString(),
    });
    setShowPayModal(true);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      const res = await insuranceApi.recordPayment({
        insuranceClaimId: selectedClaim.insuranceClaimId,
        externalReference: payForm.externalReference,
        amount: Number(payForm.amount),
      });
      setSuccess(res.message || 'Đối soát thanh toán tiền thực nhận thành công.');
      setShowPayModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Đối soát thanh toán thất bại.');
    }
  };

  const handleCreateContract = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await insuranceApi.createContract({
        contractNo: contractForm.contractNo,
        payerName: contractForm.payerName,
        effectiveFrom: contractForm.effectiveFrom,
        effectiveTo: contractForm.effectiveTo,
        limitAmount: contractForm.limitAmount ? Number(contractForm.limitAmount) : null,
        coverageRulesJson: {
          allowPatientRecovery: contractForm.allowPatientRecovery,
          coveragePercent: Number(contractForm.coveragePercent),
        },
      });
      setSuccess('Tạo hợp đồng bảo hiểm thương mại mới thành công.');
      setShowNewContractModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể tạo hợp đồng.');
    }
  };

  const handleOpenResolve = (dispute) => {
    setSelectedDispute(dispute);
    setResolveForm({ resolution: 'Kế toán trưởng phê duyệt cơ sở phòng khám chịu chi phí rủi ro theo điều khoản hợp đồng.', status: 'RESOLVED' });
    setShowResolveModal(true);
  };

  const handleResolveDispute = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await insuranceApi.resolveDispute(selectedDispute.claimDisputeId, resolveForm);
      setSuccess('Đã phê duyệt giải quyết tranh chấp/khoản thiếu bồi thường.');
      setShowResolveModal(false);
      fetchData();
    } catch (err) {
      setError(err?.response?.data?.error?.message || err?.message || 'Không thể giải quyết tranh chấp.');
    }
  };

  // Helper format currency
  const formatMoney = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '0 ₫';
    return Number(val).toLocaleString('vi-VN') + ' ₫';
  };

  const allDisputes = claims.flatMap(c => (c.disputes || []).map(d => ({ ...d, claimNo: c.claimNo, payerName: c.contract?.payerName })));

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <span>🛡️</span> Quản Lý Bảo Hiểm Thương Mại (BHTM)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Quy trình bồi thường bảo lãnh viện phí, chống gửi trùng (AT-14), kiểm soát duyệt thiếu (AT-04) và đối soát thanh toán (AT-03).
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'contracts' && isApprover && (
            <button
              onClick={() => setShowNewContractModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow transition flex items-center gap-1.5"
            >
              <span>+</span> Thêm Hợp Đồng BHTM
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
          onClick={() => setActiveTab('claims')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'claims'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📋 Hồ Sơ Bồi Thường (Claims)
        </button>
        <button
          onClick={() => setActiveTab('contracts')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'contracts'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📑 Hợp Đồng Bảo Lãnh (Contracts)
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition ${
            activeTab === 'disputes'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          ⚖️ Tranh Chấp & Khoản Thiếu ({allDisputes.length})
        </button>
      </div>

      {/* CONTENT TAB 1: CLAIMS */}
      {activeTab === 'claims' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-semibold text-slate-700">Danh Sách Hồ Sơ Yêu Cầu Bảo Lãnh BHTM</h2>
            <span className="text-xs text-slate-500">Tổng cộng: {claims.length} hồ sơ</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                  <th className="py-3 px-4">Mã Claim</th>
                  <th className="py-3 px-4">Đơn Vị BHTM</th>
                  <th className="py-3 px-4">Số Tiền Yêu Cầu</th>
                  <th className="py-3 px-4">Số Tiền Duyệt</th>
                  <th className="py-3 px-4">Đã Thực Nhận</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {claims.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-8 text-center text-slate-400">
                      Chưa có hồ sơ bảo lãnh BHTM nào trong hệ thống.
                    </td>
                  </tr>
                ) : (
                  claims.map((claim) => (
                    <tr key={claim.insuranceClaimId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{claim.claimNo}</td>
                      <td className="py-3 px-4 font-medium text-slate-800">{claim.contract?.payerName || '---'}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{formatMoney(claim.requestedAmount)}</td>
                      <td className="py-3 px-4 font-semibold text-emerald-600">
                        {claim.approvedAmount ? formatMoney(claim.approvedAmount) : 'Chờ duyệt'}
                      </td>
                      <td className="py-3 px-4 font-semibold text-indigo-600">{formatMoney(claim.settledAmount)}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            claim.status === 'SETTLED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : claim.status === 'APPROVED'
                              ? 'bg-blue-100 text-blue-800'
                              : claim.status === 'PARTIALLY_APPROVED'
                              ? 'bg-amber-100 text-amber-800'
                              : claim.status === 'CLOSED'
                              ? 'bg-slate-200 text-slate-700'
                              : claim.status === 'REJECTED'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center space-x-1.5 whitespace-nowrap">
                        {['DRAFT', 'VALIDATED'].includes(claim.status) && (
                          <button
                            onClick={() => handleOpenSubmit(claim)}
                            className="px-2.5 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-medium text-xs rounded border border-indigo-200 transition"
                          >
                            📤 Nộp BHTM (AT-14)
                          </button>
                        )}
                        {['SUBMITTED', 'ACKNOWLEDGED'].includes(claim.status) && (
                          <button
                            onClick={() => handleOpenAdjudicate(claim)}
                            className="px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-medium text-xs rounded border border-emerald-200 transition"
                          >
                            ⚖️ Duyệt Kết Quả (AT-03/04)
                          </button>
                        )}
                        {['APPROVED', 'PARTIALLY_APPROVED'].includes(claim.status) && (
                          <button
                            onClick={() => handleOpenPayment(claim)}
                            className="px-2.5 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium text-xs rounded border border-purple-200 transition"
                          >
                            💰 Nhận Tiền (AT-14)
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

      {/* CONTENT TAB 2: CONTRACTS */}
      {activeTab === 'contracts' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <h2 className="font-semibold text-slate-700">Hợp Đồng Bảo Hiểm Đang Hiệu Lực</h2>
            <span className="text-xs text-slate-500">Tổng cộng: {contracts.length} hợp đồng</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                  <th className="py-3 px-4">Mã Hợp Đồng</th>
                  <th className="py-3 px-4">Tên Đối Tác Bảo Hiểm</th>
                  <th className="py-3 px-4">Hiệu Lực</th>
                  <th className="py-3 px-4">Hạn Mức</th>
                  <th className="py-3 px-4">Quy Tắc Thu Lại (AT-04)</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {contracts.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      Chưa có hợp đồng bảo hiểm nào.
                    </td>
                  </tr>
                ) : (
                  contracts.map((c) => {
                    const rules = JSON.parse(c.coverageRulesJson || '{}');
                    return (
                      <tr key={c.insuranceContractId} className="hover:bg-slate-50 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-900">{c.contractNo}</td>
                        <td className="py-3 px-4 font-semibold text-slate-800">{c.payerName}</td>
                        <td className="py-3 px-4 text-xs text-slate-500">
                          {c.effectiveFrom} ➔ {c.effectiveTo}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {c.limitAmount ? formatMoney(c.limitAmount) : 'Không giới hạn'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          {rules.allowPatientRecovery ? (
                            <span className="text-amber-600 font-medium">Cho phép thu lại bệnh nhân</span>
                          ) : (
                            <span className="text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              🛡️ Không thu lại BN (Phòng khám chịu)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CONTENT TAB 3: DISPUTES */}
      {activeTab === 'disputes' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
            <div>
              <h2 className="font-semibold text-slate-700">Danh Sách Tranh Chấp & Khoản Thiếu Bồi Thường (AT-04 / AT-14)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Các khoản BHTM duyệt thiếu hoặc chuyển thiếu tiền ngân hàng cần Kế toán trưởng phê duyệt phương án giải quyết (Maker-Checker).
              </p>
            </div>
            <span className="text-xs text-slate-500">Tổng cộng: {allDisputes.length} khoản</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-medium border-b border-slate-200">
                  <th className="py-3 px-4">Mã Claim</th>
                  <th className="py-3 px-4">Số Tiền Lệch/Thiếu</th>
                  <th className="py-3 px-4">Lý Do / Biên Bản</th>
                  <th className="py-3 px-4">Phương Án Xử Lý</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-center">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {allDisputes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-8 text-center text-slate-400">
                      Không có tranh chấp hoặc khoản thiếu hụt bồi thường nào.
                    </td>
                  </tr>
                ) : (
                  allDisputes.map((d) => (
                    <tr key={d.claimDisputeId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-900">{d.claimNo}</td>
                      <td className="py-3 px-4 font-semibold text-red-600">{formatMoney(d.disputedAmount)}</td>
                      <td className="py-3 px-4 max-w-xs text-xs text-slate-600">{d.reason}</td>
                      <td className="py-3 px-4 max-w-xs text-xs text-slate-800">{d.resolution || '---'}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            ['RESOLVED', 'CLOSED'].includes(d.status)
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {d.status === 'OPEN' && isApprover && (
                          <button
                            onClick={() => handleOpenResolve(d)}
                            className="px-3 py-1 bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-medium rounded shadow transition"
                          >
                            ✍️ Phê Duyệt Xử Lý
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

      {/* MODAL: SUBMIT CLAIM (AT-14) */}
      {showSubmitModal && selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>📤</span> Gửi Hồ Sơ Bảo Lãnh BHTM (AT-14)
            </h3>
            <p className="text-xs text-slate-500">
              Hệ thống mã hóa SHA-256 và kiểm tra chống gửi lặp theo bộ ba <b>(Hồ sơ, Phiên bản, Cổng nhận)</b>.
            </p>
            <form onSubmit={handleSubmitClaim} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mã Hồ Sơ (Claim No)</label>
                <input
                  type="text"
                  disabled
                  value={selectedClaim.claimNo}
                  className="w-full mt-1 p-2 bg-slate-100 border border-slate-300 rounded font-mono text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Phiên Bản Gửi (Version No)</label>
                  <input
                    type="number"
                    min="1"
                    value={submitForm.versionNo}
                    onChange={(e) => setSubmitForm({ ...submitForm, versionNo: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded text-sm font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Cổng Nhận (Destination)</label>
                  <input
                    type="text"
                    value={submitForm.destination}
                    onChange={(e) => setSubmitForm({ ...submitForm, destination: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Dữ Liệu JSON (Payload)</label>
                <textarea
                  rows="3"
                  value={submitForm.payload}
                  onChange={(e) => setSubmitForm({ ...submitForm, payload: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded font-mono text-xs"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSubmitModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium shadow"
                >
                  Xác Nhận Gửi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADJUDICATE CLAIM (AT-03 / AT-04) */}
      {showAdjModal && selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>⚖️</span> Phê Duyệt Kết Quả Bồi Thường BHTM
            </h3>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 space-y-1">
              <p><b>Quy tắc AT-03:</b> Sau khi duyệt, ghi nhận công nợ BHTM, tiền ngân hàng chưa tăng, chưa tất toán SETTLED.</p>
              <p><b>Quy tắc AT-04:</b> Nếu duyệt thiếu, hệ thống KHÔNG tự động chuyển nợ sang bệnh nhân mà sinh phiếu giải quyết chi phí.</p>
            </div>
            <form onSubmit={handleAdjudicate} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Số Tiền Đã Yêu Cầu</label>
                <input
                  type="text"
                  disabled
                  value={formatMoney(selectedClaim.requestedAmount)}
                  className="w-full mt-1 p-2 bg-slate-100 border border-slate-300 rounded font-semibold text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Số Tiền BHTM Duyệt (Approved Amount)</label>
                <input
                  type="number"
                  min="0"
                  max={selectedClaim.requestedAmount}
                  step="1000"
                  value={adjForm.approvedAmount}
                  onChange={(e) => setAdjForm({ ...adjForm, approvedAmount: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm font-bold text-emerald-700"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdjModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-sm font-medium shadow"
                >
                  Lưu Kết Quả Duyệt
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD PAYMENT (AT-14) */}
      {showPayModal && selectedClaim && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>💰</span> Ghi Nhận Tiền Thanh Toán Từ BHTM (AT-14)
            </h3>
            <p className="text-xs text-slate-500">
              Đối soát mã giao dịch ngân hàng. Nếu BHTM chuyển thiếu tiền so với số duyệt, hệ thống tự động ghi nhận sai lệch và giữ hồ sơ chưa SETTLED.
            </p>
            <form onSubmit={handleRecordPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Mã Giao Dịch Ngân Hàng (ExternalReference)</label>
                <input
                  type="text"
                  value={payForm.externalReference}
                  onChange={(e) => setPayForm({ ...payForm, externalReference: e.target.value })}
                  placeholder="Ví dụ: VCB-TRX-123456"
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Số Tiền Thực Nhận (VND)</label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm font-bold text-purple-700"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium shadow"
                >
                  Xác Nhận Đối Soát
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE CONTRACT */}
      {showNewContractModal && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Tạo Hợp Đồng Bảo Hiểm Thương Mại Mới</h3>
            <form onSubmit={handleCreateContract} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Mã Hợp Đồng</label>
                  <input
                    type="text"
                    value={contractForm.contractNo}
                    onChange={(e) => setContractForm({ ...contractForm, contractNo: e.target.value })}
                    placeholder="HD-BV-2026"
                    className="w-full mt-1 p-2 border border-slate-300 rounded text-sm font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Tên Đối Tác BHTM</label>
                  <input
                    type="text"
                    value={contractForm.payerName}
                    onChange={(e) => setContractForm({ ...contractForm, payerName: e.target.value })}
                    placeholder="Bảo Việt / PVI / Manulife"
                    className="w-full mt-1 p-2 border border-slate-300 rounded text-sm"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Hiệu Lực Từ Ngày</label>
                  <input
                    type="date"
                    value={contractForm.effectiveFrom}
                    onChange={(e) => setContractForm({ ...contractForm, effectiveFrom: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Hiệu Lực Đến Ngày</label>
                  <input
                    type="date"
                    value={contractForm.effectiveTo}
                    onChange={(e) => setContractForm({ ...contractForm, effectiveTo: e.target.value })}
                    className="w-full mt-1 p-2 border border-slate-300 rounded text-sm"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Hạn Mức Tối Đa (Limit Amount)</label>
                <input
                  type="number"
                  min="0"
                  step="1000000"
                  value={contractForm.limitAmount}
                  onChange={(e) => setContractForm({ ...contractForm, limitAmount: e.target.value })}
                  placeholder="Để trống nếu không giới hạn"
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm"
                />
              </div>
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={contractForm.allowPatientRecovery}
                    onChange={(e) => setContractForm({ ...contractForm, allowPatientRecovery: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <span className="text-xs font-medium text-slate-800">
                    Cho phép thu lại từ bệnh nhân nếu BHTM duyệt thiếu (Mặc định bỏ chọn để phòng khám chịu - AT-04)
                  </span>
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewContractModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-sm hover:bg-slate-50 font-medium"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium shadow"
                >
                  Lưu Hợp Đồng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RESOLVE DISPUTE */}
      {showResolveModal && selectedDispute && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>✍️</span> Phê Duyệt Phương Án Xử Lý Tranh Chấp (AT-04 / AT-14)
            </h3>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs space-y-1">
              <p><b>Số tiền thiếu:</b> <span className="text-red-600 font-bold">{formatMoney(selectedDispute.disputedAmount)}</span></p>
              <p><b>Nguyên nhân:</b> {selectedDispute.reason}</p>
            </div>
            <form onSubmit={handleResolveDispute} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Phương Án Xử Lý / Quyết Định (Resolution)</label>
                <textarea
                  rows="3"
                  value={resolveForm.resolution}
                  onChange={(e) => setResolveForm({ ...resolveForm, resolution: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-xs"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700">Trạng Thái Sau Xử Lý</label>
                <select
                  value={resolveForm.status}
                  onChange={(e) => setResolveForm({ ...resolveForm, status: e.target.value })}
                  className="w-full mt-1 p-2 border border-slate-300 rounded text-sm"
                >
                  <option value="RESOLVED">RESOLVED (Đã giải quyết)</option>
                  <option value="CLOSED">CLOSED (Đóng tranh chấp)</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
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
