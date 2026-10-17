import { useState } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  FileSpreadsheet,
  History,
  Printer,
  Save,
} from 'lucide-react'
import { recordPrintHistoryApi, updateResultApi, fetchExaminationById } from '../doctor-api'
import { useDoctor } from '../doctor-context'
import { downloadSummaryWorkbook } from '../summary-excel'
import { PatientBanner } from '../components/patient-banner'
import { PageTitle, inputClass, labelClass } from '../../reception/reception-ui'

export function SummaryStep() {
  const { currentExam, dispatch } = useDoctor()

  const [summary, setSummary] = useState('')
  const [treatmentMethod, setTreatmentMethod] = useState('')
  const [treatmentOrientation, setTreatmentOrientation] = useState('')
  const [nextAppointmentDate, setNextAppointmentDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const [lastExamId, setLastExamId] = useState<number | null>(null)

  if (currentExam && currentExam.id !== lastExamId) {
    setLastExamId(currentExam.id)
    setSummary(currentExam.result?.summary ?? '')
    setTreatmentMethod(currentExam.result?.treatmentMethod ?? '')
    setTreatmentOrientation(currentExam.result?.treatmentOrientation ?? '')
    setNextAppointmentDate(currentExam.result?.nextAppointmentDate ?? '')
  }

  if (!currentExam) {
    return (
      <div>
        <PageTitle
          eyebrow="Bước 3 / Phân hệ Bác sĩ"
          title="Tóm tắt kết quả & Kết luận chuyên môn"
          description="Vui lòng gọi hoặc chọn một bệnh nhân từ danh sách chờ trước khi thực hiện bước này."
        />
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
          Chưa có ca khám nào đang mở. Vui lòng quay lại Bước 1 để gọi bệnh nhân.
        </div>
      </div>
    )
  }

  const isLocked = currentExam.isLocked || currentExam.status !== 'IN_PROGRESS'

  const handleSaveResult = async () => {
    if (isLocked) return

    if (!summary.trim()) {
      setErrorMessage('Vui lòng nhập tóm tắt kết quả khám.')
      return
    }
    if (!treatmentMethod.trim()) {
      setErrorMessage('Vui lòng nhập phương pháp điều trị.')
      return
    }
    if (!treatmentOrientation.trim()) {
      setErrorMessage('Vui lòng nhập hướng điều trị tiếp theo.')
      return
    }

    try {
      setSaving(true)
      setErrorMessage(null)
      setSaveSuccess(false)

      await updateResultApi(currentExam.id, {
        summary: summary.trim(),
        treatmentMethod: treatmentMethod.trim(),
        treatmentOrientation: treatmentOrientation.trim(),
        nextAppointmentDate: nextAppointmentDate ? nextAppointmentDate : undefined,
      })

      const refreshed = await fetchExaminationById(currentExam.id)
      dispatch({ type: 'SET_CURRENT_EXAM', exam: refreshed })
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Không thể lưu kết quả điều trị.')
    } finally {
      setSaving(false)
    }
  }

  const handlePrintSummary = async () => {
    try {
      setPrinting(true)
      setErrorMessage(null)

      // Ensure latest inputs are included in export
      const examForPrint = {
        ...currentExam,
        result: {
          summary: summary || currentExam.result?.summary || 'Chưa cập nhật',
          treatmentMethod: treatmentMethod || currentExam.result?.treatmentMethod || 'Chưa cập nhật',
          treatmentOrientation: treatmentOrientation || currentExam.result?.treatmentOrientation || 'Chưa cập nhật',
          nextAppointmentDate: nextAppointmentDate || currentExam.result?.nextAppointmentDate,
        },
      }

      await downloadSummaryWorkbook(examForPrint, undefined, async () => {
        // Record print history in DB
        await recordPrintHistoryApi(currentExam.id)
        const refreshed = await fetchExaminationById(currentExam.id)
        dispatch({ type: 'SET_CURRENT_EXAM', exam: refreshed })
      })
    } catch (err: any) {
      setErrorMessage(err.message ?? 'Không thể in phiếu kết quả tổng kết.')
    } finally {
      setPrinting(false)
    }
  }

  return (
    <div>
      <PageTitle
        eyebrow="Bước 3 / Phân hệ Bác sĩ"
        title="Tóm tắt kết quả & Kết luận chuyên môn"
        description="Ghi nhận tóm tắt kết quả khám, phương pháp điều trị, hướng điều trị và hẹn ngày tái khám. Cho phép in Phiếu Kết quả tổng kết gửi cho bệnh nhân."
        action={
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={printing}
              onClick={handlePrintSummary}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
              title="Xuất file Excel Phiếu Kết quả tổng kết điều trị"
            >
              <Printer className="size-4 text-[#5546e8]" />
              {printing ? 'Đang xuất phiếu...' : 'In Phiếu Kết quả tổng kết'}
            </button>
            <button
              type="button"
              disabled={isLocked || saving}
              onClick={handleSaveResult}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#dedaff] bg-[#f0efff] px-4 py-2.5 text-xs font-semibold text-[#5546e8] shadow-sm transition hover:bg-[#e4e1ff] disabled:opacity-50"
            >
              <Save className="size-4" />
              {saving ? 'Đang lưu...' : 'Lưu kết quả'}
            </button>
            <button
              type="button"
              onClick={() => dispatch({ type: 'SET_STEP', step: 4 })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#5546e8] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#483ad3]"
            >
              <span>Tiếp sang Ghi sổ (Bước 4)</span>
              <ArrowRight className="size-3.5" />
            </button>
          </div>
        }
      />

      <PatientBanner exam={currentExam} />

      {saveSuccess && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span>Đã lưu thành công thông tin tóm tắt kết quả điều trị!</span>
        </div>
      )}

      {errorMessage && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-700">
          <AlertCircle className="size-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Side: Summary Clinical Form */}
        <div className="lg:col-span-8">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5">
            <div>
              <label htmlFor="summary" className={labelClass}>
                1. Tóm tắt kết quả khám lâm sàng & cận lâm sàng <span className="text-red-500">*</span>
              </label>
              <textarea
                id="summary"
                rows={3}
                disabled={isLocked}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Ví dụ: Răng 46 sâu ngà sâu, tủy còn sống; lợi sưng nướu nhẹ quanh viền răng..."
                className={inputClass + ' h-auto py-2.5 resize-none'}
              />
            </div>

            <div>
              <label htmlFor="treatmentMethod" className={labelClass}>
                2. Phương pháp điều trị đã thực hiện <span className="text-red-500">*</span>
              </label>
              <textarea
                id="treatmentMethod"
                rows={3}
                disabled={isLocked}
                value={treatmentMethod}
                onChange={(e) => setTreatmentMethod(e.target.value)}
                placeholder="Ví dụ: Làm sạch xoang sâu, đặt thuốc lót che tủy Dycal, trám xoang loại II bằng Composite 3M..."
                className={inputClass + ' h-auto py-2.5 resize-none'}
              />
            </div>

            <div>
              <label htmlFor="treatmentOrientation" className={labelClass}>
                3. Hướng điều trị tiếp theo & Lời dặn bệnh nhân <span className="text-red-500">*</span>
              </label>
              <textarea
                id="treatmentOrientation"
                rows={3}
                disabled={isLocked}
                value={treatmentOrientation}
                onChange={(e) => setTreatmentOrientation(e.target.value)}
                placeholder="Ví dụ: Tránh nhai đồ cứng 24h đầu; uống thuốc theo đơn nếu đau nhẹ; vệ sinh răng miệng bằng chỉ nha khoa..."
                className={inputClass + ' h-auto py-2.5 resize-none'}
              />
            </div>

            <div className="max-w-xs">
              <label htmlFor="nextAppointmentDate" className={labelClass}>
                4. Ngày hẹn tái khám (nếu có)
              </label>
              <div className="relative">
                <input
                  type="date"
                  id="nextAppointmentDate"
                  disabled={isLocked}
                  value={nextAppointmentDate}
                  onChange={(e) => setNextAppointmentDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Lưu ý: Ngày hẹn chỉ in trên phiếu kết quả, không tạo lịch tiếp nhận tại quầy.
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                disabled={printing}
                onClick={handlePrintSummary}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                <span>Xem & In Phiếu Kết quả</span>
              </button>

              <button
                type="button"
                disabled={isLocked || saving}
                onClick={handleSaveResult}
                className="rounded-xl bg-[#5546e8] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#483ad3] transition disabled:opacity-50 inline-flex items-center gap-1.5"
              >
                <Save className="size-4" />
                {saving ? 'Đang lưu...' : 'Lưu kết quả điều trị'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Print History Panel */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-3">
              <History className="size-4 text-[#5546e8]" />
              Lịch sử in phiếu kết quả
            </h3>

            {currentExam.printHistories.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                Chưa có lần in phiếu nào cho ca khám này. Nhấn nút "In Phiếu Kết quả tổng kết" để tạo file Excel.
              </p>
            ) : (
              <div className="space-y-2">
                {currentExam.printHistories.map((h, index) => (
                  <div
                    key={h.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        Lần in #{currentExam.printHistories.length - index}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {new Date(h.printedAt).toLocaleString('vi-VN')}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Đã in
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-[11px] text-slate-500 leading-relaxed">
              <p className="font-semibold text-slate-700 mb-1">Quy định in phiếu:</p>
              Phiếu được in từ mẫu Excel chính thức của phòng khám, hiển thị đầy đủ tóm tắt chuyên môn và chữ ký của bác sĩ điều trị. Mỗi lần in đều được lưu vết hệ thống.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
