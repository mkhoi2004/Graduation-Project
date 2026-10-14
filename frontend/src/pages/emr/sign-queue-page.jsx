import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clinicalApi } from '../../services/api-client';

export default function SignQueuePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [queueItems, setQueueItems] = useState([]);

  useEffect(() => {
    loadQueue();
  }, []);

  async function loadQueue() {
    setLoading(true);
    setError(null);
    try {
      const res = await clinicalApi.getSignQueue();
      setQueueItems(res.data || []);
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Lỗi nạp hàng đợi ký số.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRetry(queueId) {
    setError(null);
    setSuccessMsg(null);
    try {
      await clinicalApi.retrySignQueue(queueId);
      setSuccessMsg('Ký bù thành công! Bản ghi EMR đã được ký số hợp lệ và loại khỏi hàng đợi.');
      await loadQueue();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Lỗi xử lý ký bù.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            Hàng đợi ký số EMR (SignQueue - AT-13)
            <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-amber-100 text-amber-800">
              {queueItems.length} yêu cầu chờ ký
            </span>
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Quản lý các hồ sơ bệnh án gặp sự cố rớt mạng hoặc gián đoạn khi ký số. Hệ thống không tạo chữ ký giả mạo và yêu cầu ký bù có kiểm toán.
          </p>
        </div>

        <button
          onClick={loadQueue}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
        >
          🔄 Làm mới danh sách
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b bg-slate-100 text-xs text-slate-600 uppercase">
                <th className="p-4">Hồ sơ EMR</th>
                <th className="p-4">Bác sĩ yêu cầu</th>
                <th className="p-4">Thời gian tạo</th>
                <th className="p-4">Hạn xử lý (Due At)</th>
                <th className="p-4">Nguyên nhân gián đoạn</th>
                <th className="p-4 text-right">Thao tác ký bù (AT-13)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">Đang tải hàng đợi...</td>
                </tr>
              ) : queueItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                    🎉 Tuyệt vời! Hàng đợi ký số trống. Tất cả hồ sơ EMR đều đã được ký số trực tiếp thành công.
                  </td>
                </tr>
              ) : (
                queueItems.map((item) => (
                  <tr key={item.signQueueId} className="hover:bg-slate-50">
                    <td className="p-4">
                      <span className="font-semibold text-slate-900 block">
                        Mã lượt khám: {item.emrRecord?.visit?.visitCode || 'Lượt khám'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        EMR ID: {item.emrRecordId?.substring(0, 8)}...
                      </span>
                    </td>
                    <td className="p-4 font-medium text-slate-800">
                      {item.requester?.displayName || 'Bác sĩ'}
                    </td>
                    <td className="p-4 text-xs text-slate-600">
                      {new Date(item.requestedAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4 text-xs text-amber-700 font-semibold">
                      {new Date(item.dueAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="p-4 text-xs text-slate-600 max-w-xs">
                      {item.failureReason || 'Mất kết nối mạng khi ký số.'}
                    </td>
                    <td className="p-4 text-right space-x-2">
                      <button
                        onClick={() => navigate(`/visits/${item.emrRecord?.visitId}/emr`)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                      >
                        Xem EMR
                      </button>
                      <button
                        onClick={() => handleRetry(item.signQueueId)}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold shadow-sm"
                      >
                        Ký bù ngay
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
