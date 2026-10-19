import { useEffect, useState } from 'react';
import { Check, Info, Save } from 'lucide-react';
import { personnelApi } from './personnel-api';
import type { WorkingHoursConfig } from './personnel-types';
import { Card, formatDate, inputClass, Message, PageHeading, PaginationBar } from './personnel-ui';

export function WorkingHoursPage() {
  const [config, setConfig] = useState<WorkingHoursConfig | null>(null);
  const [history, setHistory] = useState<WorkingHoursConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Form state
  const [form, setForm] = useState({
    startTime: '09:00',
    endTime: '18:00',
    splitTime: '12:00',
    effectiveDate: new Date().toISOString().split('T')[0],
    note: '',
  });

  // History pagination (strictly 10 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    try {
      setLoading(true);
      const [currentConfig, historyList] = await Promise.all([
        personnelApi.getWorkingHoursConfig(),
        personnelApi.getWorkingHoursHistory(),
      ]);

      setConfig(currentConfig);
      setHistory(historyList);

      if (currentConfig) {
        setForm({
          startTime: currentConfig.startTime || '09:00',
          endTime: currentConfig.endTime || '18:00',
          splitTime: currentConfig.splitTime || '12:00',
          effectiveDate: new Date().toISOString().split('T')[0],
          note: currentConfig.note || '',
        });
      }
    } catch (err: any) {
      setMessage({ text: err.message || 'Không thể tải cấu hình thời gian làm việc', error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // Frontend validation: S < M < E
    const s = form.startTime;
    const m = form.splitTime;
    const eTime = form.endTime;

    if (s >= m) {
      setMessage({
        text: 'Lỗi cấu hình: Giờ vào làm phải trước Mốc phân buổi (Giờ vào làm < Mốc phân buổi).',
        error: true,
      });
      return;
    }

    if (m >= eTime) {
      setMessage({
        text: 'Lỗi cấu hình: Mốc phân buổi phải trước Giờ tan làm (Mốc phân buổi < Giờ tan làm).',
        error: true,
      });
      return;
    }

    // Effective date cannot be in the past
    const today = new Date().toISOString().split('T')[0];
    if (form.effectiveDate < today) {
      setMessage({
        text: 'Lỗi: Ngày hiệu lực không được ở trong quá khứ.',
        error: true,
      });
      return;
    }

    try {
      setSaving(true);
      await personnelApi.saveWorkingHoursConfig({
        startTime: form.startTime,
        endTime: form.endTime,
        splitTime: form.splitTime,
        effectiveDate: form.effectiveDate,
        note: form.note || undefined,
      });

      setMessage({ text: 'Cập nhật cấu hình thời gian làm việc thành công!' });
      await loadData();
    } catch (err: any) {
      setMessage({ text: err.message || 'Lỗi khi lưu cấu hình', error: true });
    } finally {
      setSaving(false);
    }
  };

  const paginatedHistory = history.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Cấu hình thời gian làm việc"
        description="Thiết lập 3 mốc chuẩn (Giờ vào, Giờ tan, Mốc phân buổi) dùng để tự động tính đi trễ, tăng ca và số buổi/công toàn viện."
      />

      {message && <Message value={message.text} error={message.error} />}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column: Form Configuration */}
        <div className="lg:col-span-2">
          <Card className="space-y-6">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Thiết lập 3 mốc thời gian làm việc
            </h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Guidance Info Alert */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4 text-xs text-indigo-900 leading-relaxed">
                <div className="flex items-start gap-2.5">
                  <Info className="size-4 shrink-0 text-indigo-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-indigo-950">Quy tắc tính toán cốt lõi:</p>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4">
                      <li>
                        <strong>Ràng buộc thứ tự:</strong> Giờ vào làm &lt; Mốc phân buổi &lt; Giờ tan làm.
                      </li>
                      <li>
                        <strong>Đi trễ (phút):</strong> Check-in sau giờ vào làm (chỉ tính cho người có mặt buổi sáng, làm tròn xuống phút).
                      </li>
                      <li>
                        <strong>Tăng ca (giờ):</strong> Check-out sau giờ tan làm hoặc sau giờ check-in (làm tròn 2 chữ số thập phân).
                      </li>
                      <li>
                        <strong>Phân buổi:</strong> Check-in trước mốc phân buổi = Có mặt sáng (0,5 công); Check-out sau mốc phân buổi = Có mặt chiều (0,5 công).
                      </li>
                      <li>
                        <strong>Bảo lưu lịch sử:</strong> Cấu hình mới áp dụng từ <em>Ngày hiệu lực</em>, toàn bộ ngày công cũ giữ nguyên bản chụp cấu hình cũ.
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* 3 Milestones */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <label className="block text-xs font-bold text-slate-700">
                    1. Giờ vào làm (S) <span className="text-rose-500">*</span>
                  </label>
                  <p className="mt-0.5 text-[11px] text-slate-500">Đến sau mốc này là đi trễ</p>
                  <input
                    type="time"
                    required
                    value={form.startTime}
                    onChange={(e) => setForm({ ...form, startTime: e.target.value })}
                    className={`mt-2 font-bold ${inputClass}`}
                  />
                  <div className="mt-2 text-[11px] text-emerald-600 font-medium">Mặc định: 09:00</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <label className="block text-xs font-bold text-slate-700">
                    2. Mốc phân buổi (M) <span className="text-rose-500">*</span>
                  </label>
                  <p className="mt-0.5 text-[11px] text-slate-500">Trước: Sáng / Sau: Chiều</p>
                  <input
                    type="time"
                    required
                    value={form.splitTime}
                    onChange={(e) => setForm({ ...form, splitTime: e.target.value })}
                    className={`mt-2 font-bold ${inputClass}`}
                  />
                  <div className="mt-2 text-[11px] text-indigo-600 font-medium">Mặc định: 12:00 trưa</div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                  <label className="block text-xs font-bold text-slate-700">
                    3. Giờ tan làm (E) <span className="text-rose-500">*</span>
                  </label>
                  <p className="mt-0.5 text-[11px] text-slate-500">Về sau mốc này là tăng ca</p>
                  <input
                    type="time"
                    required
                    value={form.endTime}
                    onChange={(e) => setForm({ ...form, endTime: e.target.value })}
                    className={`mt-2 font-bold ${inputClass}`}
                  />
                  <div className="mt-2 text-[11px] text-amber-600 font-medium">Mặc định: 18:00</div>
                </div>
              </div>

              {/* Effective Date & Notes */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Ngày hiệu lực <span className="text-rose-500">*</span>
                  </label>
                  <p className="text-[11px] text-slate-500">Không được ở trong quá khứ</p>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={form.effectiveDate}
                    onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
                    className={`mt-1.5 ${inputClass}`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">Ghi chú lý do thay đổi</label>
                  <p className="text-[11px] text-slate-500">Lưu vết audit log</p>
                  <input
                    type="text"
                    placeholder="VD: Điều chỉnh giờ làm việc mùa đông theo thông báo..."
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                    className={`mt-1.5 ${inputClass}`}
                  />
                </div>
              </div>

              {/* Overtime Pay Rates and Work Schedule Callout (Article 98 Labor Code 2019) */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-950">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200/80 pb-2.5">
                  <div>
                    <p className="font-bold uppercase tracking-wider text-amber-900">
                      Mặc định thời gian làm việc & Tỷ lệ làm thêm giờ tối thiểu (Điều 98 BLLĐ 2019)
                    </p>
                    <p className="text-[11px] text-amber-800/90 mt-0.5">
                      Thời gian làm việc bình thường: <strong>Thứ 2 đến Thứ 7</strong> (Chủ Nhật là ngày nghỉ hằng tuần)
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-200 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                    Chuẩn 26 công / tháng
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-xs">
                    <p className="font-bold text-slate-800">1. Ngày thường (T2 - T7)</p>
                    <p className="mt-1 font-mono text-base font-black text-amber-700">≥ 150%</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Làm thêm sau giờ tan làm (18:00)</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-xs">
                    <p className="font-bold text-slate-800">2. Ngày nghỉ tuần (Chủ Nhật)</p>
                    <p className="mt-1 font-mono text-base font-black text-amber-700">≥ 200%</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Giờ làm thêm vào ngày Chủ Nhật</p>
                  </div>
                  <div className="rounded-xl border border-amber-200 bg-white p-3 shadow-xs">
                    <p className="font-bold text-slate-800">3. Ngày lễ, Tết, nghỉ có lương</p>
                    <p className="mt-1 font-mono text-base font-black text-amber-700">≥ 300%</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Chưa kể lương ngày lễ theo ngày</p>
                  </div>
                </div>

                <div className="mt-3 rounded-lg bg-amber-100/70 p-2.5 font-mono text-[11px] text-amber-900 leading-relaxed">
                  <strong>Công thức tính:</strong> Tiền lương làm thêm giờ = (Lương thỏa thuận ÷ 26 ÷ 8) × Hệ số (150% / 200% / 300%) × Số giờ làm thêm
                </div>
              </div>

              <div className="flex justify-end border-t border-slate-100 pt-4">
                <button
                  type="submit"
                  disabled={saving || loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="size-4" />
                  <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình thời gian làm việc'}</span>
                </button>
              </div>
            </form>
          </Card>
        </div>

        {/* Right Column: Active Snapshot Summary */}
        <div>
          <Card className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
              Cấu hình đang áp dụng
            </h2>
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="flex items-center gap-2 text-emerald-800">
                  <Check className="size-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider">Trạng thái: Đang hiệu lực</span>
                </div>
                <div className="mt-3 space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                    <span className="text-slate-500">Giờ vào làm (S):</span>
                    <span className="font-bold text-slate-900">{config?.startTime || '09:00'}</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                    <span className="text-slate-500">Mốc phân buổi (M):</span>
                    <span className="font-bold text-slate-900">{config?.splitTime || '12:00'}</span>
                  </div>
                  <div className="flex justify-between border-b border-emerald-100 pb-1.5">
                    <span className="text-slate-500">Giờ tan làm (E):</span>
                    <span className="font-bold text-slate-900">{config?.endTime || '18:00'}</span>
                  </div>
                  <div className="flex justify-between pt-1">
                    <span className="text-slate-500">Ngày hiệu lực:</span>
                    <span className="font-semibold text-indigo-700">
                      {config?.effectiveDate ? formatDate(config.effectiveDate) : '01/01/2026'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-xs font-bold text-slate-800">Phạm vi áp dụng:</p>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Áp dụng thống nhất cho toàn bộ nhân viên và phòng khám trực thuộc DentalKhoi.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* History and Audit Log Table */}
      <Card className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 border-b border-slate-100 pb-3">
          Lịch sử thay đổi cấu hình thời gian làm việc
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Ngày hiệu lực</th>
                <th className="px-4 py-3">Giờ vào làm (S)</th>
                <th className="px-4 py-3">Mốc phân buổi (M)</th>
                <th className="px-4 py-3">Giờ tan làm (E)</th>
                <th className="px-4 py-3">Ghi chú</th>
                <th className="px-4 py-3">Cập nhật lúc</th>
                <th className="px-4 py-3 text-center">Số lượt sửa đổi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedHistory.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Chưa có lịch sử thay đổi cấu hình.
                  </td>
                </tr>
              ) : (
                paginatedHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-bold text-indigo-700">{formatDate(item.effectiveDate)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.startTime}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.splitTime}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{item.endTime}</td>
                    <td className="px-4 py-3 text-slate-600">{item.note || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{formatDate(item.updatedAt || item.createdAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                        {item.audits?.length || 1} bản ghi
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {history.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <PaginationBar
              currentPage={currentPage}
              totalItems={history.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </Card>
    </div>
  );
}
