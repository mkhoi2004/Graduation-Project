import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, LogIn, LogOut, Loader2 } from 'lucide-react';
import type { AuthSession } from '@/lib/auth-session';
import { personnelApi } from './personnel-api';
import type { AttendanceRecord } from './personnel-types';

export function AttendanceHeaderWidget({ session }: { session?: AuthSession }) {
  const [record, setRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [showDoctorWarning, setShowDoctorWarning] = useState<boolean>(false);
  const [warningText, setWarningText] = useState<string>('');

  const loadStatus = async () => {
    try {
      setLoading(true);
      const res = await personnelApi.getAttendanceStatus();
      if (res.record) {
        setRecord(res.record);
      } else {
        setRecord(null);
      }
    } catch (err: any) {
      console.warn('Could not load attendance status:', err?.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleCheckIn = async () => {
    try {
      setActionLoading(true);
      const res = await personnelApi.checkIn();
      setToastMessage({ text: res.message, error: false });
      if (res.conflictWarning) {
        setTimeout(() => {
          alert(`Lưu ý: ${res.conflictWarning}`);
        }, 300);
      }
      await loadStatus();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Lỗi khi Check-in', error: true });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async (confirmExam = false) => {
    try {
      setActionLoading(true);
      const res = await personnelApi.checkOut({ confirmActiveExam: confirmExam });
      if (res.hasActiveExamWarning && !confirmExam) {
        setWarningText(res.message);
        setShowDoctorWarning(true);
        setActionLoading(false);
        return;
      }
      setShowDoctorWarning(false);
      setToastMessage({ text: res.message, error: false });
      await loadStatus();
    } catch (err: any) {
      setToastMessage({ text: err.message || 'Lỗi khi Check-out', error: true });
    } finally {
      setActionLoading(false);
    }
  };

  const isCheckedIn = Boolean(record?.checkInTime);
  const isCheckedOut = Boolean(record?.checkOutTime);

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Status Indicator */}
        <div
          className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-xs font-semibold transition ${
            isCheckedOut
              ? 'border border-indigo-200 bg-indigo-50 text-indigo-700'
              : isCheckedIn
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border border-slate-200 bg-slate-100 text-slate-600'
          }`}
          title={
            session?.user?.fullName
              ? `${session.user.fullName}: ${
                  isCheckedOut
                    ? `Đã Check-out lúc ${record?.checkOutTime}`
                    : isCheckedIn
                    ? `Đã Check-in lúc ${record?.checkInTime}`
                    : 'Chưa chấm công hôm nay'
                }`
              : isCheckedOut
              ? `Đã Check-out lúc ${record?.checkOutTime}`
              : isCheckedIn
              ? `Đã Check-in lúc ${record?.checkInTime}`
              : 'Chưa chấm công hôm nay'
          }
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin text-slate-400" />
          ) : isCheckedOut ? (
            <CheckCircle2 className="size-3.5 text-indigo-600" />
          ) : isCheckedIn ? (
            <Clock className="size-3.5 text-emerald-600" />
          ) : (
            <Clock className="size-3.5 text-slate-400" />
          )}

          <span className="hidden sm:inline">
            {isCheckedOut
              ? `Đã Check-out lúc ${record?.checkOutTime}`
              : isCheckedIn
              ? `Đã Check-in lúc ${record?.checkInTime}`
              : 'Chưa Check-in'}
          </span>
          <span className="inline sm:hidden">
            {isCheckedOut
              ? `Out: ${record?.checkOutTime}`
              : isCheckedIn
              ? `In: ${record?.checkInTime}`
              : 'Chưa In'}
          </span>
        </div>

        {/* Action Button: Check-in or Check-out */}
        {!isCheckedIn ? (
          <button
            type="button"
            disabled={actionLoading || loading}
            onClick={handleCheckIn}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500 bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            title="Bấm để ghi nhận giờ bắt đầu làm việc từ máy chủ"
          >
            {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <LogIn className="size-3.5" />}
            <span>Check-in</span>
          </button>
        ) : !isCheckedOut ? (
          <button
            type="button"
            disabled={actionLoading || loading}
            onClick={() => handleCheckOut(false)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-amber-500 bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-amber-700 active:scale-95 disabled:opacity-50"
            title="Bấm để ghi nhận giờ kết thúc làm việc từ máy chủ"
          >
            {actionLoading ? <Loader2 className="size-3.5 animate-spin" /> : <LogOut className="size-3.5" />}
            <span>Check-out</span>
          </button>
        ) : (
          <span
            className="hidden sm:inline-flex items-center gap-1 text-[11px] font-medium text-slate-400"
            title="Bạn đã hoàn thành đủ lượt Check-in và Check-out hôm nay"
          >
            <CheckCircle2 className="size-3 text-emerald-500" />
            Đã xong công
          </span>
        )}
      </div>

      {/* Doctor Active Exam Warning Dialog */}
      {showDoctorWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95">
            <div className="flex items-start gap-3">
              <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-600">
                <AlertCircle className="size-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Cảnh báo Check-out Bác sĩ</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                  {warningText || 'Bác sĩ hiện đang có ca bệnh ở trạng thái "Đang khám" chưa Ghi sổ.'}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Hệ thống không chặn cứng nhưng khuyến nghị bác sĩ hoàn tất hoặc chuyển giao ca khám trước khi rời ca.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDoctorWarning(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Tiếp tục khám
              </button>
              <button
                type="button"
                onClick={() => handleCheckOut(true)}
                className="rounded-xl border border-amber-600 bg-amber-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-amber-700"
              >
                Xác nhận Check-out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5">
          <div
            className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-semibold shadow-lg transition ${
              toastMessage.error
                ? 'border border-rose-200 bg-rose-50 text-rose-800'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-800'
            }`}
          >
            {toastMessage.error ? <AlertCircle className="size-4 shrink-0" /> : <CheckCircle2 className="size-4 shrink-0" />}
            <span>{toastMessage.text}</span>
            <button
              type="button"
              onClick={() => setToastMessage(null)}
              className="ml-3 text-xs text-slate-400 hover:text-slate-700"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  );
}
