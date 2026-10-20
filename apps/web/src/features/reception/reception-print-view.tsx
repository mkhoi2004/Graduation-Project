import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileSpreadsheet, HeartPulse, Printer, X } from 'lucide-react'
import { getSession } from '@/lib/auth-session'
import { triggerPrint } from '@/lib/print-utils'
import {
  calculateIntakeTotal,
  clinicRooms,
  dentalServices,
  doctors,
  formatCurrency,
  type Intake,
  type Patient,
} from './reception-data'
import { readVietnameseCurrency } from '../warehouse/warehouse-api'

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

export function ReceptionPrintView({
  patient,
  intake,
  onClose,
  onExportExcel,
  isCopy = false,
}: {
  patient: Patient
  intake: Intake
  onClose?: () => void
  onExportExcel?: () => void
  isCopy?: boolean
}) {
  const session = getSession()
  const totalAmount = calculateIntakeTotal(intake.services)
  const room = clinicRooms.find((r) => r.id === intake.roomId)
  const doctor = doctors.find((d) => d.id === intake.doctorId)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const handlePrint = () => {
    triggerPrint()
  }

  // Security Hash snapshot string
  const hashSeed = `${intake.id}|${patient.id}|${totalAmount}|${intake.createdAt}`
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
              <HeartPulse className="size-4 text-[#5546e8]" />
              <span>Xem trước Phiếu Thu (A5) &amp; In PDF</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-[#5546e8]">{intake.id}</span>
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

        {/* On-screen Print Guidance Banner */}
        <div className="no-print mb-3 w-full rounded-xl border border-amber-200 bg-amber-50/95 px-3.5 py-2 text-xs text-amber-900 shadow-sm backdrop-blur flex items-center gap-2.5">
          <span className="text-base shrink-0">💡</span>
          <div className="leading-snug">
            <span className="font-bold">Mẹo in sạch không dính link web / ngày giờ:</span> Trong hộp thoại in của trình duyệt (Ctrl + P), hãy bấm{' '}
            <strong className="underline decoration-amber-500 underline-offset-2">Cài đặt khác (More settings)</strong> ➔{' '}
            <strong>Bỏ tích ô &ldquo;Tiêu đề đầu trang và chân trang&rdquo; (Headers and footers)</strong>.{' '}
            <span className="text-amber-700 italic">(Chỉ cần bỏ tích 1 lần, trình duyệt Chrome sẽ tự nhớ vĩnh viễn)</span>.
          </div>
        </div>

        {/* Printable Paper A5 Container */}
        <div
          id="reception-print-content"
          className="printable-document relative w-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 text-slate-900 shadow-2xl print:rounded-none print:border-none print:shadow-none"
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
                  Địa chỉ: 123 Đường 3/2, Phường 11, Quận 10, TP. Hồ Chí Minh
                </p>
                <p className="text-[10px] text-slate-500">
                  Hotline: 1900 6868 · MST: 0312345678 · Giấy phép SYT: 01234/SYT-GPHĐ
                </p>
                <p className="text-[10px] font-semibold text-slate-600">
                  Bộ phận Quầy Tiếp Nhận &amp; Thu Ngân
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-600">
              <p className="font-bold">Mẫu số: 01-TT <span className="ml-1 text-[10px] text-slate-400 font-normal">(Khổ A5)</span></p>
              <p className="text-[10px] text-slate-400">(Ban hành theo TT số 200/2014/TT-BTC)</p>
              <p className="mt-1 font-semibold text-slate-900">
                Mã phiếu thu: <span className="font-mono text-xs font-bold text-[#5546e8]">{intake.id}</span>
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="mt-4 text-center">
            <h1 className="text-xl font-black uppercase tracking-wide text-slate-900">
              PHIẾU TIẾP NHẬN &amp; THU TIỀN DỊCH VỤ
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Thời gian tiếp nhận: {formatDateTime(intake.createdAt)}
            </p>
            {isCopy && (
              <div className="mt-2 inline-block rounded-full border border-red-300 bg-red-50 px-3 py-0.5 text-xs font-bold text-red-700">
                BẢN SAO
              </div>
            )}
          </div>

          {/* Thông tin bệnh nhân & điều phối */}
          <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs text-slate-700">
            <div>
              <span className="font-semibold text-slate-900">Họ và tên bệnh nhân:</span>{' '}
              <strong className="text-xs font-bold text-slate-900">{patient.fullName}</strong>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Mã bệnh nhân (MBN):</span>{' '}
              <span className="font-mono font-bold text-[#5546e8]">{patient.id}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Ngày sinh:</span>{' '}
              {formatDate(patient.dateOfBirth)} ({patient.gender})
            </div>
            <div>
              <span className="font-semibold text-slate-900">Số điện thoại:</span>{' '}
              <span className="font-mono">{patient.phone}</span>
            </div>
            <div className="col-span-2">
              <span className="font-semibold text-slate-900">Địa chỉ:</span>{' '}
              {patient.address || '—'}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Lý do tiếp nhận / Triệu chứng:</span>{' '}
              {intake.symptoms || 'Khám răng hàm mặt tổng quát'}
            </div>
            <div>
              <span className="font-semibold text-slate-900">Mức độ ưu tiên:</span>{' '}
              <span className="font-medium">{intake.priority}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Phòng khám chỉ định:</span>{' '}
              <span className="font-semibold text-slate-900">{room?.name || 'Chưa chỉ định'}</span>
            </div>
            <div>
              <span className="font-semibold text-slate-900">Bác sĩ phụ trách:</span>{' '}
              <span className="font-semibold text-slate-900">{doctor?.name || 'Chưa chỉ định'}</span>
            </div>
          </div>

          {/* Bảng dịch vụ nha khoa chỉ định */}
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                <tr className="border-b border-slate-300">
                  <th className="px-2 py-1.5 text-center">STT</th>
                  <th className="px-2 py-1.5">Mã DV</th>
                  <th className="px-2 py-1.5">Tên dịch vụ / Thủ thuật nha khoa</th>
                  <th className="px-2 py-1.5 text-center">ĐVT</th>
                  <th className="px-2 py-1.5 text-right">Số lượng</th>
                  <th className="px-2 py-1.5 text-right">Đơn giá</th>
                  <th className="px-2 py-1.5 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {intake.services.map((item, idx) => {
                  const s = dentalServices.find((ds) => ds.id === item.serviceId)
                  const lineTotal = (s?.price ?? 0) * item.quantity
                  return (
                    <tr key={item.serviceId}>
                      <td className="px-2 py-1.5 text-center text-slate-500">{idx + 1}</td>
                      <td className="px-2 py-1.5 font-mono font-semibold text-slate-900">{s?.id}</td>
                      <td className="px-2 py-1.5 font-medium text-slate-900">{s?.name}</td>
                      <td className="px-2 py-1.5 text-center">{s?.unit}</td>
                      <td className="px-2 py-1.5 text-right font-semibold">{item.quantity}</td>
                      <td className="px-2 py-1.5 text-right font-mono">{s?.price ? formatCurrency(s.price) : '—'}</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-900">{formatCurrency(lineTotal)}</td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot className="border-t border-slate-300 bg-slate-50 text-xs font-bold">
                <tr>
                  <td colSpan={6} className="px-2 py-1.5 text-right uppercase text-slate-900">
                    Tổng cộng thanh toán:
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono text-sm font-extrabold text-[#5546e8]">
                    {formatCurrency(totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* In words & Payment details */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs">
            <div className="italic text-slate-700">
              <span className="font-semibold not-italic text-slate-900">Tổng số tiền bằng chữ:</span>{' '}
              {readVietnameseCurrency(totalAmount)}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">Hình thức:</span>
              <span className="rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono font-bold text-slate-800">
                {intake.payment?.method === 'MOMO' ? 'Cổng điện tử MoMo' : 'Tiền mặt tại quầy'}
              </span>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                ĐÃ THANH TOÁN
              </span>
            </div>
          </div>

          {/* 4 Chữ ký */}
          <div className="mt-5 print:mt-3 grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <p className="font-bold uppercase text-slate-900">Bệnh nhân / Người nộp</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-12 print:h-8" />
              <p className="font-semibold text-slate-800">{patient.fullName}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">Thu ngân tiếp nhận</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-12 print:h-8" />
              <p className="font-semibold text-slate-800">{session?.user?.fullName || 'Thu ngân'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">Bác sĩ khám</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-12 print:h-8" />
              <p className="font-semibold text-slate-800">{doctor?.name || 'Bác sĩ phụ trách'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">Người lập phiếu</p>
              <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-12 print:h-8" />
              <p className="font-semibold text-slate-800">{session?.user?.fullName || 'Nhân viên quầy'}</p>
            </div>
          </div>

          {/* Print Metadata Footer */}
          <div className="mt-5 print:mt-2.5 border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              In bởi: <strong className="text-slate-600">{session?.user?.fullName} ({session?.user?.username})</strong> lúc {formatDateTime(intake.payment?.paidAt || intake.createdAt)}
            </span>
            <span className="font-mono text-[10px]">
              Bảo mật Hash: ref-{pseudoHash}87a2
            </span>
          </div>
        </div>
      </div>
    </div>,
    window.document.body,
  ) : null
}
