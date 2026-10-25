import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { ExternalLink, HeartPulse, Printer, X } from 'lucide-react'
import { getSession } from '@/lib/auth-session'
import { triggerPrint } from '@/lib/print-utils'
import { captureAndSavePrintPdf } from '@/lib/report-storage'
import type { AccountingEntry } from './accounting-types'
import { categoryLabel, formatCurrency, formatDate, formatDateTime, methodLabel } from './accounting-format'
import { readVietnameseCurrency } from '../warehouse/warehouse-api'

export function AccountingPrintView({
  entry,
  onClose,
}: {
  entry: AccountingEntry
  onClose?: () => void
}) {
  const session = getSession()
  const isReceipt = entry.direction === 'IN'
  const [printedAt] = useState(() => formatDateTime(new Date()))

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.()
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 'P')) {
        e.preventDefault()
        handlePrint()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const [isSaving, setIsSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)
  const [saveError, setSaveError] = useState(false)
  const [savedUrl, setSavedUrl] = useState<string | null>(null)

  const handlePrint = async () => {
    if (isSaving) return
    const el = document.getElementById('accounting-print-content')
    if (el) {
      setIsSaving(true)
      setSaveError(false)
      setSaveStatus('Đang tạo và lưu file PDF vào Report/KeToan...')
      try {
        const cleanCode = (entry.sourceCode || `entry-${entry.id}`).replace(/[\\/:*?"<>|]/g, '-')
        const fileName = `phieu-thu-chi-${cleanCode}.pdf`
        const res = await captureAndSavePrintPdf(el, 'KeToan', fileName, 'a5')
        if (res?.success) {
          setSaveStatus(`Đã lưu file thành công: ${res.relativePath}`)
          setSavedUrl(res.url)
          setSaveError(false)
        } else {
          setSaveStatus(`Lưu file thất bại: ${res?.message || 'Không thể tạo file'}`)
          setSaveError(true)
        }
      } catch (err: unknown) {
        console.error('Lưu PDF vào Report/KeToan thất bại:', err)
        setSaveStatus(`Lỗi khi lưu PDF: ${err instanceof Error ? err.message : 'Không thể lưu file'}`)
        setSaveError(true)
      } finally {
        setIsSaving(false)
      }
    }
    triggerPrint()
  }

  // Security hash
  const hashSeed = `${entry.id}|${entry.sourceCode}|${entry.totalAmount}|${entry.effectiveDate}`
  const pseudoHash = Array.from(hashSeed)
    .reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 0)
    .toString(16)
    .padStart(8, '0')

  return typeof window !== 'undefined'
    ? createPortal(
        <div
          id="dental-print-portal"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm print:static print:overflow-visible print:bg-white print:p-0"
        >
          <div className="mx-auto flex min-h-full max-w-[660px] flex-col items-center justify-start py-6 print:max-w-none print:py-0 print:block print:min-h-0">
            {/* Toolbar */}
            <div className="no-print mb-3 flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                  <HeartPulse className="size-4 text-[#5546e8]" />
                  <span>Xem trước {isReceipt ? 'Phiếu Thu' : 'Phiếu Chi'} (A5) &amp; In PDF</span>
                  <span className="text-slate-300">|</span>
                  <span className="font-mono text-[#5546e8]">{entry.sourceCode}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
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

            {/* File Saved Status Banner */}
            {saveStatus && (
              <div
                className={`no-print mb-3 w-full rounded-xl border px-3.5 py-2.5 text-xs shadow-sm backdrop-blur flex items-center justify-between gap-2.5 ${
                  saveError
                    ? 'border-rose-200 bg-rose-50/95 text-rose-900'
                    : isSaving
                    ? 'border-blue-200 bg-blue-50/95 text-blue-900'
                    : 'border-emerald-200 bg-emerald-50/95 text-emerald-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base shrink-0">{saveError ? '⚠️' : isSaving ? '⏳' : '📁'}</span>
                  <span className="font-semibold">{saveStatus}</span>
                </div>
                {savedUrl && (
                  <a
                    href={savedUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs transition hover:bg-emerald-700"
                  >
                    <span>Xem bằng URL</span>
                    <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            )}

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
              id="accounting-print-content"
              className="printable-document relative w-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-7 text-slate-900 shadow-2xl print:rounded-none print:border-none print:shadow-none"
            >
              {/* Header */}
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
                      Phòng Kế toán Tài chính
                    </p>
                  </div>
                </div>
                <div className="text-right text-[11px] text-slate-600">
                  <p className="font-bold">
                    Mẫu số: {isReceipt ? '01-TT' : '02-TT'} <span className="ml-1 text-[10px] text-slate-400 font-normal">(Khổ A5)</span>
                  </p>
                  <p className="text-[10px] text-slate-400">(Ban hành theo TT số 200/2014/TT-BTC)</p>
                  <p className="mt-1 font-semibold text-slate-900">
                    Số phiếu: <span className="font-mono text-xs font-bold text-[#5546e8]">{entry.sourceCode}</span>
                  </p>
                </div>
              </div>

              {/* Title */}
              <div className="mt-4 text-center">
                <h1 className="text-xl font-black uppercase tracking-wide text-slate-900">
                  {isReceipt ? 'PHIẾU THU TIỀN' : 'PHIẾU CHI TIỀN'}
                </h1>
                <p className="mt-1 text-xs text-slate-500">
                  Ngày lập phiếu: {formatDate(entry.effectiveDate)}
                </p>
              </div>

              {/* Content fields */}
              <div className="mt-4 space-y-2 text-xs text-slate-700">
                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="font-semibold text-slate-900">
                    {isReceipt ? 'Họ và tên người nộp:' : 'Họ và tên người nhận:'}
                  </span>
                  <span className="font-bold text-slate-900">
                    {entry.patientId ? `Bệnh nhân (Mã: BN-${entry.patientId})` : entry.supplierId ? `Nhà cung cấp (Mã: NCC-${entry.supplierId})` : 'Bộ phận nội bộ / Khác'}
                  </span>
                </div>

                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="font-semibold text-slate-900">Khoản mục / Nội dung:</span>
                  <span className="font-medium text-slate-800">{categoryLabel(entry.category)}</span>
                </div>

                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="font-semibold text-slate-900">Lý do thu / chi:</span>
                  <span className="text-slate-700">{entry.reason || 'Thực hiện thanh toán theo quy chế tài chính'}</span>
                </div>

                <div className="grid grid-cols-[140px_1fr] gap-2">
                  <span className="font-semibold text-slate-900">Hình thức thanh toán:</span>
                  <span>{methodLabel(entry.paymentMethod)} {entry.transactionCode ? `(Mã GD: ${entry.transactionCode})` : ''}</span>
                </div>

                {/* Amount breakdown */}
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex justify-between py-1">
                    <span className="text-slate-600">Tiền chưa thuế:</span>
                    <span className="font-mono font-medium">{formatCurrency(entry.preTaxAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-slate-200/60">
                    <span className="text-slate-600">Thuế GTGT ({entry.taxRate ? `${entry.taxRate}%` : '0%'}):</span>
                    <span className="font-mono font-medium">{formatCurrency(entry.taxAmount)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-t border-slate-200 font-bold text-slate-900">
                    <span>TỔNG CỘNG THANH TOÁN:</span>
                    <span className="font-mono text-base text-[#5546e8]">{formatCurrency(entry.totalAmount)}</span>
                  </div>
                  <div className="mt-1 pt-1 border-t border-slate-200/60 text-right italic text-slate-600">
                    <span>Bằng chữ: </span>
                    <span className="font-semibold text-slate-800">{readVietnameseCurrency(entry.totalAmount)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-[140px_1fr] gap-2 pt-1 text-[11px] text-slate-500">
                  <span>Chứng từ gốc kèm theo:</span>
                  <span className="font-mono">{entry.sourceType}: {entry.sourceCode}</span>
                </div>
              </div>

              {/* Signatures */}
              <div className="mt-6 print:mt-3 grid grid-cols-4 gap-2 text-center text-xs">
                <div>
                  <p className="font-bold uppercase text-slate-900">Thủ trưởng đơn vị</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, họ tên, đóng dấu)</p>
                  <div className="h-12 print:h-8" />
                  <p className="font-semibold text-slate-800">Giám đốc PK</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-slate-900">Kế toán trưởng</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
                  <div className="h-12 print:h-8" />
                  <p className="font-semibold text-slate-800">{session?.user?.fullName || 'Kế toán trưởng'}</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-slate-900">Thủ quỹ</p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
                  <div className="h-12 print:h-8" />
                  <p className="font-semibold text-slate-800">Thủ quỹ PK</p>
                </div>
                <div>
                  <p className="font-bold uppercase text-slate-900">
                    {isReceipt ? 'Người nộp tiền' : 'Người nhận tiền'}
                  </p>
                  <p className="text-[10px] text-slate-400 italic">(Ký, họ tên)</p>
                  <div className="h-12 print:h-8" />
                  <p className="font-semibold text-slate-800">Khách hàng / Đối tác</p>
                </div>
              </div>

              {/* Footer */}
              <div className="mt-5 print:mt-2.5 border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] text-slate-400">
                <span>
                  In bởi: <strong className="text-slate-600">{session?.user?.fullName} ({session?.user?.username})</strong> lúc {printedAt}
                </span>
                <span className="font-mono text-[10px]">
                  Bảo mật Hash: ref-{pseudoHash}88a1
                </span>
              </div>
            </div>
          </div>
        </div>,
        window.document.body,
      )
    : null
}
