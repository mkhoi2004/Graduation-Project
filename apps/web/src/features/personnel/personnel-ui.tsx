import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10 disabled:bg-slate-50 disabled:text-slate-400';

export const selectClass =
  'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/10';

export function formatVnd(amount: number | null | undefined): string {
  if (amount == null || isNaN(Number(amount))) return '0 đ';
  return `${Math.round(Number(amount)).toLocaleString('vi-VN')} đ`;
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function PageHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-widest text-indigo-600">
          Hành chính Nhân sự & Tiền lương
        </p>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action && <div className="flex flex-wrap items-center gap-2.5">{action}</div>}
    </div>
  );
}

export function Card({
  children,
  className = '',
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <section
      onClick={onClick}
      className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition ${className}`}
    >
      {children}
    </section>
  );
}

export function Message({
  value,
  error = false,
}: {
  value: string;
  error?: boolean;
}) {
  return (
    <p
      className={`rounded-xl px-4 py-2.5 text-sm font-medium ${
        error
          ? 'border border-rose-200 bg-rose-50 text-rose-700'
          : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
      }`}
    >
      {value}
    </p>
  );
}

export function Modal({
  title,
  children,
  onClose,
  maxWidth = 'max-w-2xl',
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div
        className={`w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PaginationBar({
  currentPage,
  totalItems,
  pageSize = 10,
  onPageChange,
  itemName = 'dòng',
}: {
  currentPage: number;
  totalItems: number;
  pageSize?: number;
  onPageChange: (page: number) => void;
  itemName?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis for larger page counts
  const getPageNumbers = (): (number | string)[] => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }
    if (currentPage >= totalPages - 3) {
      return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  const pages = getPageNumbers();

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-5 py-3.5 text-xs text-slate-600">
      <p className="text-slate-500">
        Hiển thị <strong>{start}</strong> - <strong>{end}</strong> trên tổng số <strong>{totalItems}</strong> {itemName} (cố định {pageSize} {itemName}/trang)
      </p>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          Trước
        </button>

        {pages.map((p, idx) =>
          typeof p === 'number' ? (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              className={`flex size-8 items-center justify-center rounded-lg text-xs font-bold transition active:scale-95 ${
                currentPage === p
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'border border-slate-200 text-slate-700 hover:bg-slate-50'
              }`}
            >
              {p}
            </button>
          ) : (
            <span key={`ellipsis-${idx}`} className="px-1 font-bold text-slate-400">
              ...
            </span>
          )
        )}

        <button
          type="button"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
        >
          Sau
        </button>
      </div>
    </div>
  );
}
