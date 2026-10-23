import { useEffect, useState } from 'react';
import { CheckCircle, Edit3, Lock, Plus, Printer, XCircle } from 'lucide-react';
import { personnelApi } from './personnel-api';
import type { Payroll, PayrollItem } from './personnel-types';
import { Card, formatVnd, inputClass, Message, Modal, PageHeading, PaginationBar, selectClass } from './personnel-ui';
import { PersonnelPrintView } from './personnel-print-view';

export function PayrollPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [selectedPayrollId, setSelectedPayrollId] = useState<number>(0);
  const [currentPayroll, setCurrentPayroll] = useState<Payroll | null>(null);
  const [itemPage, setItemPage] = useState(1);
  const [_loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PayrollItem | null>(null);
  const [printingItem, setPrintingItem] = useState<PayrollItem | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  // Form states
  const [createForm, setCreateForm] = useState({
    year: 2026,
    month: 10,
    title: 'Bảng lương cán bộ nhân viên tháng 10/2026',
    standardWorkingDays: 26,
    note: '',
  });

  const [itemForm, setItemForm] = useState({
    allowanceAmount: 0,
    otherBonus: 0,
    overtimePay: 0,
    insuranceDeduction: 0,
    advanceDeduction: 0,
    otherDeduction: 0,
  });

  const [cancelReason, setCancelReason] = useState('');

  const loadData = async (targetId?: number) => {
    try {
      setLoading(true);
      const list = await personnelApi.getPayrolls();
      setPayrolls(list);

      const toSelect = targetId || selectedPayrollId || (list.length > 0 ? list[0].id : 0);
      if (toSelect) {
        setSelectedPayrollId(toSelect);
        const detailed = await personnelApi.getPayrollById(toSelect);
        setCurrentPayroll(detailed);
      } else {
        setCurrentPayroll(null);
      }
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectPayroll = async (id: number) => {
    setSelectedPayrollId(id);
    try {
      setLoading(true);
      const detailed = await personnelApi.getPayrollById(id);
      setCurrentPayroll(detailed);
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePayroll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await personnelApi.createPayroll(createForm);
      setMessage({ text: `Khởi tạo bảng lương ${created.code} thành công!` });
      setShowCreateModal(false);
      loadData(created.id);
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPayroll || !editingItem) return;
    try {
      await personnelApi.updatePayrollItem(currentPayroll.id, editingItem.id, itemForm);
      setMessage({ text: 'Cập nhật điều chỉnh dòng lương thành công!' });
      setEditingItem(null);
      loadData(currentPayroll.id);
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleApprove = async () => {
    if (!currentPayroll) return;
    try {
      await personnelApi.approvePayroll(currentPayroll.id);
      setMessage({ text: `Đã phê duyệt bảng lương ${currentPayroll.code} thành công!` });
      loadData(currentPayroll.id);
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleLock = async () => {
    if (!currentPayroll) return;
    if (!confirm(`Bạn có chắc chắn muốn chốt khóa bảng lương ${currentPayroll.code}? Hệ thống sẽ tự động sinh khoản nợ phải trả sang Kế toán.`)) {
      return;
    }
    try {
      await personnelApi.lockPayroll(currentPayroll.id);
      setMessage({ text: `Đã chốt khóa bảng lương ${currentPayroll.code} và đồng bộ công nợ sang Kế toán!` });
      loadData(currentPayroll.id);
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPayroll) return;
    try {
      await personnelApi.cancelPayroll(currentPayroll.id, { cancelReason });
      setMessage({ text: `Đã hủy bảng lương ${currentPayroll.code}` });
      setShowCancelModal(false);
      loadData(currentPayroll.id);
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  return (
    <div>
      <PageHeading
        title="Quản Lý Bảng Lương & Chi Trả Lương"
        description="Tính lương theo công thực tế, phụ cấp, thưởng dịch vụ 5%, bảo hiểm xã hội và xuất phiếu lương A5"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            Lập bảng lương mới
          </button>
        }
      />

      {message && (
        <div className="mb-6">
          <Message value={message.text} error={message.error} />
        </div>
      )}

      {/* Payroll Selector & Top Actions */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-slate-700">Kỳ bảng lương:</label>
          <select
            value={selectedPayrollId}
            onChange={(e) => handleSelectPayroll(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 shadow-xs"
          >
            {payrolls.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} - Tháng {p.month}/{p.year} ({p.status})
              </option>
            ))}
          </select>
        </div>

        {currentPayroll && (
          <div className="flex items-center gap-2">
            {currentPayroll.status === 'DRAFT' && (
              <button
                onClick={handleApprove}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4" />
                Duyệt bảng lương
              </button>
            )}

            {currentPayroll.status === 'APPROVED' && (
              <button
                onClick={handleLock}
                className="flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-800"
              >
                <Lock className="h-4 w-4" />
                Chốt khóa bảng lương
              </button>
            )}

            {['DRAFT', 'APPROVED'].includes(currentPayroll.status) && (
              <button
                onClick={() => setShowCancelModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
              >
                <XCircle className="h-4 w-4" />
                Hủy bảng lương
              </button>
            )}
          </div>
        )}
      </div>

      {/* KPI Cards for Selected Payroll */}
      {currentPayroll && (
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Card className="border-indigo-100 bg-indigo-50/30">
            <p className="text-xs font-bold text-slate-500 uppercase">Trạng thái kỳ lương</p>
            <div className="mt-2 flex items-center justify-between">
              <span
                className={`rounded-full px-3 py-1 text-xs font-bold ${
                  currentPayroll.status === 'PAID'
                    ? 'bg-emerald-100 text-emerald-800'
                    : currentPayroll.status === 'LOCKED'
                    ? 'bg-blue-100 text-blue-800'
                    : currentPayroll.status === 'APPROVED'
                    ? 'bg-purple-100 text-purple-800'
                    : currentPayroll.status === 'CANCELLED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {currentPayroll.status === 'DRAFT' && 'Bản Nháp (HR lập)'}
                {currentPayroll.status === 'APPROVED' && 'Đã duyệt (Quản lý)'}
                {currentPayroll.status === 'LOCKED' && 'Đã chốt (Khoản nợ Kế toán)'}
                {currentPayroll.status === 'PAID' && 'Đã chi trả (Hoàn tất)'}
                {currentPayroll.status === 'CANCELLED' && 'Đã hủy'}
              </span>
              <p className="text-xs text-slate-400 font-mono">Công chuẩn: {currentPayroll.standardWorkingDays} ngày</p>
            </div>
          </Card>

          <Card>
            <p className="text-xs font-bold text-slate-500 uppercase">Tổng lương gộp</p>
            <p className="mt-1 font-mono text-2xl font-black text-slate-900">
              {formatVnd(currentPayroll.totalGross)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Lương theo công + Phụ cấp + Thưởng</p>
          </Card>

          <Card>
            <p className="text-xs font-bold text-slate-500 uppercase">Tổng các khoản khấu trừ</p>
            <p className="mt-1 font-mono text-2xl font-black text-rose-600">
              -{formatVnd(currentPayroll.totalDeductions)}
            </p>
            <p className="text-xs text-slate-400 mt-1">Bảo hiểm (nhập tay) + Tạm ứng + Khác</p>
          </Card>

          <Card className="border-emerald-200 bg-emerald-50/30">
            <p className="text-xs font-bold text-emerald-800 uppercase">Tổng tiền thực lĩnh</p>
            <p className="mt-1 font-mono text-2xl font-black text-emerald-700">
              {formatVnd(currentPayroll.totalNet)}
            </p>
            <p className="text-xs text-emerald-600 mt-1">Gộp ({formatVnd(currentPayroll.totalGross)}) - Khấu trừ</p>
          </Card>
        </div>
      )}

      {/* Payroll Items Table */}
      {currentPayroll && (
        <Card className="overflow-hidden p-0">
          <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Chi Tiết Bảng Lương Nhân Viên: {currentPayroll.title} ({currentPayroll.items.length} nhân sự)
            </h3>
            <span className="text-xs text-slate-500">Mã chứng từ: <strong className="font-mono text-indigo-700">{currentPayroll.code}</strong></span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-white font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Mã NV</th>
                  <th className="px-4 py-3">Họ và tên</th>
                  <th className="px-4 py-3 text-right">Lương cơ bản</th>
                  <th className="px-4 py-3 text-center">Công (TT/C)</th>
                  <th className="px-4 py-3 text-right">Lương theo công</th>
                  <th className="px-4 py-3 text-right">Phụ cấp</th>
                  <th className="px-4 py-3 text-right">Thưởng DV (5%)</th>
                  <th className="px-4 py-3 text-right font-bold text-slate-900">Lương gộp</th>
                  <th className="px-4 py-3 text-right text-rose-600">Khấu trừ</th>
                  <th className="px-4 py-3 text-right font-black text-emerald-700">Thực nhận</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentPayroll.items.slice((itemPage - 1) * 10, itemPage * 10).map((it) => (
                  <tr key={it.id} className="transition hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono font-bold text-indigo-600">{it.employee.code}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{it.employee.fullName}</p>
                      <p className="text-[11px] text-slate-400">{it.employee.title}</p>
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatVnd(it.baseSalary)}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-slate-700">
                      {it.actualDays}/{it.standardDays}
                    </td>
                    <td className="px-4 py-3 text-right font-mono">{formatVnd(it.attendanceSalary)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatVnd(it.allowanceAmount)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">
                      {formatVnd(it.serviceIncentiveAmount)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      {formatVnd(it.grossSalary)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-rose-600">
                      -{formatVnd(it.totalDeductions)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-black text-emerald-700">
                      {formatVnd(it.netSalary)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {['DRAFT', 'APPROVED'].includes(currentPayroll.status) && (
                          <button
                            onClick={() => {
                              setEditingItem(it);
                              setItemForm({
                                allowanceAmount: it.allowanceAmount,
                                otherBonus: it.otherBonus,
                                overtimePay: it.overtimePay,
                                insuranceDeduction: it.insuranceDeduction,
                                advanceDeduction: it.advanceDeduction,
                                otherDeduction: it.otherDeduction,
                              });
                            }}
                            className="rounded-lg border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100"
                            title="Điều chỉnh phụ cấp & khấu trừ"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => setPrintingItem(it)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100"
                          title="In phiếu lương A5"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PaginationBar
            currentPage={itemPage}
            totalItems={currentPayroll.items.length}
            pageSize={10}
            onPageChange={setItemPage}
            itemName="khoản lương"
          />
        </Card>
      )}

      {/* CREATE PAYROLL MODAL */}
      {showCreateModal && (
        <Modal title="Lập Bảng Lương Mới (DRAFT)" onClose={() => setShowCreateModal(false)} maxWidth="max-w-md">
          <form onSubmit={handleCreatePayroll} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Tháng (*)</label>
                <select
                  value={createForm.month}
                  onChange={(e) => setCreateForm({ ...createForm, month: Number(e.target.value) })}
                  className={selectClass}
                >
                  {[...Array(12)].map((_, i) => (
                    <option key={i + 1} value={i + 1}>
                      Tháng {i + 1}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Năm (*)</label>
                <input
                  required
                  type="number"
                  min="2000"
                  value={createForm.year}
                  onChange={(e) => setCreateForm({ ...createForm, year: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Số công chuẩn của kỳ (*)</label>
              <input
                required
                type="number"
                step="0.5"
                min="1"
                max="31"
                value={createForm.standardWorkingDays}
                onChange={(e) => setCreateForm({ ...createForm, standardWorkingDays: Number(e.target.value) })}
                className={inputClass}
              />
              <p className="mt-0.5 text-[11px] text-indigo-600 font-semibold">
                Chuẩn 26 công theo quy định Bộ luật Lao động & Điểm a3 Khoản 1 Điều 54 Nghị định 145/2020/NĐ-CP
              </p>
            </div>

            <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950">
              <p className="font-bold">Quy chuẩn tính lương theo công (Nghị định 145/2020/NĐ-CP):</p>
              <p className="mt-1 font-mono text-[11px] text-indigo-800">
                Lương theo công = (Lương thỏa thuận ÷ 26) × (Ngày công thực tế + Ngày nghỉ có lương)
              </p>
              <ul className="mt-1 list-disc pl-4 text-[11px] text-slate-600 space-y-0.5">
                <li><strong>Ngày nghỉ có lương:</strong> Phép năm, nghỉ lễ tết, việc riêng có lương theo Bộ luật Lao động.</li>
                <li><strong>Ngày nghỉ không lương:</strong> Không được tính vào số ngày hưởng lương.</li>
              </ul>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Tiêu đề bảng lương (*)</label>
              <input
                required
                type="text"
                value={createForm.title}
                onChange={(e) => setCreateForm({ ...createForm, title: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Khởi tạo bảng lương
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT ITEM MODAL */}
      {editingItem && (
        <Modal
          title={`Điều Chỉnh Lương: ${editingItem.employee.fullName} (${editingItem.employee.code})`}
          onClose={() => setEditingItem(null)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleUpdateItem} className="space-y-4">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-xs">
              <p>Lương cơ bản: <strong>{formatVnd(editingItem.baseSalary)}</strong></p>
              <p>Công thực tế: <strong>{editingItem.actualDays} / {editingItem.standardDays} ngày</strong></p>
              <p>Thưởng dịch vụ 5%: <strong>{formatVnd(editingItem.serviceIncentiveAmount)}</strong></p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Phụ cấp (VNĐ)</label>
                <input
                  type="number"
                  min="0"
                  value={itemForm.allowanceAmount}
                  onChange={(e) => setItemForm({ ...itemForm, allowanceAmount: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Thưởng khác (VNĐ)</label>
                <input
                  type="number"
                  min="0"
                  value={itemForm.otherBonus}
                  onChange={(e) => setItemForm({ ...itemForm, otherBonus: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="mb-1 block text-xs font-bold text-slate-700">Lương làm thêm giờ / Tăng ca (VNĐ)</label>
                <span className="text-[11px] text-indigo-600 font-mono">
                  Đơn giá: {Math.round(editingItem.baseSalary / 208).toLocaleString('vi-VN')} đ/h
                </span>
              </div>
              <input
                type="number"
                min="0"
                value={itemForm.overtimePay}
                onChange={(e) => setItemForm({ ...itemForm, overtimePay: Number(e.target.value) })}
                className={inputClass}
              />
              <p className="mt-0.5 text-[11px] text-slate-500">
                Lương giờ = Lương ÷ (26 × 8). Hệ số tối thiểu: Ngày thường <strong>150%</strong>, Chủ Nhật <strong>200%</strong>, Lễ Tết <strong>300%</strong>.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Bảo hiểm (nhập số tiền)</label>
                <input
                  type="number"
                  min="0"
                  value={itemForm.insuranceDeduction}
                  onChange={(e) => setItemForm({ ...itemForm, insuranceDeduction: Number(e.target.value) })}
                  className={inputClass}
                />
                <p className="mt-0.5 text-[11px] text-slate-400">Số tiền bảo hiểm nhập tay (không dùng tỷ lệ)</p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Tạm ứng lương (VNĐ)</label>
                <input
                  type="number"
                  min="0"
                  value={itemForm.advanceDeduction}
                  onChange={(e) => setItemForm({ ...itemForm, advanceDeduction: Number(e.target.value) })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Khấu trừ khác (phạt đi trễ, khác)</label>
              <input
                type="number"
                min="0"
                value={itemForm.otherDeduction}
                onChange={(e) => setItemForm({ ...itemForm, otherDeduction: Number(e.target.value) })}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Lưu điều chỉnh
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CANCEL MODAL */}
      {showCancelModal && currentPayroll && (
        <Modal title={`Hủy Bảng Lương: ${currentPayroll.code}`} onClose={() => setShowCancelModal(false)} maxWidth="max-w-md">
          <form onSubmit={handleCancel} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Lý do hủy bắt buộc (*)</label>
              <textarea
                required
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Nhập lý do hủy bảng lương..."
                className={inputClass}
              />
            </div>
            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Xác nhận hủy
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* PRINT VIEW A5 MODAL */}
      {printingItem && currentPayroll && (
        <PersonnelPrintView
          payroll={currentPayroll}
          item={printingItem}
          onClose={() => setPrintingItem(null)}
        />
      )}
    </div>
  );
}
