import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clinicalApi, visitApi, catalogApi } from '../../services/api-client';

// Dental tooth numbers FDI 32 permanent teeth
const UPPER_TEETH = ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28'];
const LOWER_TEETH = ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38'];

export default function EmrDetailPage() {
  const { visitId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const [visit, setVisit] = useState(null);
  const [emr, setEmr] = useState(null);
  const [activeTab, setActiveTab] = useState('emr'); // 'emr' | 'consents' | 'services' | 'orders'

  // EMR Form State
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [medicalHistory, setMedicalHistory] = useState('');
  const [clinicalExamination, setClinicalExamination] = useState('');
  const [diagnosisSummary, setDiagnosisSummary] = useState('');
  const [diagnoses, setDiagnoses] = useState([]);
  const [newDiagCode, setNewDiagCode] = useState('');
  const [newDiagDesc, setNewDiagDesc] = useState('');
  const [toothChart, setToothChart] = useState([]);
  const [selectedTooth, setSelectedTooth] = useState(null);
  const [selectedToothFinding, setSelectedToothFinding] = useState('CARIES');
  const [selectedToothNote, setSelectedToothNote] = useState('');

  // AT-13 Network simulation flag
  const [simulateNetworkLoss, setSimulateNetworkLoss] = useState(false);

  // AT-23 Addenda Form
  const [addendumContent, setAddendumContent] = useState('');
  const [addendumReason, setAddendumReason] = useState('');
  const [showAddendumModal, setShowAddendumModal] = useState(false);

  // Consents State
  const [consents, setConsents] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [signerName, setSignerName] = useState('');
  const [revocationReason, setRevocationReason] = useState('');
  const [revokingConsentId, setRevokingConsentId] = useState(null);

  // Services State (AT-18)
  const [serviceLines, setServiceLines] = useState([]);
  const [catalogServices, setCatalogServices] = useState([]);
  const [selectedServiceId, setSelectedServiceId] = useState('');
  const [serviceQty, setServiceQty] = useState(1);
  const [serviceTooth, setServiceTooth] = useState('');

  // Orders and Prescriptions State
  const [prescriptions, setPrescriptions] = useState([]);
  const [newPrescriptionContent, setNewPrescriptionContent] = useState('');
  const [clinicalOrders, setClinicalOrders] = useState([]);
  const [newOrderType, setNewOrderType] = useState('XRAY');
  const [newOrderDesc, setNewOrderDesc] = useState('');

  useEffect(() => {
    loadData();
  }, [visitId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [vRes, emrRes, consentTplRes, consentListRes, svcLinesRes, catSvcRes, prescRes, ordRes] = await Promise.all([
        visitApi.getVisitById(visitId),
        clinicalApi.getEmr(visitId),
        clinicalApi.getConsentTemplates(),
        clinicalApi.getConsents(visitId),
        clinicalApi.getServices(visitId),
        catalogApi.getServices({ pageSize: 100 }),
        clinicalApi.getPrescriptions(visitId),
        clinicalApi.getOrders(visitId),
      ]);

      setVisit(vRes.data);
      const emrData = emrRes.data;
      setEmr(emrData);

      // Populate EMR Draft form if latest version exists
      const latestVer = emrData?.versions?.[0];
      if (latestVer) {
        let content = {};
        try {
          content = typeof latestVer.clinicalContentJson === 'string'
            ? JSON.parse(latestVer.clinicalContentJson)
            : latestVer.clinicalContentJson;
        } catch {
          content = {};
        }

        setChiefComplaint(content.chiefComplaint || '');
        setMedicalHistory(content.medicalHistory || '');
        setClinicalExamination(content.clinicalExamination || '');
        setDiagnosisSummary(content.diagnosisSummary || '');
        setDiagnoses(latestVer.diagnoses || []);
        setToothChart(latestVer.toothChart || []);
      }

      setTemplates(consentTplRes.data || []);
      setConsents(consentListRes.data || []);
      setServiceLines(svcLinesRes.data || []);
      setCatalogServices(catSvcRes.data?.items || catSvcRes.data?.rows || (Array.isArray(catSvcRes.data) ? catSvcRes.data : []));
      setPrescriptions(prescRes.data || []);
      setClinicalOrders(ordRes.data || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error?.message || err.message || 'Lỗi nạp dữ liệu EMR');
    } finally {
      setLoading(false);
    }
  }

  const latestVersion = emr?.versions?.[0];
  const isSigned = latestVersion?.status === 'SIGNED' || emr?.status === 'SIGNED';

  // --- EMR Actions ---
  async function handleSaveDraft() {
    if (isSigned) return;
    setError(null);
    setSuccessMsg(null);
    try {
      await clinicalApi.updateDraftEmr(visitId, latestVersion.emrVersionId, {
        clinicalContent: {
          chiefComplaint,
          medicalHistory,
          clinicalExamination,
          diagnosisSummary,
        },
        diagnoses,
        toothChart,
      });
      setSuccessMsg('Đã lưu bản nháp bệnh án thành công.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Lỗi lưu bản nháp.');
    }
  }

  async function handleSignEmr() {
    setError(null);
    setSuccessMsg(null);
    try {
      await clinicalApi.signEmr(visitId, latestVersion.emrVersionId, {
        simulateNetworkLoss,
      });
      setSuccessMsg('Ký số hồ sơ bệnh án thành công! Bản ghi chuyển trạng thái BẤT BIẾN.');
      await loadData();
    } catch (err) {
      const code = err.response?.data?.error?.code;
      if (code === 'NETWORK_DISCONNECTED_QUEUED_FOR_SIGN') {
        setError('AT-13: Đã mô phỏng mất kết nối mạng. Yêu cầu ký đã được ghi vào Hàng đợi ký số (SignQueue), không phát sinh chữ ký giả.');
      } else {
        setError(err.response?.data?.error?.message || err.message || 'Lỗi ký số EMR.');
      }
    }
  }

  async function handleAddAddendum() {
    if (!addendumContent || !addendumReason) {
      alert('Vui lòng nhập nội dung và lý do đính chính.');
      return;
    }
    setError(null);
    try {
      await clinicalApi.addEmrAddendum(visitId, latestVersion.emrVersionId, {
        content: addendumContent,
        reason: addendumReason,
      });
      setSuccessMsg('Đã lập phụ lục đính chính EMR thành công (AT-23).');
      setShowAddendumModal(false);
      setAddendumContent('');
      setAddendumReason('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Lỗi lập phụ lục.');
    }
  }

  function handleAddDiagnosis() {
    if (!newDiagDesc) return;
    setDiagnoses([
      ...diagnoses,
      {
        code: newDiagCode.trim(),
        description: newDiagDesc.trim(),
        isPrimary: diagnoses.length === 0,
      },
    ]);
    setNewDiagCode('');
    setNewDiagDesc('');
  }

  function handleAddToothFinding() {
    if (!selectedTooth) return;
    const filtered = toothChart.filter(t => t.toothCode !== selectedTooth);
    setToothChart([
      ...filtered,
      {
        toothCode: selectedTooth,
        findingCode: selectedToothFinding,
        note: selectedToothNote,
      },
    ]);
    setSelectedTooth(null);
    setSelectedToothNote('');
  }

  // --- Consents Actions (AT-06) ---
  async function handleCreateConsent() {
    if (!selectedTemplateId) {
      alert('Vui lòng chọn mẫu cam kết.');
      return;
    }
    try {
      await clinicalApi.createConsent(visitId, {
        consentTemplateId: selectedTemplateId,
        signerName: signerName || visit?.patient?.fullName,
      });
      setSuccessMsg('Đã khởi tạo giấy cam kết.');
      setSelectedTemplateId('');
      setSignerName('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Lỗi tạo cam kết.');
    }
  }

  async function handleSignConsent(consentId) {
    try {
      await clinicalApi.signConsent(visitId, consentId, {
        signerName: visit?.patient?.fullName,
      });
      setSuccessMsg('Đã ký giấy cam kết đồng thuận điều trị.');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Lỗi ký cam kết.');
    }
  }

  async function handleRevokeConsent() {
    if (!revocationReason) {
      alert('Vui lòng nhập lý do rút đồng thuận.');
      return;
    }
    try {
      await clinicalApi.revokeConsent(visitId, revokingConsentId, {
        revocationReason,
      });
      setSuccessMsg('Đã rút đồng thuận điều trị (AT-06). Các thủ thuật chưa làm đã được hủy bỏ.');
      setRevokingConsentId(null);
      setRevocationReason('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Lỗi rút cam kết.');
    }
  }

  // --- Services Actions (AT-18) ---
  async function handleAddService() {
    if (!selectedServiceId) {
      alert('Vui lòng chọn dịch vụ.');
      return;
    }
    try {
      await clinicalApi.addService(visitId, {
        serviceId: selectedServiceId,
        quantity: Number(serviceQty) || 1,
        toothCode: serviceTooth || null,
      });
      setSuccessMsg('Đã chỉ định dịch vụ vào lượt khám.');
      setSelectedServiceId('');
      setServiceTooth('');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Lỗi chỉ định dịch vụ.');
    }
  }

  async function handleCompleteService(serviceLineId) {
    try {
      await clinicalApi.completeService(visitId, serviceLineId, {
        result: 'Đã hoàn thành thủ thuật đạt chuẩn lâm sàng',
      });
      setSuccessMsg('Chốt hoàn thành dịch vụ thành công (AT-18).');
      await loadData();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Lỗi chốt hoàn thành dịch vụ.');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Status Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-sm text-slate-500 mb-1">
              <button onClick={() => navigate('/visits')} className="hover:text-primary">
                ← Danh sách Lượt khám
              </button>
              <span>/</span>
              <span>Hồ sơ bệnh án điện tử (EMR)</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
              EMR: {visit?.patient?.fullName}
              <span className="text-sm font-normal px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                Mã BN: {visit?.patient?.patientCode}
              </span>
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                isSigned ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {isSigned ? '🔒 ĐÃ KÝ SỐ (BẤT BIẾN - AT-23)' : '📝 BẢN NHÁP (DRAFT)'}
              </span>
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Bác sĩ điều trị: <strong className="text-slate-900">{visit?.doctor?.displayName || 'Chưa phân công'}</strong> | 
              Lý do đến khám: <span className="italic">{visit?.chiefComplaint || 'Khám tổng quát'}</span> |
              Trạng thái lượt khám: <strong>{visit?.status}</strong>
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isSigned ? (
              <button
                onClick={() => setShowAddendumModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm shadow-sm flex items-center gap-2"
              >
                <span>📝</span> Lập phụ lục đính chính (AT-23)
              </button>
            ) : (
              <>
                <button
                  onClick={handleSaveDraft}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium text-sm"
                >
                  💾 Lưu nháp EMR
                </button>
                <button
                  onClick={handleSignEmr}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium text-sm shadow-sm flex items-center gap-2"
                >
                  <span>✍️</span> Ký số EMR
                </button>
              </>
            )}
          </div>
        </div>

        {/* Simulation toggle */}
        {!isSigned && (
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
            <input
              type="checkbox"
              id="netSim"
              checked={simulateNetworkLoss}
              onChange={(e) => setSimulateNetworkLoss(e.target.checked)}
              className="rounded text-amber-600 focus:ring-amber-500"
            />
            <label htmlFor="netSim" className="cursor-pointer font-medium text-amber-900">
              [Kiểm thử AT-13] Mô phỏng sự cố mất kết nối mạng khi ký: Hệ thống sẽ chuyển vào hàng đợi ký (SignQueue) và cấm tạo chữ ký giả mạo.
            </label>
          </div>
        )}

        {/* Alerts */}
        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-500 font-bold ml-2">×</button>
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold ml-2">×</button>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-8 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('emr')}
          className={`pb-3 border-b-2 flex items-center gap-2 ${
            activeTab === 'emr'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🩺</span> Hồ sơ Bệnh án & Sơ đồ răng
        </button>
        <button
          onClick={() => setActiveTab('consents')}
          className={`pb-3 border-b-2 flex items-center gap-2 ${
            activeTab === 'consents'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📜</span> Giấy đồng thuận điều trị (AT-06)
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100">{consents.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 border-b-2 flex items-center gap-2 ${
            activeTab === 'services'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>🦷</span> Thủ thuật & Chốt dịch vụ (AT-18)
          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100">{serviceLines.length}</span>
        </button>
        <button
          onClick={() => setActiveTab('orders')}
          className={`pb-3 border-b-2 flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <span>📋</span> Đơn thuốc & Cận lâm sàng
        </button>
      </div>

      {/* TAB 1: EMR & TOOTH CHART */}
      {activeTab === 'emr' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Clinical notes column */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
                <span>Khám lâm sàng & Bệnh sử</span>
                {latestVersion?.signatureHash && (
                  <span className="text-xs font-mono text-slate-500">
                    Hash: {latestVersion.signatureHash.substring(0, 16)}...
                  </span>
                )}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Lý do đến khám (Chief Complaint)</label>
                  <textarea
                    rows={2}
                    value={chiefComplaint}
                    disabled={isSigned}
                    onChange={(e) => setChiefComplaint(e.target.value)}
                    className="w-full text-sm border rounded-lg p-2.5 disabled:bg-slate-50 disabled:text-slate-600"
                    placeholder="VD: Đau nhức răng cấm, buốt khi uống lạnh..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Tiền sử y khoa / Dị ứng</label>
                  <textarea
                    rows={2}
                    value={medicalHistory}
                    disabled={isSigned}
                    onChange={(e) => setMedicalHistory(e.target.value)}
                    className="w-full text-sm border rounded-lg p-2.5 disabled:bg-slate-50 disabled:text-slate-600"
                    placeholder="VD: Cao huyết áp nhẹ, không dị ứng kháng sinh..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Khám thực thể răng miệng</label>
                <textarea
                  rows={3}
                  value={clinicalExamination}
                  disabled={isSigned}
                  onChange={(e) => setClinicalExamination(e.target.value)}
                  className="w-full text-sm border rounded-lg p-2.5 disabled:bg-slate-50 disabled:text-slate-600"
                  placeholder="Mô tả lỗ sâu, nướu viền, gõ ngang, độ lung lay..."
                />
              </div>

              {/* Tooth Chart FDI Interactive */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider">
                    Sơ đồ răng khám (FDI Standard 32 Răng)
                  </label>
                  <span className="text-xs text-slate-500">Nhấp vào răng để ghi nhận tình trạng</span>
                </div>

                {/* Upper Teeth */}
                <div className="mb-2">
                  <div className="text-[10px] text-center font-bold text-slate-400 mb-1">HÀM TRÊN (18 ➔ 28)</div>
                  <div className="flex justify-center gap-1.5 flex-wrap">
                    {UPPER_TEETH.map((tooth) => {
                      const finding = toothChart.find(t => t.toothCode === tooth);
                      return (
                        <button
                          key={tooth}
                          type="button"
                          disabled={isSigned}
                          onClick={() => {
                            setSelectedTooth(tooth);
                            setSelectedToothFinding(finding?.findingCode || 'CARIES');
                            setSelectedToothNote(finding?.note || '');
                          }}
                          className={`w-9 h-11 rounded border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                            finding
                              ? 'bg-rose-100 border-rose-400 text-rose-800 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          } ${selectedTooth === tooth ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                        >
                          <span>{tooth}</span>
                          {finding && <span className="text-[9px] font-normal leading-none">{finding.findingCode.substring(0, 3)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Lower Teeth */}
                <div>
                  <div className="text-[10px] text-center font-bold text-slate-400 mb-1">HÀM DƯỚI (48 ➔ 38)</div>
                  <div className="flex justify-center gap-1.5 flex-wrap">
                    {LOWER_TEETH.map((tooth) => {
                      const finding = toothChart.find(t => t.toothCode === tooth);
                      return (
                        <button
                          key={tooth}
                          type="button"
                          disabled={isSigned}
                          onClick={() => {
                            setSelectedTooth(tooth);
                            setSelectedToothFinding(finding?.findingCode || 'CARIES');
                            setSelectedToothNote(finding?.note || '');
                          }}
                          className={`w-9 h-11 rounded border text-xs font-bold flex flex-col items-center justify-center transition-all ${
                            finding
                              ? 'bg-rose-100 border-rose-400 text-rose-800 shadow-sm'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          } ${selectedTooth === tooth ? 'ring-2 ring-primary ring-offset-1' : ''}`}
                        >
                          <span>{tooth}</span>
                          {finding && <span className="text-[9px] font-normal leading-none">{finding.findingCode.substring(0, 3)}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tooth Editor Modal/Inline Panel */}
                {selectedTooth && !isSigned && (
                  <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap items-center gap-3">
                    <span className="font-bold text-sm text-slate-800">Răng: {selectedTooth}</span>
                    <select
                      value={selectedToothFinding}
                      onChange={(e) => setSelectedToothFinding(e.target.value)}
                      className="text-xs border rounded p-1.5 bg-white"
                    >
                      <option value="CARIES">Sâu răng (Caries)</option>
                      <option value="ENDO">Viêm tủy / Điều trị tủy</option>
                      <option value="MISSING">Mất răng (Missing)</option>
                      <option value="CROWN">Bọc răng sứ (Crown)</option>
                      <option value="IMPLANT">Cấy Implant</option>
                      <option value="IMPACTED">Răng ngầm / Răng khôn lệch</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Ghi chú chi tiết vị trí..."
                      value={selectedToothNote}
                      onChange={(e) => setSelectedToothNote(e.target.value)}
                      className="text-xs border rounded p-1.5 flex-1 min-w-[150px] bg-white"
                    />
                    <button
                      type="button"
                      onClick={handleAddToothFinding}
                      className="px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-primary-dark"
                    >
                      Lưu tình trạng
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTooth(null)}
                      className="text-xs text-slate-500 hover:text-slate-800"
                    >
                      Đóng
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Diagnoses Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2">Chẩn đoán xác định (Diagnoses)</h3>
              <div className="space-y-2">
                {diagnoses.map((diag, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs bg-slate-200 px-2 py-0.5 rounded text-slate-800">
                        {diag.code || 'LÂM SÀNG'}
                      </span>
                      <span className="font-medium text-slate-800">{diag.description}</span>
                      {diag.isPrimary && (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Chính
                        </span>
                      )}
                    </div>
                    {!isSigned && (
                      <button
                        onClick={() => setDiagnoses(diagnoses.filter((_, i) => i !== idx))}
                        className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                      >
                        Xóa
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {!isSigned && (
                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="Mã ICD (VD: K04.0)"
                    value={newDiagCode}
                    onChange={(e) => setNewDiagCode(e.target.value)}
                    className="w-32 text-xs border rounded-lg p-2"
                  />
                  <input
                    type="text"
                    placeholder="Mô tả chẩn đoán bệnh lý..."
                    value={newDiagDesc}
                    onChange={(e) => setNewDiagDesc(e.target.value)}
                    className="flex-1 text-xs border rounded-lg p-2"
                  />
                  <button
                    type="button"
                    onClick={handleAddDiagnosis}
                    className="px-3 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg hover:bg-black"
                  >
                    + Thêm chẩn đoán
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: EMR Versions & Addenda (AT-23) */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
                <span>Lịch sử phiên bản & Ký số</span>
                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">v{latestVersion?.versionNo || 1}</span>
              </h3>

              <div className="text-xs space-y-2 text-slate-600">
                <div>Người tạo: <strong>{latestVersion?.author?.displayName || 'Bác sĩ'}</strong></div>
                <div>Thời gian lập: {new Date(latestVersion?.createdAt).toLocaleString('vi-VN')}</div>
                {latestVersion?.signedAt && (
                  <div>Thời gian ký số: <strong className="text-emerald-700">{new Date(latestVersion.signedAt).toLocaleString('vi-VN')}</strong></div>
                )}
                {latestVersion?.signatureHash && (
                  <div>
                    <span className="font-semibold block mb-1">Chữ ký điện tử SHA-256:</span>
                    <span className="font-mono text-[10px] break-all bg-slate-100 p-1.5 rounded block text-slate-800">
                      {latestVersion.signatureHash}
                    </span>
                  </div>
                )}
              </div>

              {/* Addenda List (AT-23) */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="font-semibold text-xs uppercase tracking-wider text-slate-700 mb-2">
                  Phụ lục đính chính sau ký (AT-23)
                </h4>
                {latestVersion?.addenda?.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có phụ lục điều chỉnh nào.</p>
                ) : (
                  <div className="space-y-2">
                    {latestVersion?.addenda?.map((add) => (
                      <div key={add.emrAddendumId} className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
                        <div className="font-bold text-blue-950 flex justify-between">
                          <span>{add.author?.displayName || 'Bác sĩ'}</span>
                          <span className="text-[10px] text-blue-600 font-normal">
                            {new Date(add.signedAt).toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <p className="text-slate-800">{add.content}</p>
                        <p className="text-[11px] text-slate-500 italic">Lý do: {add.reason}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONSENTS (AT-06) */}
      {activeTab === 'consents' && (
        <div className="space-y-6">
          {/* Create consent form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center justify-between">
              <span>Khởi tạo Giấy cam kết đồng thuận điều trị</span>
              <span className="text-xs font-normal text-slate-500">Mẫu được chuẩn hóa và kiểm soát phiên bản</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mẫu cam kết</label>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="w-full text-xs border rounded-lg p-2.5 bg-white"
                >
                  <option value="">-- Chọn mẫu giấy cam kết --</option>
                  {templates.map(t => (
                    <option key={t.consentTemplateId} value={t.consentTemplateId}>
                      [{t.code}] {t.title}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Họ tên người ký</label>
                <input
                  type="text"
                  placeholder={visit?.patient?.fullName || 'Họ tên người ký'}
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full text-xs border rounded-lg p-2.5"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleCreateConsent}
                  className="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium text-xs"
                >
                  + Khởi tạo Giấy đồng thuận
                </button>
              </div>
            </div>
          </div>

          {/* Consents List */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Danh sách giấy cam kết đã lập</h3>
            {consents.length === 0 ? (
              <p className="text-sm text-slate-500 italic text-center py-6">Chưa có giấy cam kết nào cho lượt khám này.</p>
            ) : (
              <div className="space-y-4">
                {consents.map((consent) => (
                  <div key={consent.consentId} className="border rounded-xl p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-bold text-slate-900 text-sm">{consent.template?.title || 'Giấy cam kết'}</h4>
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                          consent.status === 'SIGNED' ? 'bg-emerald-100 text-emerald-800' :
                          consent.status === 'REVOKED' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {consent.status === 'SIGNED' ? 'ĐÃ KÝ ĐỒNG THUẬN' :
                           consent.status === 'REVOKED' ? 'ĐÃ RÚT ĐỒNG THUẬN (AT-06)' :
                           'BẢN NHÁP / ĐANG TRÌNH'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Người ký: <strong>{consent.signerName}</strong> | 
                        Thời gian tạo: {new Date(consent.createdAt).toLocaleString('vi-VN')}
                        {consent.signedAt && ` | Ký lúc: ${new Date(consent.signedAt).toLocaleString('vi-VN')}`}
                      </p>
                      {consent.status === 'REVOKED' && (
                        <div className="text-xs text-rose-700 bg-rose-50 p-2 rounded border border-rose-100 mt-1">
                          <strong>Lý do rút đồng thuận:</strong> {consent.revocationReason} ({new Date(consent.revokedAt).toLocaleString('vi-VN')})
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {consent.status === 'DRAFT' && (
                        <button
                          onClick={() => handleSignConsent(consent.consentId)}
                          className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700"
                        >
                          Ký đồng thuận
                        </button>
                      )}
                      {consent.status === 'SIGNED' && (
                        <button
                          onClick={() => setRevokingConsentId(consent.consentId)}
                          className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700"
                        >
                          Rút đồng thuận (AT-06)
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: SERVICES & COMPLETION (AT-18) */}
      {activeTab === 'services' && (
        <div className="space-y-6">
          {/* Add Service Line Form */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4">Chỉ định dịch vụ / thủ thuật điều trị</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Chọn dịch vụ trong danh mục</label>
                <select
                  value={selectedServiceId}
                  onChange={(e) => setSelectedServiceId(e.target.value)}
                  className="w-full text-xs border rounded-lg p-2.5 bg-white"
                >
                  <option value="">-- Chọn dịch vụ --</option>
                  {catalogServices.map(s => (
                    <option key={s.serviceId} value={s.serviceId}>
                      [{s.code}] {s.name} - Giá: {s.currentPrice ? Number(s.currentPrice).toLocaleString('vi-VN') + ' đ' : 'Chưa có giá'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Răng chỉ định</label>
                <input
                  type="text"
                  placeholder="VD: 38, 48..."
                  value={serviceTooth}
                  onChange={(e) => setServiceTooth(e.target.value)}
                  className="w-full text-xs border rounded-lg p-2.5"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleAddService}
                  className="w-full px-4 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium text-xs"
                >
                  + Thêm chỉ định dịch vụ
                </button>
              </div>
            </div>
          </div>

          {/* Service Lines Table with Completion Button (AT-18) */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 text-sm">Danh sách dịch vụ của ca khám</h3>
              <span className="text-xs text-slate-500">Quy tắc AT-18: Cấm chốt lặp để tránh trùng doanh thu và trừ kho</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-slate-100 text-xs text-slate-600 uppercase">
                    <th className="p-3">Dịch vụ</th>
                    <th className="p-3">Răng</th>
                    <th className="p-3">Số lượng</th>
                    <th className="p-3">Đơn giá đã duyệt</th>
                    <th className="p-3">Trạng thái</th>
                    <th className="p-3 text-right">Thao tác chốt dịch vụ (AT-18)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {serviceLines.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 italic">
                        Chưa có dịch vụ nào được chỉ định.
                      </td>
                    </tr>
                  ) : (
                    serviceLines.map((line) => {
                      const isCompleted = line.status === 'COMPLETED';
                      const isCancelled = line.status === 'CANCELLED';

                      return (
                        <tr key={line.serviceLineId} className="hover:bg-slate-50">
                          <td className="p-3">
                            <span className="font-semibold text-slate-900">{line.service?.name}</span>
                            <span className="block text-xs text-slate-400 font-mono">{line.service?.code}</span>
                          </td>
                          <td className="p-3 font-semibold text-slate-700">{line.toothCode || '-'}</td>
                          <td className="p-3">{Number(line.quantity)}</td>
                          <td className="p-3 font-semibold text-slate-900">
                            {Number(line.approvedUnitPrice).toLocaleString('vi-VN')} đ
                          </td>
                          <td className="p-3">
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                              isCompleted ? 'bg-emerald-100 text-emerald-800' :
                              isCancelled ? 'bg-rose-100 text-rose-800' :
                              'bg-amber-100 text-amber-800'
                            }`}>
                              {line.status}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            {isCompleted ? (
                              <span className="text-xs font-semibold text-emerald-600 flex items-center justify-end gap-1">
                                <span>✔</span> Đã chốt hoàn thành
                              </span>
                            ) : isCancelled ? (
                              <span className="text-xs text-rose-500 italic">Đã hủy (Rút đồng thuận)</span>
                            ) : (
                              <button
                                onClick={() => handleCompleteService(line.serviceLineId)}
                                className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 shadow-sm"
                              >
                                Chốt hoàn thành thủ thuật
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

      {/* TAB 4: ORDERS AND PRESCRIPTIONS */}
      {activeTab === 'orders' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Prescriptions */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
              <span>Đơn thuốc (Prescriptions)</span>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{prescriptions.length} đơn</span>
            </h3>

            <div className="space-y-3">
              {prescriptions.map(p => (
                <div key={p.prescriptionId} className="p-3 border rounded-lg bg-slate-50 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Trạng thái: {p.status}</span>
                    <span>{new Date(p.createdAt).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <pre className="text-slate-600 font-sans text-xs whitespace-pre-wrap">{p.prescriptionJson}</pre>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t space-y-2">
              <label className="block text-xs font-semibold text-slate-600">Nội dung đơn thuốc & dặn dò</label>
              <textarea
                rows={3}
                placeholder="VD: Amoxicillin 500mg (14 viên, ngày uống 2 lần...), Paracetamol 500mg..."
                value={newPrescriptionContent}
                onChange={(e) => setNewPrescriptionContent(e.target.value)}
                className="w-full text-xs border rounded-lg p-2.5"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!newPrescriptionContent) return;
                  try {
                    await clinicalApi.createPrescription(visitId, {
                      prescriptionJson: newPrescriptionContent,
                    });
                    setNewPrescriptionContent('');
                    setSuccessMsg('Đã kê đơn thuốc thành công.');
                    await loadData();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-black"
              >
                + Kê đơn thuốc mới
              </button>
            </div>
          </div>

          {/* Clinical Orders */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            <h3 className="font-bold text-slate-900 border-b pb-2 flex items-center justify-between">
              <span>Chỉ định Cận lâm sàng (Clinical Orders)</span>
              <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{clinicalOrders.length} chỉ định</span>
            </h3>

            <div className="space-y-3">
              {clinicalOrders.map(o => (
                <div key={o.clinicalOrderId} className="p-3 border rounded-lg bg-slate-50 text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-800">
                    <span>Loại: {o.orderType}</span>
                    <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800">{o.status}</span>
                  </div>
                  <pre className="text-slate-600 font-sans text-xs whitespace-pre-wrap">{o.orderJson}</pre>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Loại chỉ định</label>
                  <select
                    value={newOrderType}
                    onChange={(e) => setNewOrderType(e.target.value)}
                    className="w-full text-xs border rounded-lg p-2 bg-white"
                  >
                    <option value="XRAY">Chụp X-quang quanh chóp</option>
                    <option value="PANORAMA">Chụp Panorama toàn cảnh</option>
                    <option value="CBCT">Chụp cắt lớp ConeBeam CT</option>
                    <option value="BLOOD_TEST">Xét nghiệm đông máu / Công thức máu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Vị trí / Hướng dẫn</label>
                  <input
                    type="text"
                    placeholder="VD: Khảo sát răng khôn 38, 48"
                    value={newOrderDesc}
                    onChange={(e) => setNewOrderDesc(e.target.value)}
                    className="w-full text-xs border rounded-lg p-2"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!newOrderDesc) return;
                  try {
                    await clinicalApi.createOrder(visitId, {
                      orderType: newOrderType,
                      orderJson: JSON.stringify({ notes: newOrderDesc }),
                    });
                    setNewOrderDesc('');
                    setSuccessMsg('Đã tạo chỉ định cận lâm sàng.');
                    await loadData();
                  } catch (err) {
                    setError(err.message);
                  }
                }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-black"
              >
                + Gửi chỉ định cận lâm sàng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD EMR ADDENDUM (AT-23) */}
      {showAddendumModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <span>📝</span> Lập phụ lục đính chính EMR (AT-23)
            </h3>
            <p className="text-xs text-slate-500">
              Quy tắc bất biến: Hồ sơ EMR đã ký số không được phép chỉnh sửa trực tiếp. Mọi thông tin bổ sung hoặc đính chính phải được lập thành phụ lục có kiểm toán.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nội dung đính chính / Bổ sung</label>
              <textarea
                rows={3}
                value={addendumContent}
                onChange={(e) => setAddendumContent(e.target.value)}
                className="w-full text-sm border rounded-lg p-2.5"
                placeholder="Nhập nội dung thông tin cần đính chính..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do điều chỉnh</label>
              <input
                type="text"
                value={addendumReason}
                onChange={(e) => setAddendumReason(e.target.value)}
                className="w-full text-sm border rounded-lg p-2.5"
                placeholder="VD: Bệnh nhân bổ sung tiền sử đau dạ dày..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowAddendumModal(false)}
                className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleAddAddendum}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700"
              >
                Xác nhận lưu phụ lục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REVOKE CONSENT (AT-06) */}
      {revokingConsentId && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-rose-700 text-base flex items-center gap-2">
              <span>⚠️</span> Rút giấy đồng thuận điều trị (AT-06)
            </h3>
            <p className="text-xs text-slate-600">
              Quy tắc AT-06: Giấy cam kết sẽ chuyển trạng thái REVOKED (không bị xóa). Các thủ thuật chưa làm sẽ bị hủy ngay lập tức; các thủ thuật đã hoàn thành trước đó được giữ nguyên vẹn.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lý do rút đồng thuận</label>
              <textarea
                rows={3}
                value={revocationReason}
                onChange={(e) => setRevocationReason(e.target.value)}
                className="w-full text-sm border rounded-lg p-2.5"
                placeholder="VD: Bệnh nhân thấy mệt xin dừng không nhổ tiếp răng thứ hai..."
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setRevokingConsentId(null);
                  setRevocationReason('');
                }}
                className="px-4 py-2 text-slate-600 text-sm hover:bg-slate-100 rounded-lg"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleRevokeConsent}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700"
              >
                Xác nhận rút đồng thuận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
