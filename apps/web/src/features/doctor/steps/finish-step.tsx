import { useState } from 'react'
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Lock,
  Unlock,
} from 'lucide-react'
import { completeExaminationApi, unlockExaminationApi } from '../doctor-api'
import { useDoctor } from '../doctor-context'
import { PatientBanner } from '../components/patient-banner'
import { PageTitle, inputClass, labelClass } from '../../reception/reception-ui'
import { getSession } from '@/lib/auth-session'

export function FinishStep() {
  const { currentExam, dispatch, refreshAll } = useDoctor()
  const [completing, setCompleting] = useState(false)
  const [unlocking, setUnlocking] = useState(false)
  const [showUnlockModal, setShowUnlockModal] = useState(false)
  const [unlockReason, setUnlockReason] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const session = getSession()
  const isAdmin = session?.user.roleName === 'ADMIN' || session?.user.roleName === 'QUAN_TRI'

  if (!currentExam) {
    return (
      <div>
        <PageTitle
          eyebrow="Bước 4 / Phân hệ Bác sĩ"
          title="Ghi sổ & Hoàn thành ca khám"
          description="Vui lòng gọi hoặc chọn một bệnh nhân từ danh sách chờ trước khi thực hiện bước này."
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Chưa có ca khám nào đang mở. Vui lòng quay lại Bước 1 để gọi bệnh nhân.
        </div>
      </div>
    )
  }

  const isCompleted = currentExam.status === 'COMPLETED'
  const isCancelled = currentExam.status === 'CANCELLED'
  const isFinished = isCompleted || isCancelled

  const handleComplete = async () => {
    try {
      setCompleting(true)
      setErrorMessage(null)
      const updated = await completeExaminationApi(currentExam.id)
      dispatch({ type: 'SET_CURRENT_EXAM', exam: updated })
      setSuccessMessage('Đã Ghi sổ hoàn thành ca khám thành công! Hồ sơ đã được khóa.')
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Không thể ghi sổ hoàn thành ca khám.')
    } finally {
      setCompleting(false)
    }
  }

  const handleUnlock = async () => {
    if (!unlockReason.trim()) {
      setErrorMessage('Bắt buộc phải nhập lý do khi mở khóa hồ sơ.')
      return
    }

    try {
      setUnlocking(true)
      setErrorMessage(null)
      await unlockExaminationApi(currentExam.id, unlockReason.trim())
      setShowUnlockModal(false)
      setUnlockReason('')
      await refreshAll()
      setSuccessMessage('Đã mở khóa hồ sơ thành công!')
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Không thể mở khóa hồ sơ.')
    } finally {
      setUnlocking(false)
    }
  }

  return (
    <div>
      <PageTitle
        eyebrow="Bước 4 / Phân hệ Bác sĩ"
        title="Ghi sổ & Hoàn tất ca khám"
        description="Kiểm tra lại toàn bộ dữ liệu điều trị trước khi Ghi sổ. Sau khi ghi sổ, hồ sơ sẽ được khóa lại, tồn kho vật tư được trừ chính thức và doanh thu/chi phí được chuyển sang kế toán."
        action={
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_STEP', step: 1 })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <ArrowLeft className="size-3.5" />
              <span>Quay lại Hàng đợi (Bước 1)</span>
            </button>

            {!isFinished && (
              <button
                type="button"
                disabled={completing}
                onClick={handleComplete}
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:opacity-50"
              >
                <FileCheck2 className="size-4" />
                {completing ? 'Đang ghi sổ...' : 'Ghi sổ (Hoàn thành ca khám)'}
              </button>
            )}

            {isFinished && currentExam.isLocked && isAdmin && (
              <button
                type="button"
                onClick={() => setShowUnlockModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
              >
                <Unlock className="size-3.5" />
                Mở khóa hồ sơ (Admin)
              </button>
            )}
          </div>
        }
      />

      <PatientBanner exam={currentExam} />

      {successMessage && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="size-5 text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-6 flex items-center gap-2.5 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-700">
          <AlertCircle className="size-5 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Status Notice */}
      {isCompleted && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-emerald-600 text-white font-bold text-xs shrink-0">
              <CheckCircle2 className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-950">
                Ca khám #{currentExam.code} đã được Ghi sổ Hoàn thành
              </p>
              <p className="text-xs text-emerald-700">
                Thời gian kết thúc: {currentExam.completedAt ? new Date(currentExam.completedAt).toLocaleString('vi-VN') : '—'}. Dữ liệu đã chuyển sang kế toán & trừ kho thành công.
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800 shrink-0">
            <Lock className="size-3.5" />
            Đã khóa hồ sơ
          </span>
        </div>
      )}

      {isCancelled && (
        <div className="mb-6 flex items-center justify-between rounded-2xl border border-red-200 bg-red-50/70 p-4">
          <div className="flex items-center gap-3">
            <div className="grid size-9 place-items-center rounded-xl bg-red-600 text-white font-bold text-xs shrink-0">
              <AlertCircle className="size-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-red-950">
                Ca khám #{currentExam.code} đã Ngừng khám / Từ chối
              </p>
              <p className="text-xs text-red-700">
                Lý do: <strong>{currentExam.cancelReason || 'Không có lý do'}</strong>
              </p>
            </div>
          </div>
          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-bold text-red-800 shrink-0">
            Đã kết thúc
          </span>
        </div>
      )}

      {/* Comprehensive Summary Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Card 1: Dịch vụ & Vật tư */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
              1. Dịch vụ chỉ định từ quầy tiếp nhận
            </h3>
            {currentExam.intake.services.length === 0 ? (
              <p className="text-xs text-slate-400">Không có dịch vụ chỉ định.</p>
            ) : (
              <div className="space-y-1.5">
                {currentExam.intake.services.map((s) => (
                  <div
                    key={s.code}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-slate-800">{s.name}</span>
                    <span className="text-slate-500">Số lượng: <strong>{s.quantity} {s.unit ?? ''}</strong></span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
              2. Vật tư y tế tiêu hao (VTYT) đã dùng
            </h3>
            {currentExam.supplies.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa ghi nhận vật tư tiêu hao.</p>
            ) : (
              <div className="space-y-1.5">
                {currentExam.supplies.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                  >
                    <span className="font-semibold text-slate-800">{s.supplyName}</span>
                    <span className="text-[#5546e8] font-bold">
                      {s.quantityInBaseUnit} {s.baseUnit}
                      {s.conversionUnitUsed && ` (${s.conversionUnitUsed})`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Kết quả chuyên môn */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2 mb-3">
            3. Kết luận chuyên môn & Dặn dò
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Tóm tắt kết quả khám
              </p>
              <p className="mt-1 text-slate-800 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {currentExam.result?.summary || 'Chưa cập nhật kết quả.'}
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Phương pháp điều trị
              </p>
              <p className="mt-1 text-slate-800 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {currentExam.result?.treatmentMethod || 'Chưa cập nhật phương pháp.'}
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Hướng điều trị tiếp theo
              </p>
              <p className="mt-1 text-slate-800 font-medium leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {currentExam.result?.treatmentOrientation || 'Chưa cập nhật hướng điều trị.'}
              </p>
            </div>

            <div>
              <p className="font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                Ngày hẹn tái khám
              </p>
              <p className="mt-1 text-slate-800 font-bold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                {currentExam.result?.nextAppointmentDate || 'Không hẹn tái khám'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unlock Examination Modal for Admin */}
      {showUnlockModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="font-bold text-slate-900 text-base mb-1">
              Mở khóa hồ sơ ca khám #{currentExam.code}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Thao tác này dành riêng cho Admin / Bác sĩ trưởng khoa. Hành động sẽ được ghi nhận vào nhật ký kiểm toán hệ thống.
            </p>

            <div className="mb-4">
              <label className={labelClass}>Lý do mở khóa <span className="text-red-500">*</span></label>
              <textarea
                rows={3}
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="Ví dụ: Bác sĩ yêu cầu bổ sung thông tin theo chỉ định của hội đồng chuyên môn..."
                className={inputClass + ' h-auto py-2.5 resize-none'}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setShowUnlockModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={unlocking || !unlockReason.trim()}
                onClick={handleUnlock}
                className="rounded-xl bg-amber-600 px-4 py-2 text-xs font-bold text-white hover:bg-amber-700 disabled:opacity-50"
              >
                {unlocking ? 'Đang mở khóa...' : 'Xác nhận Mở khóa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
