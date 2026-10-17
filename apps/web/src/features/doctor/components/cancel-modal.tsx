import { useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { cancelExaminationApi } from '../doctor-api'
import { useDoctor } from '../doctor-context'
import { inputClass, labelClass } from '../../reception/reception-ui'

export function CancelModal() {
  const { currentExam, isCancelModalOpen, dispatch } = useDoctor()
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isCancelModalOpen || !currentExam) return null

  const handleCancel = async () => {
    if (!reason.trim()) {
      setErrorMessage('Bắt buộc phải nhập lý do khi ngừng khám / từ chối.')
      return
    }

    try {
      setIsSubmitting(true)
      setErrorMessage(null)
      const updatedExam = await cancelExaminationApi(currentExam.id, reason.trim())
      dispatch({ type: 'SET_CURRENT_EXAM', exam: updatedExam })
      dispatch({ type: 'SET_CANCEL_MODAL', open: false })
      dispatch({ type: 'SET_STEP', step: 4 })
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Không thể ngừng khám. Vui lòng thử lại.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-slate-950/5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-red-100 text-red-600">
              <AlertTriangle className="size-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900">Từ chối / Ngừng khám</h3>
              <p className="text-xs text-slate-500">Ca khám #{currentExam.code} - {currentExam.patient.fullName}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_CANCEL_MODAL', open: false })}
            className="grid size-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="my-5 space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-800 leading-relaxed">
            <p className="font-bold mb-1">Quy tắc nghiệp vụ khi Ngừng khám:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Doanh thu dịch vụ gửi sang kế toán sẽ được ghi nhận bằng <strong>0 VNĐ</strong>.</li>
              <li>VTYT thực tế đã sử dụng (nếu có) vẫn được <strong>trừ kho</strong> và ghi nhận chi phí vốn.</li>
              <li>Hồ sơ ca khám sẽ bị <strong>khóa lại</strong> và không thể tiếp tục chỉ định thêm.</li>
            </ul>
          </div>

          <div>
            <label htmlFor="cancel-reason" className={labelClass}>
              Lý do ngừng khám / từ chối <span className="text-red-500">*</span>
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                if (errorMessage) setErrorMessage(null)
              }}
              placeholder="Ví dụ: Bệnh nhân có dấu hiệu tăng huyết áp khẩn cấp, cần chuyển viện chuyên khoa..."
              className={inputClass + ' h-auto py-2.5 resize-none'}
              autoFocus
            />
          </div>

          {errorMessage && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              {errorMessage}
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => dispatch({ type: 'SET_CANCEL_MODAL', open: false })}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Đóng
          </button>
          <button
            type="button"
            disabled={isSubmitting || !reason.trim()}
            onClick={handleCancel}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition disabled:opacity-50"
          >
            {isSubmitting ? 'Đang xử lý...' : 'Xác nhận Ngừng khám'}
          </button>
        </div>
      </div>
    </div>
  )
}
