import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { FileSpreadsheet, HeartPulse, Printer, X } from 'lucide-react'
import { getSession } from '@/lib/auth-session'
import { triggerPrint } from '@/lib/print-utils'
import type { StockDocument } from './warehouse-api'

const money = (v: number) => new Intl.NumberFormat('vi-VN').format(Math.round(v)) + ' đ'

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

export function WarehousePrintView({
  document,
  onClose,
  onExportExcel,
}: {
  document: StockDocument & { isCopy?: boolean }
  onClose?: () => void
  onExportExcel?: () => void
}) {
  const session = getSession()
  const isReceipt = document.type === 'IN'
  const isCopy = document.isCopy || document.printCount > 1

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

  return typeof window !== 'undefined'
    ? createPortal(
        <div
          id="dental-print-portal"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm print:static print:overflow-visible print:bg-white print:p-0"
        >
          <div className="mx-auto flex min-h-full max-w-[680px] flex-col items-center justify-start py-6 print:max-w-none print:py-0 print:block print:min-h-0">
        {/* On-screen action toolbar (căn chỉnh chính giữa ngay trên tờ phiếu A5) */}
        <div className="no-print mb-3 flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
              <HeartPulse className="size-4 text-[#5546e8]" />
              <span>Xem trước bản in (A5) &amp; Lưu PDF</span>
              <span className="text-slate-300">|</span>
              <span className="font-mono text-[#5546e8]">{document.code}</span>
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
          id="warehouse-print-content"
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
                  Bộ phận Quản lý Kho Dược &amp; Vật tư y tế
                </p>
              </div>
            </div>
            <div className="text-right text-[11px] text-slate-600">
              <p className="font-bold">Mẫu số: {isReceipt ? '01-VT' : '02-VT'} <span className="ml-1 text-[10px] text-slate-400 font-normal">(Khổ A5)</span></p>
              <p className="text-[10px] text-slate-400">(Ban hành theo TT số 200/2014/TT-BTC)</p>
              <p className="mt-1 font-semibold text-slate-900">
                Mã chứng từ: <span className="font-mono text-xs font-bold text-[#5546e8]">{document.code}</span>
              </p>
            </div>
          </div>

          {/* Title */}
          <div className="mt-4 text-center">
            <h1 className="text-xl font-black uppercase tracking-wide text-slate-900">
              {isReceipt ? 'PHIẾU NHẬP KHO' : 'PHIẾU XUẤT KHO'}
            </h1>
            <p className="mt-1 text-xs text-slate-500">
              Ngày lập: {formatDate(document.createdAt)}
            </p>
            {isCopy && (
              <div className="mt-2 inline-block rounded-full border border-red-300 bg-red-50 px-3 py-0.5 text-xs font-bold text-red-700">
                BẢN SAO (Lần in thứ {document.printCount})
              </div>
            )}
          </div>

          {/* Context metadata */}
          <div className="mt-6 grid grid-cols-2 gap-x-8 gap-y-2 text-xs text-slate-700">
            {isReceipt ? (
              <>
                <div>
                  <span className="font-semibold text-slate-900">Nhà cung cấp:</span>{' '}
                  {document.supplier?.name || '—'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Mã số thuế:</span>{' '}
                  {document.supplier?.taxCode || '—'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Địa chỉ:</span>{' '}
                  {document.supplier?.address || '—'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Số điện thoại:</span>{' '}
                  {document.supplier?.phone || '—'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Nhập tại kho:</span> Kho Dược &amp; VTYT Trung tâm DentalKhoi
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Lý do nhập:</span>{' '}
                  {document.reason || 'Nhập mua vật tư y tế theo hóa đơn'}
                </div>
              </>
            ) : (
              <>
                <div>
                  <span className="font-semibold text-slate-900">Mục đích xuất:</span>{' '}
                  {document.outboundType === 'PATIENT_USE'
                    ? 'Dùng cho ca điều trị bệnh nhân'
                    : document.outboundType === 'DISPOSAL'
                    ? 'Xuất hủy vật tư (hỏng / hết hạn / vỡ)'
                    : 'Cấp phát sử dụng nội bộ'}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Nơi nhận / Bệnh nhân:</span>{' '}
                  {document.recipientDepartment || (document.patientId ? `BN ID: ${document.patientId}` : '—')}
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Xuất tại kho:</span> Kho Dược &amp; VTYT Trung tâm DentalKhoi
                </div>
                <div>
                  <span className="font-semibold text-slate-900">Lý do xuất:</span>{' '}
                  {document.reason || '—'}
                </div>
                {document.nonFefoReason && (
                  <div className="col-span-2 rounded-lg bg-amber-50 p-2 text-amber-800">
                    <span className="font-semibold">Lý do xuất không theo FEFO:</span> {document.nonFefoReason}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Lines Table */}
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-300">
            <table className="w-full text-left text-[11px]">
              <thead className="bg-slate-100 text-[10px] font-bold uppercase text-slate-700">
                <tr className="border-b border-slate-300">
                  <th className="px-1.5 py-2 text-center">STT</th>
                  <th className="px-1.5 py-2">Mã VT</th>
                  <th className="px-1.5 py-2">Tên vật tư</th>
                  <th className="px-1.5 py-2 text-center">ĐVT</th>
                  <th className="px-1.5 py-2 text-right">SL CT</th>
                  <th className="px-1.5 py-2 text-right">SL QĐ</th>
                  <th className="px-1.5 py-2 text-center">Số lô</th>
                  <th className="px-1.5 py-2 text-center">Hạn dùng</th>
                  <th className="px-1.5 py-2 text-right">Đơn giá</th>
                  {isReceipt && <th className="px-1.5 py-2 text-center">VAT</th>}
                  <th className="px-1.5 py-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {document.lines.map((line, idx) => (
                  <tr key={line.id || idx}>
                    <td className="px-1.5 py-1.5 text-center text-slate-500">{idx + 1}</td>
                    <td className="px-1.5 py-1.5 font-mono font-semibold text-slate-900">{line.supply?.code}</td>
                    <td className="px-1.5 py-1.5 font-medium text-slate-900">{line.supply?.name}</td>
                    <td className="px-1.5 py-1.5 text-center">{line.inputUnit}</td>
                    <td className="px-1.5 py-1.5 text-right font-semibold">{line.inputQuantity}</td>
                    <td className="px-1.5 py-1.5 text-right">
                      {line.convertedQuantity} {line.supply?.baseUnit}
                    </td>
                    <td className="px-1.5 py-1.5 text-center font-mono">{line.batchNo || '—'}</td>
                    <td className="px-1.5 py-1.5 text-center">{formatDate(line.expiryDate)}</td>
                    <td className="px-1.5 py-1.5 text-right font-mono">
                      {line.inputUnitPrice ? money(line.inputUnitPrice) : '—'}
                    </td>
                    {isReceipt && (
                      <td className="px-1.5 py-1.5 text-center font-mono">
                        {line.vatRate ? `${line.vatRate}%` : '0%'}
                      </td>
                    )}
                    <td className="px-1.5 py-1.5 text-right font-mono font-bold text-slate-900">
                      {money(line.totalAmount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-slate-300 bg-slate-50 text-[11px]">
                {isReceipt && (
                  <>
                    <tr>
                      <td colSpan={10} className="px-2 py-1.5 text-right font-medium text-slate-600">
                        Cộng tiền hàng:
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">
                        {money(document.goodsAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td colSpan={10} className="px-2 py-1.5 text-right font-medium text-slate-600">
                        Tiền thuế GTGT:
                      </td>
                      <td className="px-2 py-1.5 text-right font-mono font-semibold">
                        {money(document.vatAmount)}
                      </td>
                    </tr>
                  </>
                )}
                <tr className="border-t font-bold">
                  <td colSpan={isReceipt ? 10 : 9} className="px-2 py-2 text-right uppercase text-slate-900">
                    {isReceipt ? 'Tổng thanh toán:' : 'Tổng giá trị xuất:'}
                  </td>
                  <td className="px-2 py-2 text-right font-mono text-xs text-[#5546e8]">
                    {money(document.totalAmount)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* In words */}
          <div className="mt-2.5 rounded-lg bg-slate-50 p-2.5 text-[11px] italic text-slate-700">
            <span className="font-semibold not-italic text-slate-900">Tổng số tiền bằng chữ:</span>{' '}
            {document.totalAmountInWords || '—'}
          </div>

          {/* 4 Signature Blocks */}
          <div className="mt-5 print:mt-3 grid grid-cols-4 gap-2 text-center text-[10px]">
            <div>
              <p className="font-bold uppercase text-slate-900">Người lập phiếu</p>
              <p className="text-[9px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-12 print:h-8" />
              <p className="font-semibold text-slate-800">{session?.user?.fullName || 'Người lập'}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">
                {isReceipt ? 'Người giao hàng' : 'Người nhận hàng'}
              </p>
              <p className="text-[9px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-12 print:h-8" />
              <p className="font-semibold text-slate-800">
                {isReceipt ? document.supplier?.name || 'Bên giao' : document.recipientDepartment || 'Bên nhận'}
              </p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">Thủ kho</p>
              <p className="text-[9px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-12 print:h-8" />
              <p className="font-semibold text-slate-800">Thủ kho phụ trách</p>
            </div>
            <div>
              <p className="font-bold uppercase text-slate-900">Kế toán trưởng</p>
              <p className="text-[9px] text-slate-400 italic">(Ký, họ tên)</p>
              <div className="h-12 print:h-8" />
              <p className="font-semibold text-slate-800">Phụ trách kế toán</p>
            </div>
          </div>

          {/* Print Metadata Footer */}
          <div className="mt-5 print:mt-2.5 border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] text-slate-400">
            <span>
              In bởi: <strong className="text-slate-600">{session?.user?.fullName} ({session?.user?.username})</strong> lúc {formatDateTime(document.printedAt || document.createdAt)}
            </span>
            <span className="font-mono text-[9px]">
              Bảo mật Hash: {document.contentHash ? document.contentHash.slice(0, 16) + '...' : 'DRAFT'}
            </span>
          </div>
        </div>
      </div>
    </div>,
    window.document.body,
  ) : null
}
