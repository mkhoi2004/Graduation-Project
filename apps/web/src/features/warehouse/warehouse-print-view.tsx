import { Printer, X } from 'lucide-react'
import { getSession } from '@/lib/auth-session'
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
}: {
  document: StockDocument & { isCopy?: boolean }
  onClose?: () => void
}) {
  const session = getSession()
  const isReceipt = document.type === 'IN'
  const isCopy = document.isCopy || document.printCount > 1

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/60 p-4 print:static print:inset-auto print:block print:bg-white print:p-0">
      {/* On-screen action toolbar */}
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2 print:hidden">
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-xl bg-[#5546e8] px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#5546e8]/30 transition hover:bg-[#4335d6]"
        >
          <Printer className="size-4" />
          In ngay (Ctrl + P)
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2.5 text-slate-600 shadow-md transition hover:bg-slate-100"
            title="Đóng"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* Printable Paper A4 Container */}
      <div
        id="warehouse-print-content"
        className="relative my-8 w-full max-w-[900px] rounded-2xl bg-white p-8 text-slate-900 shadow-2xl print:my-0 print:max-w-none print:rounded-none print:p-8 print:shadow-none"
      >
        {/* Watermark for Copy */}
        {isCopy && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-10 select-none">
            <span className="rotate-[-25deg] text-8xl font-black tracking-widest text-red-600">
              BẢN SAO
            </span>
          </div>
        )}

        {/* Top Header */}
        <div className="flex items-start justify-between border-b pb-4">
          <div>
            <h2 className="text-base font-extrabold tracking-tight text-[#5546e8]">
              PHÒNG KHÁM NHA KHOA DENTALCARE
            </h2>
            <p className="text-xs text-slate-500">
              Địa chỉ: 123 Đường 3/2, Phường 11, Quận 10, TP. Hồ Chí Minh
            </p>
            <p className="text-xs text-slate-500">
              Hotline: 1900 6868 · MST: 0312345678 · Giấy phép hoạt động: 01234/SYT-GPHĐ
            </p>
            <p className="text-xs font-semibold text-slate-600">
              Bộ phận Quản lý Kho Dược &amp; Vật tư y tế
            </p>
          </div>
          <div className="text-right text-xs text-slate-600">
            <p className="font-bold">Mẫu số: {isReceipt ? '01-VT' : '02-VT'}</p>
            <p>(Ban hành theo TT số 200/2014/TT-BTC)</p>
            <p className="mt-1 font-semibold text-slate-900">
              Mã chứng từ: <span className="font-mono text-sm font-bold text-[#5546e8]">{document.code}</span>
            </p>
          </div>
        </div>

        {/* Title */}
        <div className="mt-6 text-center">
          <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">
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
                <span className="font-semibold text-slate-900">Nhập tại kho:</span> Kho Dược &amp; VTYT Trung tâm DentalCare
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
                <span className="font-semibold text-slate-900">Xuất tại kho:</span> Kho Dược &amp; VTYT Trung tâm DentalCare
              </div>
              <div>
                <span className="font-semibold text-slate-900">Lý do xuất:</span>{' '}
                {document.reason || '—'}
              </div>
              {document.nonFefoReason && (
                <div className="col-span-2 text-amber-700">
                  <span className="font-semibold">Lý do xuất không theo FEFO:</span> {document.nonFefoReason}
                </div>
              )}
            </>
          )}
        </div>

        {/* Lines Table */}
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-300">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-[11px] font-bold uppercase text-slate-700">
              <tr className="border-b border-slate-300">
                <th className="p-2.5 text-center">STT</th>
                <th className="p-2.5">Mã VT</th>
                <th className="p-2.5">Tên vật tư</th>
                <th className="p-2.5 text-center">ĐVT</th>
                <th className="p-2.5 text-right">SL chứng từ</th>
                <th className="p-2.5 text-right">SL quy đổi</th>
                <th className="p-2.5 text-center">Số lô</th>
                <th className="p-2.5 text-center">Hạn dùng</th>
                <th className="p-2.5 text-right">Đơn giá</th>
                {isReceipt && <th className="p-2.5 text-center">VAT</th>}
                <th className="p-2.5 text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {document.lines.map((line, idx) => (
                <tr key={line.id || idx}>
                  <td className="p-2.5 text-center text-slate-500">{idx + 1}</td>
                  <td className="p-2.5 font-mono font-semibold text-slate-900">{line.supply?.code}</td>
                  <td className="p-2.5 font-medium text-slate-900">{line.supply?.name}</td>
                  <td className="p-2.5 text-center">{line.inputUnit}</td>
                  <td className="p-2.5 text-right font-semibold">{line.inputQuantity}</td>
                  <td className="p-2.5 text-right">
                    {line.convertedQuantity} {line.supply?.baseUnit}
                  </td>
                  <td className="p-2.5 text-center font-mono">{line.batchNo || '—'}</td>
                  <td className="p-2.5 text-center">{formatDate(line.expiryDate)}</td>
                  <td className="p-2.5 text-right font-mono">
                    {line.inputUnitPrice ? money(line.inputUnitPrice) : '—'}
                  </td>
                  {isReceipt && (
                    <td className="p-2.5 text-center font-mono">
                      {line.vatRate ? `${line.vatRate}%` : '0%'}
                    </td>
                  )}
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    {money(line.totalAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-300 bg-slate-50 text-xs">
              {isReceipt && (
                <>
                  <tr>
                    <td colSpan={10} className="p-2 text-right font-medium text-slate-600">
                      Cộng tiền hàng:
                    </td>
                    <td className="p-2 text-right font-mono font-semibold">
                      {money(document.goodsAmount)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={10} className="p-2 text-right font-medium text-slate-600">
                      Tiền thuế GTGT:
                    </td>
                    <td className="p-2 text-right font-mono font-semibold">
                      {money(document.vatAmount)}
                    </td>
                  </tr>
                </>
              )}
              <tr className="border-t font-bold">
                <td colSpan={isReceipt ? 10 : 9} className="p-2.5 text-right uppercase text-slate-900">
                  {isReceipt ? 'Tổng thanh toán:' : 'Tổng giá trị xuất:'}
                </td>
                <td className="p-2.5 text-right font-mono text-sm text-[#5546e8]">
                  {money(document.totalAmount)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* In words */}
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-xs italic text-slate-700">
          <span className="font-semibold not-italic text-slate-900">Tổng số tiền bằng chữ:</span>{' '}
          {document.totalAmountInWords || '—'}
        </div>

        {/* 4 Signature Blocks */}
        <div className="mt-8 grid grid-cols-4 gap-4 text-center text-xs">
          <div>
            <p className="font-bold uppercase text-slate-900">Người lập phiếu</p>
            <p className="text-[11px] text-slate-400 italic">(Ký, họ tên)</p>
            <div className="h-16" />
            <p className="font-semibold text-slate-800">{session?.user?.fullName || 'Người lập'}</p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-900">
              {isReceipt ? 'Người giao hàng' : 'Người nhận hàng'}
            </p>
            <p className="text-[11px] text-slate-400 italic">(Ký, họ tên)</p>
            <div className="h-16" />
            <p className="font-semibold text-slate-800">
              {isReceipt ? document.supplier?.name || 'Bên giao' : document.recipientDepartment || 'Bên nhận'}
            </p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-900">Thủ kho</p>
            <p className="text-[11px] text-slate-400 italic">(Ký, họ tên)</p>
            <div className="h-16" />
            <p className="font-semibold text-slate-800">Thủ kho phụ trách</p>
          </div>
          <div>
            <p className="font-bold uppercase text-slate-900">Kế toán trưởng</p>
            <p className="text-[11px] text-slate-400 italic">(Ký, họ tên)</p>
            <div className="h-16" />
            <p className="font-semibold text-slate-800">Phụ trách kế toán</p>
          </div>
        </div>

        {/* Print Metadata Footer */}
        <div className="mt-8 border-t pt-3 flex items-center justify-between text-[11px] text-slate-400">
          <span>
            In bởi: <strong className="text-slate-600">{session?.user?.fullName} ({session?.user?.username})</strong> lúc {formatDateTime(document.printedAt || document.createdAt)}
          </span>
          <span className="font-mono text-[10px]">
            Bảo mật Hash: {document.contentHash ? document.contentHash.slice(0, 16) + '...' : 'DRAFT'}
          </span>
        </div>
      </div>
    </div>
  )
}
