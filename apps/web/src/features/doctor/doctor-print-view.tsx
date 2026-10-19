import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileSpreadsheet, Printer, Stethoscope, X } from 'lucide-react'
import { getSession } from '@/lib/auth-session'

function formatDate(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} ngày ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export function DoctorPrintView({
  examination,
  onClose,
  onExportExcel,
  onPrintRecorded,
}: {
  examination: {
    id: number
    code: string
    startedAt: string
    printCount?: number
    patient: {
      code: string
      fullName: string
      dateOfBirth: string
      gender?: string
      phone: string
      address?: string
    }
    intake?: {
      roomName?: string
      services?: { name: string; quantity: number; unit?: string }[]
    }
    result?: {
      summary: string
      treatmentMethod: string
      treatmentOrientation: string
      nextAppointmentDate?: string
    }
  }
  onClose?: () => void
  onExportExcel?: () => void
  onPrintRecorded?: () => void
}) {
  const session = getSession()
  const isCopy = (examination.printCount ?? 0) > 0

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handlePrint = () => {
    window.print()
    onPrintRecorded?.()
  }

  // Hash snapshot
  const hashSeed = `${examination.code}|${examination.patient.code}|${examination.startedAt}`
  const pseudoHash = Array.from(hashSeed).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0).toString(16).padStart(8, '0')

  return typeof window !== 'undefined'
    ? createPortal(
        <div
      id="dental-print-portal"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm print:static print:overflow-visible print:bg-white print:p-0"
    >
      <div className="mx-auto flex min-h-full max-w-[660px] flex-col items-center justify-start py-6 print:max-w-none print:py-0 print:block print:min-h-0">
        {/* On-screen action toolbar */}
        <div className="no-print mb-3 flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
              <Stethoscope className="size-4 text-[#5546e8]" />
              <span>Xem trước Phiếu Kết Quả (A5) &amp; In PDF</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-[#5546e8]">{examination.code}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onExportExcel && (
              <button
                type="button"
                onClick={onExportExcel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                title="Tải file Excel mẫu"
              >
                <FileSpreadsheet className="size-4 text-emerald-600" />
                <span>Xuất Excel</span>
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5546e8] px-4 py-2 text-xs font-bold text-white shadow-lg shadow-[#5546e8]/30 transition hover:bg-[#4335d6]"
              title="In ra máy in hoặc Lưu dưới dạng file PDF"
            >
              <Printer className="size-4" />
              <span>In ngay (Ctrl + P / Lưu PDF)</span>
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-sm transition hover:bg-slate-100"
                title="Đóng"
                aria-label="Đóng"
              >
                <X className="size-4" />
              </button>
            )}
          </div>
        </div>

        {/* Printable Paper A5 Container */}
        <div
          id="doctor-print-content"
          className="printable-document relative w-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 text-slate-900 shadow-2xl print:rounded-none print:border-none print:p-0 print:shadow-none"
        >
          {/* Watermark for Copy - Căn chính giữa tâm tờ giấy */}
          {isCopy && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden select-none">
              <span className="rotate-[-25deg] text-6xl sm:text-7xl font-black tracking-widest text-red-500/12">
                BẢN SAO
              </span>
            </div>
          )}

          {/* Top Header Phòng Khám Nha Khoa */}
          <div className="flex items-start justify-between border-b border-slate-200 pb-3">
            <div className="flex items-start gap-2.5">
              <img src="/Logo.png" alt="DentalKhoi" className="h-10 w-auto shrink-0 object-contain" />
              <div>
                <h2 className="text-sm font-extrabold tracking-tight text-[#5546e8]">
                  PHÒNG KHÁM NHA KHOA DENTALKHOI
                </h2>
                <p className="text-[11px] text-slate-500">
                  Chuyên khoa Răng - Hàm - Mặt &amp; Phục hình thẩm mỹ
                </p>
                <p className="text-[10px] text-slate-500">
                  Địa chỉ: 123 Đường 3/2, Phường 11, Quận 10, TP. Hồ Chí Minh · Hotline: 1900 6868
                </p>
                <p className="text-[10px] font-semibold text-slate-600">
                  Giấy phép hoạt động SYT: 01234/SYT-GPHĐ
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-600">
              <p className="font-bold">Mẫu số: 03-KB <span className="ml-1 text-[10px] text-slate-400 font-normal">(Khổ A5)</span></p>
              <p className="text-[10px] text-slate-400">(Hồ sơ kết quả điều trị chuyên khoa)</p>
              <p className="mt-1 font-semibold text-slate-900">
                Mã ca khám: <span className="font-mono text-xs font-bold text-[#5546e8]">{examination.code}</span>
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="mt-4 text-center">
            <h1 className="text-xl font-black uppercase tracking-wide text-slate-900">
              PHIẾU KẾT QUẢ KHÁM &amp; ĐIỀU TRỊ NHA KHOA
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Ngày khám: {formatDateTime(examination.startedAt)}
            </p>
            {isCopy && (
              <div className="mt-2 inline-block rounded-full border border-red-300 bg-red-50 px-3 py-0.5 text-xs font-bold text-red-700">
                BẢN SAO (Lần in thứ {(examination.printCount ?? 0) + 1})
              </div>
            )}
          </div>

          {/* Thông tin hành chính bệnh nhân */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Họ và tên bệnh nhân:</span>{' '}
              <strong className="text-xs font-bold text-slate-900">{examination.patient.fullName}</strong>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Mã bệnh nhân (MBN):</span>{' '}
              <span className="font-mono font-bold text-[#5546e8]">{examination.patient.code}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Ngày sinh:</span>{' '}
              {formatDate(examination.patient.dateOfBirth)} {examination.patient.gender ? `(${examination.patient.gender})` : ''}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Điện thoại liên hệ:</span>{' '}
              <span className="font-mono">{examination.patient.phone}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-slate-900">Địa chỉ:</span>{' '}
              {examination.patient.address || '—'}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Phòng khám / Ghế nha:</span>{' '}
              <span className="font-semibold text-slate-900">{examination.intake?.roomName || 'Phòng khám tổng quát'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Bác sĩ phụ trách điều trị:</span>{' '}
              <span className="font-semibold text-slate-900">{session?.user?.fullName || 'BS. Nguyễn Hoàng Minh'}</span>
            </div>
          </div>

          {/* Dịch vụ & Thủ thuật thực hiện */}
          {examination.intake?.services && examination.intake.services.length > 0 && (
            <div className="mt-4">
              <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wider text-slate-700">
                1. Dịch vụ &amp; Thủ thuật nha khoa đã thực hiện:
              </h3>
              <div className="overflow-hidden rounded-xl border border-slate-300">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                    <tr className="border-b border-slate-300">
                      <th className="px-2 py-1.5 text-center w-12">STT</th>
                      <th className="px-2 py-1.5">Danh mục thủ thuật / Dịch vụ</th>
                      <th className="px-2 py-1.5 text-center w-24">Số lượng</th>
                      <th className="px-2 py-1.5 text-center w-28">Đơn vị</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {examination.intake.services.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-2 py-1.5 text-center text-slate-500">{idx + 1}</td>
                        <td className="px-2 py-1.5 font-medium text-slate-900">{item.name}</td>
                        <td className="px-2 py-1.5 text-center font-bold">{item.quantity}</td>
                        <td className="px-2 py-1.5 text-center text-slate-600">{item.unit || 'Lần'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Kết quả chuyên môn và kết luận bác sĩ */}
          <div className="mt-4 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5546e8]">
              2. Kết luận chuyên môn &amp; Kế hoạch điều trị:
            </h3>

            <div>
              <p className="font-bold text-slate-800">a. Tóm tắt kết quả khám &amp; Chẩn đoán chuyên khoa:</p>
              <p className="mt-0.5 leading-relaxed text-slate-700 whitespace-pre-wrap pl-2.5 border-l-2 border-[#5546e8]">
                {examination.result?.summary || 'Răng miệng ổn định, đã xử lý theo đúng quy trình chuyên môn.'}
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-800">b. Phương pháp điều trị đã thực hiện:</p>
              <p className="mt-0.5 leading-relaxed text-slate-700 whitespace-pre-wrap pl-2.5 border-l-2 border-[#5546e8]">
                {examination.result?.treatmentMethod || 'Điều trị bảo tồn và làm sạch khoang miệng theo phác đồ.'}
              </p>
            </div>

            <div>
              <p className="font-bold text-slate-800">c. Hướng điều trị tiếp theo &amp; Lời dặn của bác sĩ:</p>
              <p className="mt-0.5 leading-relaxed text-slate-700 whitespace-pre-wrap pl-2.5 border-l-2 border-[#5546e8]">
                {examination.result?.treatmentOrientation || 'Vệ sinh răng miệng đúng cách ngày 2 lần, hạn chế thức ăn quá cứng hoặc đồ ngọt.'}
              </p>
            </div>

            {examination.result?.nextAppointmentDate && (
              <div className="flex items-center gap-2 pt-1.5 border-t border-slate-200 text-slate-900 font-semibold">
                <span className="text-[#5546e8]">📅 Hẹn ngày tái khám:</span>
                <span className="rounded-md bg-white px-2 py-0.5 border border-slate-200 font-bold text-slate-800">
                  {formatDate(examination.result.nextAppointmentDate)}
                </span>
                <span className="text-[10px] font-normal text-slate-400 italic">
                  (Vui lòng mang theo phiếu này khi đến tái khám)
                </span>
              </div>
            )}
          </div>

          {/* 3 Chữ ký trách nhiệm */}
          <div className="mt-5 grid grid-cols-3 gap-4 text-center text-xs">
            <div>
              <p className="font-bold uppercase text-slate-900">Bệnh nhân / Người nhà</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-14" />
              <p className="font-semibold text-slate-800">{examination.patient.fullName}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">Bác sĩ điều trị</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, ghi rõ họ tên)</p>
              <div className="h-14" />
              <p className="font-semibold text-slate-800">{session?.user?.fullName || 'BS. Điều trị'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">Giám đốc chuyên môn</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, đóng dấu)</p>
              <div className="h-14" />
              <p className="font-semibold text-slate-800">BS. CKI Nha Khoa</p>
            </div>
          </div>

          {/* Print Metadata Footer */}
          <div className="mt-5 border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              In bởi: <strong className="text-slate-600">{session?.user?.fullName} ({session?.user?.username})</strong> lúc {formatDateTime(examination.startedAt)}
            </span>
            <span className="font-mono text-[10px]">
              Bảo mật Hash: med-{pseudoHash}93e1
            </span>
          </div>
        </div>
      </div>
    </div>,
    window.document.body,
  ) : null
}
