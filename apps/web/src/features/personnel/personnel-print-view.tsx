import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Printer, X } from 'lucide-react';
import type { Payroll, PayrollItem } from './personnel-types';
import { formatDate, formatVnd } from './personnel-ui';

function readVietnameseCurrency(num: number | null | undefined): string {
  if (!num || isNaN(num) || num === 0) return 'Không đồng';
  const units = ['', 'nghìn', 'triệu', 'tỷ'];
  const digits = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

  function readTriple(n: number, full: boolean): string {
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;
    let res = '';

    if (h > 0 || full) {
      res += `${digits[h]} trăm `;
    }

    if (t > 1) {
      res += `${digits[t]} mươi `;
      if (u === 1) res += 'mốt ';
      else if (u === 5) res += 'lăm ';
      else if (u > 0) res += `${digits[u]} `;
    } else if (t === 1) {
      res += 'mười ';
      if (u === 1) res += 'một ';
      else if (u === 5) res += 'lăm ';
      else if (u > 0) res += `${digits[u]} `;
    } else if (t === 0 && u > 0) {
      if (h > 0 || full) res += 'lẻ ';
      res += `${digits[u]} `;
    }

    return res.trim();
  }

  const s = Math.abs(Math.round(num)).toString();
  const blocks: number[] = [];
  for (let i = s.length; i > 0; i -= 3) {
    blocks.push(Number(s.substring(Math.max(0, i - 3), i)));
  }

  let text = '';
  for (let i = blocks.length - 1; i >= 0; i--) {
    const val = blocks[i];
    if (val > 0) {
      const read = readTriple(val, i < blocks.length - 1);
      text += `${read} ${units[i]} `;
    }
  }

  text = text.trim();
  text = text.charAt(0).toUpperCase() + text.slice(1) + ' đồng chẵn';
  return text;
}

export function PersonnelPrintView({
  payroll,
  item,
  onClose,
}: {
  payroll: Payroll;
  item: PayrollItem;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrint = () => {
    window.print();
  };

  const now = new Date();
  const printTimeStr = `${now.toLocaleTimeString('vi-VN')} - ${formatDate(now.toISOString())}`;
  const mockSecurityHash = `REF-PAYROLL-${payroll.code}-${item.employee.code}-${item.netSalary}`;

  return typeof window !== 'undefined'
    ? createPortal(
        <div
          id="dental-print-portal"
          className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 p-4 sm:p-6 backdrop-blur-sm print:static print:overflow-visible print:bg-white print:p-0"
        >
          <div className="mx-auto flex min-h-full max-w-[650px] flex-col items-center justify-start py-6 print:max-w-none print:py-0 print:block print:min-h-0">
            {/* On-screen action toolbar */}
            <div className="no-print mb-3 flex w-full items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Xem trước bản in phiếu lương chuẩn khổ A5 dọc &amp; In PDF
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-mono text-xs font-bold text-indigo-600">{payroll.code}</span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handlePrint}
                  className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700"
                >
                  <Printer className="h-4 w-4" />
                  In phiếu lương
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* PRINT CONTENT - STRICT DENTAL A5 PORTRAIT (148mm x 210mm) */}
            <div
              id="payroll-print-content"
              className="printable-document relative w-full rounded-2xl border border-slate-200/80 bg-white p-6 sm:p-8 text-slate-900 shadow-2xl print:rounded-none print:border-none print:p-0 print:shadow-none"
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-700">PHÒNG KHÁM NHA KHOA KHOIDENT</p>
                  <p className="text-[11px] text-slate-500">123 Nguyễn Trãi, Phường Bến Thành, Quận 1, TP. Hồ Chí Minh</p>
                  <p className="text-[11px] text-slate-500">Hotline: 1900 6868 • MST: 0312345678</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xs font-bold text-indigo-700">{payroll.code}</p>
                  <p className="text-[11px] font-mono text-slate-400">Mã NV: {item.employee.code}</p>
                </div>
              </div>

              {/* Title */}
              <div className="my-4 text-center">
                <h1 className="text-lg font-black uppercase tracking-tight text-slate-950">
                  PHIẾU LƯƠNG NHÂN VIÊN
                </h1>
                <p className="text-xs font-semibold text-slate-600">
                  Kỳ lương: Tháng {payroll.month}/{payroll.year} (Chuẩn: {item.standardDays} ngày)
                </p>
              </div>

              {/* Employee Info */}
              <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs">
                <div className="grid grid-cols-2 gap-y-1.5">
                  <p>
                    <span className="text-slate-500">Họ và tên:</span>{' '}
                    <strong className="text-slate-900">{item.employee.fullName}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Chức danh:</span>{' '}
                    <strong className="text-slate-900">{item.employee.title}</strong>
                  </p>
                  <p>
                    <span className="text-slate-500">Bộ phận / Khối:</span>{' '}
                    <span className="text-slate-800">{item.employee.department || 'Chưa phân ban'}</span>
                  </p>
                  <p>
                    <span className="text-slate-500">Ngày công thực tế:</span>{' '}
                    <strong className="text-indigo-700">{item.actualDays} / {item.standardDays} ngày</strong>
                  </p>
                  <p className="col-span-2">
                    <span className="text-slate-500">Tài khoản nhận:</span>{' '}
                    <span className="font-mono text-slate-800">
                      {item.employee.bankName} - {item.employee.bankAccountNumber} ({item.employee.bankAccountName || item.employee.fullName})
                    </span>
                  </p>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="mb-4 overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100 font-bold uppercase text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left">Khoản mục thu nhập</th>
                      <th className="px-3 py-2 text-right">Số tiền (VNĐ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="px-3 py-1.5">1. Lương cơ bản tháng</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatVnd(item.baseSalary)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-medium text-slate-900">
                        2. Lương theo ngày công thực tế ({item.actualDays}/{item.standardDays} ngày)
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                        {formatVnd(item.attendanceSalary)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5">3. Phụ cấp cố định &amp; phát sinh</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatVnd(item.allowanceAmount)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 font-medium text-indigo-700">
                        4. Thưởng chuyên môn theo dịch vụ (5%)
                      </td>
                      <td className="px-3 py-1.5 text-right font-mono font-bold text-indigo-700">
                        {formatVnd(item.serviceIncentiveAmount)}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5">5. Thưởng khác &amp; Tăng ca ngoài giờ</td>
                      <td className="px-3 py-1.5 text-right font-mono">{formatVnd(item.otherBonus + item.overtimePay)}</td>
                    </tr>
                    <tr className="bg-indigo-50/50 font-bold text-indigo-900">
                      <td className="px-3 py-2">TỔNG THU NHẬP (LƯƠNG GỘP)</td>
                      <td className="px-3 py-2 text-right font-mono text-sm">{formatVnd(item.grossSalary)}</td>
                    </tr>

                    <tr className="bg-slate-50 font-bold uppercase text-slate-700">
                      <td colSpan={2} className="px-3 py-1.5">Các khoản khấu trừ</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 text-slate-600">- Trừ bảo hiểm xã hội (nhập tay)</td>
                      <td className="px-3 py-1.5 text-right font-mono text-rose-600">-{formatVnd(item.insuranceDeduction)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 text-slate-600">- Tạm ứng lương trong kỳ</td>
                      <td className="px-3 py-1.5 text-right font-mono text-rose-600">-{formatVnd(item.advanceDeduction)}</td>
                    </tr>
                    <tr>
                      <td className="px-3 py-1.5 text-slate-600">- Khấu trừ khác (phạt đi trễ, khác)</td>
                      <td className="px-3 py-1.5 text-right font-mono text-rose-600">-{formatVnd(item.otherDeduction)}</td>
                    </tr>
                    <tr className="bg-rose-50/50 font-bold text-rose-900">
                      <td className="px-3 py-2">TỔNG CÁC KHOẢN KHẤU TRỪ</td>
                      <td className="px-3 py-2 text-right font-mono text-sm">-{formatVnd(item.totalDeductions)}</td>
                    </tr>

                    <tr className="border-t-2 border-emerald-600 bg-emerald-50 font-black text-emerald-900">
                      <td className="px-3 py-2.5 text-sm uppercase">SỐ TIỀN THỰC LĨNH (THỰC NHẬN)</td>
                      <td className="px-3 py-2.5 text-right font-mono text-base text-emerald-700">
                        {formatVnd(item.netSalary)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Amount in words */}
              <p className="mb-4 text-xs italic text-slate-700">
                Số tiền viết bằng chữ: <strong>{readVietnameseCurrency(item.netSalary)}</strong>
              </p>

              {/* Signatures */}
              <div className="mt-6 grid grid-cols-3 text-center text-xs">
                <div>
                  <p className="font-bold text-slate-800">Người lập biểu</p>
                  <p className="italic text-[10px] text-slate-400">(Ký, họ tên)</p>
                  <div className="h-14"></div>
                  <p className="font-semibold text-slate-700">{payroll.createdBy?.fullName || 'Lê Thị Nhân Sự'}</p>
                </div>

                <div>
                  <p className="font-bold text-slate-800">Kế toán trưởng</p>
                  <p className="italic text-[10px] text-slate-400">(Ký, họ tên)</p>
                  <div className="h-14"></div>
                  <p className="font-semibold text-slate-700">Hoàng Thị Kế Toán</p>
                </div>

                <div>
                  <p className="font-bold text-slate-800">Người nhận tiền</p>
                  <p className="italic text-[10px] text-slate-400">(Ký, xác nhận)</p>
                  <div className="h-14"></div>
                  <p className="font-semibold text-slate-700">{item.employee.fullName}</p>
                </div>
              </div>

              {/* Footer Security Hash */}
              <div className="mt-8 flex items-center justify-between border-t border-dashed border-slate-300 pt-2 font-mono text-[10px] text-slate-400">
                <span>In lúc: {printTimeStr}</span>
                <span>Mã bảo mật: {mockSecurityHash}</span>
              </div>
            </div>
          </div>
        </div>,
        window.document.body,
      )
    : null;
}
