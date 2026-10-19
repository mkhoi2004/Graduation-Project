import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  CalendarCheck,
  CalendarDays,
  Check,
  Clock,
  Edit3,
  FileSpreadsheet,
  Lock,
  Plus,
  X,
} from 'lucide-react';
import { getSession } from '@/lib/auth-session';
import { personnelApi } from './personnel-api';
import type { AttendanceRecord, Employee, MonthlyAttendanceSummary, ShiftAssignment, WorkShift } from './personnel-types';
import { Card, formatDate, inputClass, Message, Modal, PageHeading, PaginationBar, selectClass } from './personnel-ui';

export function AttendancePage() {
  const session = getSession();
  const currentUserId = session?.user?.id ?? 0;
  const currentUserRole = session?.user?.role ?? '';
  const canApprove = ['ADMIN', 'MANAGER', 'HR'].includes(currentUserRole);

  const [shifts, setShifts] = useState<WorkShift[]>([]);
  const [assignments, setAssignments] = useState<ShiftAssignment[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [summaryList, setSummaryList] = useState<MonthlyAttendanceSummary[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Tabs
  const [activeTab, setActiveTab] = useState<'attendance' | 'summary' | 'shifts'>('attendance');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState(10);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [filterEmployeeId, setFilterEmployeeId] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  // Pagination states (strictly 10 rows per page)
  const pageSize = 10;
  const [attPage, setAttPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [shiftPage, setShiftPage] = useState(1);

  // Modals
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Shift & Assign forms
  const [shiftForm, setShiftForm] = useState({
    code: '',
    name: '',
    startTime: '08:00',
    endTime: '12:00',
    shiftType: 'REGULAR',
  });

  const [assignForm, setAssignForm] = useState({
    employeeId: 0,
    shiftId: 0,
    date: new Date().toISOString().split('T')[0],
    roomId: 1,
    note: '',
  });

  // Adjustment form
  const [adjustForm, setAdjustForm] = useState<{
    id?: number;
    employeeId: number;
    employeeName: string;
    employeeCode: string;
    date: string;
    checkInTime: string;
    checkOutTime: string;
    leaveType: string;
    reason: string;
    note: string;
  }>({
    employeeId: 0,
    employeeName: '',
    employeeCode: '',
    date: new Date().toISOString().split('T')[0],
    checkInTime: '09:00',
    checkOutTime: '18:00',
    leaveType: '',
    reason: '',
    note: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [shiftList, assignList, attList, summaryData, empList] = await Promise.all([
        personnelApi.getShifts(),
        personnelApi.getShiftAssignments({
          employeeId: filterEmployeeId || undefined,
        }),
        personnelApi.getAttendance({
          month: selectedMonth,
          year: selectedYear,
          employeeId: filterEmployeeId || undefined,
        }),
        typeof personnelApi.getAttendanceSummary === 'function'
          ? personnelApi.getAttendanceSummary(selectedYear, selectedMonth)
          : Promise.resolve([]),
        personnelApi.getEmployees({ status: 'ACTIVE' }),
      ]);

      setShifts(shiftList);
      setAssignments(assignList);
      setAttendance(attList);
      setSummaryList(summaryData);
      setEmployees(empList);

      if (empList.length > 0) {
        if (!assignForm.employeeId) setAssignForm((prev) => ({ ...prev, employeeId: empList[0].id }));
        if (!adjustForm.employeeId) {
          setAdjustForm((prev) => ({
            ...prev,
            employeeId: empList[0].id,
            employeeName: empList[0].fullName,
            employeeCode: empList[0].code,
          }));
        }
      }
      if (shiftList.length > 0 && !assignForm.shiftId) {
        setAssignForm((prev) => ({ ...prev, shiftId: shiftList[0].id }));
      }
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    setAttPage(1);
    setSummaryPage(1);
    setShiftPage(1);
  }, [selectedMonth, selectedYear, filterEmployeeId]);

  const handleCreateShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await personnelApi.createShift(shiftForm);
      setMessage({ text: 'Tạo ca làm việc mới thành công!' });
      setShowShiftModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleAssignShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await personnelApi.assignShift({
        employeeId: Number(assignForm.employeeId),
        shiftId: Number(assignForm.shiftId),
        date: assignForm.date,
        roomId: Number(assignForm.roomId),
        note: assignForm.note,
      });
      setMessage({ text: 'Phân ca làm việc thành công!' });
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleOpenAdjustModal = (att?: AttendanceRecord) => {
    if (att) {
      setAdjustForm({
        id: att.id,
        employeeId: att.employeeId,
        employeeName: att.employee.fullName,
        employeeCode: att.employee.code,
        date: att.date.split('T')[0],
        checkInTime: att.checkInTime || '09:00',
        checkOutTime: att.checkOutTime || '18:00',
        leaveType: att.leaveType || '',
        reason: att.adjustmentReason || '',
        note: att.note || '',
      });
    } else {
      const firstEmp = employees[0];
      setAdjustForm({
        employeeId: firstEmp?.id || 0,
        employeeName: firstEmp?.fullName || '',
        employeeCode: firstEmp?.code || '',
        date: new Date().toISOString().split('T')[0],
        checkInTime: '09:00',
        checkOutTime: '18:00',
        leaveType: '',
        reason: '',
        note: '',
      });
    }
    setShowAdjustModal(true);
  };

  const handleSaveAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustForm.reason || !adjustForm.reason.trim()) {
      setMessage({ text: 'Lỗi: Bắt buộc phải nhập lý do điều chỉnh chấm công!', error: true });
      return;
    }

    try {
      await personnelApi.adjustAttendance({
        id: adjustForm.id,
        employeeId: adjustForm.employeeId,
        date: adjustForm.date,
        checkInTime: adjustForm.checkInTime || undefined,
        checkOutTime: adjustForm.checkOutTime || undefined,
        leaveType: adjustForm.leaveType || undefined,
        reason: adjustForm.reason.trim(),
        note: adjustForm.note || undefined,
      });

      setMessage({ text: 'Đã gửi yêu cầu điều chỉnh chấm công thành công (chờ Quản lý duyệt)!' });
      setShowAdjustModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleApproveAdjustment = async (id: number, approved: boolean) => {
    try {
      await personnelApi.approveAttendanceAdjustment(id, {
        approved,
        reason: approved ? 'Quản lý duyệt điều chỉnh' : 'Quản lý từ chối điều chỉnh',
      });
      setMessage({ text: approved ? 'Đã phê duyệt điều chỉnh công thành công!' : 'Đã từ chối điều chỉnh công.' });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleLockMonth = async () => {
    if (
      !confirm(
        `Bạn có chắc chắn muốn khóa chấm công tháng ${selectedMonth}/${selectedYear}? Sau khi khóa, không thể chỉnh sửa trực tiếp.`,
      )
    ) {
      return;
    }
    try {
      const res = await personnelApi.lockAttendance({ year: selectedYear, month: selectedMonth });
      setMessage({ text: res.message });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleExportExcel = () => {
    if (attendance.length === 0) {
      alert('Không có dữ liệu chấm công để xuất Excel.');
      return;
    }

    const headers = [
      'Ngày',
      'Mã NV',
      'Họ và tên',
      'Chức danh',
      'Phòng khám',
      'Trạng thái',
      'Giờ vào',
      'Giờ ra',
      'Số buổi',
      'Công',
      'Đi trễ (phút)',
      'Tăng ca (giờ)',
      'Nguồn',
      'Phê duyệt',
      'Lý do điều chỉnh',
      'Ghi chú',
    ];

    const rows = filteredAttendance.map((a) => [
      formatDate(a.date),
      a.employee.code,
      `"${a.employee.fullName.replace(/"/g, '""')}"`,
      `"${a.employee.title}"`,
      `"${a.employee.room?.name || 'Chung'}"`,
      `"${getStatusLabel(a.status)}"`,
      a.checkInTime || '',
      a.checkOutTime || '',
      a.sessionCount || 0,
      a.workUnits || 0,
      a.lateMinutes || 0,
      a.overtimeHours || 0,
      a.source === 'HR' ? 'HR nhập/sửa' : 'Tự Check-in/out',
      a.approvalStatus || 'APPROVED',
      `"${(a.adjustmentReason || '').replace(/"/g, '""')}"`,
      `"${(a.note || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Bang_Cham_Cong_Thang_${selectedMonth}_${selectedYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status badge styling helper
  const renderStatusBadge = (att: AttendanceRecord) => {
    const s = att.status;
    let badgeClass = 'border border-slate-200 bg-slate-50 text-slate-700';
    let label = getStatusLabel(s);

    if (s === 'DU_NGAY' || s === 'PRESENT') {
      badgeClass = 'border border-emerald-200 bg-emerald-50 text-emerald-800';
    } else if (s === 'DANG_LAM') {
      badgeClass = 'border border-blue-200 bg-blue-50 text-blue-800 animate-pulse';
    } else if (s === 'LATE') {
      badgeClass = 'border border-amber-300 bg-amber-100 text-amber-900 font-semibold';
      label = `Đi trễ (${att.lateMinutes || 0}p)`;
    } else if (s === 'CHI_SANG') {
      badgeClass = 'border border-teal-200 bg-teal-50 text-teal-800';
    } else if (s === 'CHI_CHIEU') {
      badgeClass = 'border border-cyan-200 bg-cyan-50 text-cyan-800';
    } else if (s === 'THIEU_CHECK_OUT') {
      badgeClass = 'border border-amber-300 bg-amber-100 text-amber-900 font-bold';
    } else if (s === 'VANG' || s === 'ABSENT') {
      badgeClass = 'border border-rose-300 bg-rose-100 text-rose-900 font-bold';
    } else if (s === 'NGHI_CO_LUONG' || (s === 'ON_LEAVE' && att.leaveType === 'PAID_LEAVE')) {
      badgeClass = 'border border-indigo-200 bg-indigo-50 text-indigo-800';
      label = 'Nghỉ có lương';
    } else if (s === 'NGHI_KHONG_LUONG' || (s === 'ON_LEAVE' && att.leaveType === 'UNPAID_LEAVE')) {
      badgeClass = 'border border-slate-300 bg-slate-100 text-slate-800';
      label = 'Nghỉ không lương';
    }

    return (
      <div className="flex flex-col gap-1">
        <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeClass}`}>
          {label}
        </span>
        {att.hasLeaveConflict && (
          <span
            className="inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800"
            title={att.conflictNote || 'Xung đột: Chấm công vào ngày nghỉ đã duyệt'}
          >
            <AlertTriangle className="size-3" /> Xung đột nghỉ
          </span>
        )}
      </div>
    );
  };

  // Filter attendance records
  const filteredAttendance = attendance.filter((a) => {
    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PENDING_APPROVAL') return a.approvalStatus === 'PENDING_APPROVAL';
    if (filterStatus === 'HAS_CONFLICT') return a.hasLeaveConflict;
    return a.status === filterStatus;
  });

  const paginatedAttendance = filteredAttendance.slice((attPage - 1) * pageSize, attPage * pageSize);
  const paginatedSummary = summaryList.slice((summaryPage - 1) * pageSize, summaryPage * pageSize);
  const paginatedAssignments = assignments.slice((shiftPage - 1) * pageSize, shiftPage * pageSize);

  return (
    <div className="space-y-6">
      <PageHeading
        title="Quản Lý Công & Ca Trực"
        description="Theo dõi giờ vào/ra từ máy chủ, tự động tính buổi/công, ghi nhận đi trễ, tăng ca, điều chỉnh HR và khóa công theo tháng"
        action={
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenAdjustModal()}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-indigo-700"
            >
              <Edit3 className="size-3.5" />
              HR Bổ sung / Sửa công
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
            >
              <CalendarDays className="size-3.5 text-indigo-600" />
              Phân ca trực
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
              title="Xuất danh sách chấm công ra Excel"
            >
              <FileSpreadsheet className="size-3.5 text-emerald-600" />
              Xuất Excel
            </button>
            <button
              onClick={handleLockMonth}
              className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800 hover:bg-amber-100"
            >
              <Lock className="size-3.5" />
              Khóa công tháng
            </button>
          </div>
        }
      />

      {message && <Message value={message.text} error={message.error} />}

      {/* Main Tabs Navigation */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('attendance')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'attendance'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <CalendarCheck className="size-4" />
            Bảng Chấm Công Hàng Ngày ({attendance.length})
          </button>
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'summary'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <BarChart3 className="size-4" />
            Báo Cáo Tháng Theo Nhân Viên ({summaryList.length})
          </button>
          <button
            onClick={() => setActiveTab('shifts')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition ${
              activeTab === 'shifts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Clock className="size-4" />
            Lịch Phân Ca & Danh Mục Ca ({assignments.length})
          </button>
        </div>

        {/* Global Filters: Month, Year, Employee */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-800"
          >
            {[...Array(12)].map((_, i) => (
              <option key={i + 1} value={i + 1}>
                Tháng {i + 1}
              </option>
            ))}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-800"
          >
            <option value={2026}>Năm 2026</option>
            <option value={2025}>Năm 2025</option>
          </select>

          <select
            value={filterEmployeeId}
            onChange={(e) => setFilterEmployeeId(Number(e.target.value))}
            className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-800"
          >
            <option value={0}>Tất cả nhân viên</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.code} - {emp.fullName}
              </option>
            ))}
          </select>

          {activeTab === 'attendance' && (
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-800"
            >
              <option value="ALL">Tất cả trạng thái</option>
              <option value="DU_NGAY">Đủ ngày (2 buổi)</option>
              <option value="DANG_LAM">Đang làm</option>
              <option value="CHI_SANG">Chỉ buổi sáng</option>
              <option value="CHI_CHIEU">Chỉ buổi chiều</option>
              <option value="THIEU_CHECK_OUT">Thiếu Check-out</option>
              <option value="VANG">Vắng mặt</option>
              <option value="NGHI_CO_LUONG">Nghỉ có lương</option>
              <option value="NGHI_KHONG_LUONG">Nghỉ không lương</option>
              <option value="PENDING_APPROVAL">Chờ duyệt điều chỉnh</option>
              <option value="HAS_CONFLICT">Có xung đột nghỉ</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: DAILY ATTENDANCE TABLE */}
      {activeTab === 'attendance' && (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Ngày</th>
                  <th className="px-4 py-3">Nhân viên</th>
                  <th className="px-4 py-3">Phòng</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Giờ vào / ra</th>
                  <th className="px-4 py-3 text-center">Buổi</th>
                  <th className="px-4 py-3 text-center">Công</th>
                  <th className="px-4 py-3">Đi trễ (phút)</th>
                  <th className="px-4 py-3">Tăng ca (giờ)</th>
                  <th className="px-4 py-3">Nguồn</th>
                  <th className="px-4 py-3">Duyệt</th>
                  <th className="px-4 py-3 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      Đang tải bảng chấm công...
                    </td>
                  </tr>
                ) : paginatedAttendance.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-12 text-center text-slate-400">
                      Chưa có bản ghi chấm công phù hợp bộ lọc trong tháng {selectedMonth}/{selectedYear}.
                    </td>
                  </tr>
                ) : (
                  paginatedAttendance.map((att) => {
                    const isMissingCheckout = att.status === 'THIEU_CHECK_OUT';
                    const isAbsent = att.status === 'VANG' || att.status === 'ABSENT';
                    const isConflict = att.hasLeaveConflict;
                    const isPending = att.approvalStatus === 'PENDING_APPROVAL';

                    let rowBg = 'hover:bg-slate-50/70';
                    if (isMissingCheckout) rowBg = 'bg-amber-50/50 hover:bg-amber-50';
                    if (isAbsent) rowBg = 'bg-rose-50/50 hover:bg-rose-50';
                    if (isConflict) rowBg = 'bg-orange-50/50 hover:bg-orange-50';

                    return (
                      <tr key={att.id} className={`transition ${rowBg}`}>
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">{formatDate(att.date)}</td>
                        <td className="px-4 py-3">
                          <p className="font-bold text-slate-900">{att.employee.fullName}</p>
                          <p className="font-mono text-[11px] text-indigo-600">{att.employee.code}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{att.employee.room?.name || '—'}</td>
                        <td className="px-4 py-3">{renderStatusBadge(att)}</td>
                        <td className="px-4 py-3 font-mono text-slate-800">
                          {att.checkInTime || '—'} &rarr; {att.checkOutTime || '—'}
                          {att.originalCheckInTime && att.originalCheckInTime !== att.checkInTime && (
                            <span className="block text-[10px] text-slate-400 line-through">
                              Gốc: {att.originalCheckInTime}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-bold text-slate-700">{att.sessionCount ?? 0}</td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-700">
                          {Number(att.workUnits ?? 0).toFixed(1)}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {att.lateMinutes > 0 ? (
                            <span className="font-bold text-amber-700">{att.lateMinutes} phút</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono">
                          {Number(att.overtimeHours || 0) > 0 ? (
                            <span className="font-bold text-indigo-700">
                              {Number(att.overtimeHours).toFixed(2)}h
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] text-slate-600">
                            {att.source === 'HR' ? 'HR nhập/sửa' : 'Tự Check-in/out'}
                          </span>
                          {att.isAdjusted && (
                            <span className="ml-1 rounded bg-slate-200 px-1 py-0.5 text-[9px] font-bold text-slate-700">
                              Đã chỉnh
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {isPending ? (
                            <div className="flex items-center gap-1">
                              <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                Chờ duyệt
                              </span>
                              {canApprove && (!att.adjustedById || att.adjustedById !== currentUserId) && (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleApproveAdjustment(att.id, true)}
                                    title="Duyệt điều chỉnh (Maker-Checker)"
                                    className="grid size-5 place-items-center rounded bg-emerald-600 text-white hover:bg-emerald-700"
                                  >
                                    <Check className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleApproveAdjustment(att.id, false)}
                                    title="Từ chối điều chỉnh"
                                    className="grid size-5 place-items-center rounded bg-rose-600 text-white hover:bg-rose-700"
                                  >
                                    <X className="size-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : att.approvalStatus === 'REJECTED' ? (
                            <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800">
                              Từ chối
                            </span>
                          ) : (
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                              Đã duyệt
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {att.isLocked ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                              <Lock className="size-3" /> Khóa
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenAdjustModal(att)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-indigo-600 shadow-2xs hover:bg-slate-50"
                            >
                              Sửa
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredAttendance.length > 0 && (
            <div className="border-t border-slate-100 p-3">
              <PaginationBar
                currentPage={attPage}
                totalItems={filteredAttendance.length}
                pageSize={pageSize}
                onPageChange={setAttPage}
              />
            </div>
          )}
        </Card>
      )}

      {/* TAB 2: MONTHLY SUMMARY REPORT */}
      {activeTab === 'summary' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-900">
            <p className="font-bold text-indigo-950">Nguồn dữ liệu tính công thực tế cho Bảng lương:</p>
            <p className="mt-1 leading-relaxed">
              <strong>Tổng công thực tế</strong> ở bảng dưới được cộng dồn từ các ngày công Đã duyệt (hỗ trợ số lẻ 0.5
              công). Khi HR tạo Bảng lương tháng {selectedMonth}/{selectedYear}, hệ thống sẽ tự động lấy số công này đưa
              vào cột ngày công thực tế của nhân viên.
            </p>
          </div>

          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Mã NV</th>
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Chức danh</th>
                    <th className="px-4 py-3 text-center">Tổng công thực tế</th>
                    <th className="px-4 py-3 text-center">Đi trễ (phút)</th>
                    <th className="px-4 py-3 text-center">Tăng ca (giờ)</th>
                    <th className="px-4 py-3 text-center">Thiếu check-out</th>
                    <th className="px-4 py-3 text-center">Nghỉ phép</th>
                    <th className="px-4 py-3 text-center">Vắng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedSummary.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-400">
                        Chưa có dữ liệu tổng hợp tháng {selectedMonth}/{selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    paginatedSummary.map((sum) => (
                      <tr key={sum.employeeId} className="hover:bg-slate-50/70 transition">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{sum.employeeCode}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{sum.fullName}</td>
                        <td className="px-4 py-3 text-slate-500">{sum.title}</td>
                        <td className="px-4 py-3 text-center font-bold text-indigo-700 text-sm">
                          {sum.totalWorkUnits.toFixed(1)} công
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {sum.totalLateMinutes > 0 ? (
                            <span className="font-bold text-amber-700">{sum.totalLateMinutes}p</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-mono">
                          {sum.totalOvertimeHours > 0 ? (
                            <span className="font-bold text-indigo-700">{sum.totalOvertimeHours.toFixed(2)}h</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {sum.missingCheckoutCount > 0 ? (
                            <span className="rounded bg-amber-100 px-2 py-0.5 font-bold text-amber-800">
                              {sum.missingCheckoutCount} ngày
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center text-slate-600">
                          {sum.paidLeaveDays > 0 ? `${sum.paidLeaveDays} ngày (có lương)` : '0'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {sum.absentDays > 0 ? (
                            <span className="font-bold text-rose-600">{sum.absentDays} ngày</span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {summaryList.length > 0 && (
              <div className="border-t border-slate-100 p-3">
                <PaginationBar
                  currentPage={summaryPage}
                  totalItems={summaryList.length}
                  pageSize={pageSize}
                  onPageChange={setSummaryPage}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 3: SHIFTS & ASSIGNMENTS */}
      {activeTab === 'shifts' && (
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Danh Mục Các Ca Làm Việc & Ca Trực</h3>
                <p className="text-xs text-slate-500">Cấu hình ca thường, ca trực phòng khám</p>
              </div>
              <button
                onClick={() => setShowShiftModal(true)}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Plus className="size-3.5 text-indigo-600" />
                Thêm ca làm việc
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              {shifts.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-mono text-xs font-bold text-indigo-600">{s.code}</p>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800">
                      {s.shiftType === 'ON_DUTY' ? 'Ca trực' : 'Ca thường'}
                    </span>
                  </div>
                  <p className="mt-1 font-bold text-slate-900">{s.name}</p>
                  <p className="mt-1 font-mono text-xs text-slate-600">
                    Khung giờ: {s.startTime} - {s.endTime}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* Assignments Table */}
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Lịch Phân Ca Nhân Sự</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-white text-slate-500 font-bold uppercase">
                  <tr>
                    <th className="px-4 py-3">Ngày trực</th>
                    <th className="px-4 py-3">Mã NV</th>
                    <th className="px-4 py-3">Họ và tên</th>
                    <th className="px-4 py-3">Ca làm việc</th>
                    <th className="px-4 py-3">Khung giờ</th>
                    <th className="px-4 py-3">Phòng khám</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Chưa có lịch phân ca trong kỳ này.
                      </td>
                    </tr>
                  ) : (
                    paginatedAssignments.map((sa) => (
                      <tr key={sa.id} className="transition hover:bg-slate-50/60">
                        <td className="px-4 py-3 font-mono font-semibold text-slate-700">{formatDate(sa.date)}</td>
                        <td className="px-4 py-3 font-mono font-bold text-indigo-600">{sa.employee.code}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{sa.employee.fullName}</td>
                        <td className="px-4 py-3 text-slate-800">{sa.shift.name}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">
                          {sa.shift.startTime} - {sa.shift.endTime}
                        </td>
                        <td className="px-4 py-3 font-semibold text-indigo-700">
                          {sa.room?.name || 'Toàn phòng khám'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {assignments.length > 0 && (
              <div className="border-t border-slate-100 p-3">
                <PaginationBar
                  currentPage={shiftPage}
                  totalItems={assignments.length}
                  pageSize={pageSize}
                  onPageChange={setShiftPage}
                />
              </div>
            )}
          </Card>
        </div>
      )}

      {/* HR ADJUST ATTENDANCE MODAL */}
      {showAdjustModal && (
        <Modal
          title={`HR Điều Chỉnh / Bổ Sung Giờ Công - ${adjustForm.employeeName}`}
          onClose={() => setShowAdjustModal(false)}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSaveAdjustment} className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900 leading-relaxed">
              <p className="font-bold">Quy tắc điều chỉnh và Maker-Checker:</p>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                <li>Bắt buộc phải có lý do điều chỉnh để lưu audit log.</li>
                <li>Giá trị gốc của giờ vào/ra sẽ được bảo lưu vĩnh viễn.</li>
                <li>Sau khi lưu, trạng thái chuyển sang "Chờ duyệt", cần Quản lý duyệt (người duyệt ≠ người sửa).</li>
              </ul>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Nhân viên (*)</label>
              <select
                value={adjustForm.employeeId}
                onChange={(e) => {
                  const emp = employees.find((em) => em.id === Number(e.target.value));
                  setAdjustForm({
                    ...adjustForm,
                    employeeId: Number(e.target.value),
                    employeeName: emp?.fullName || '',
                    employeeCode: emp?.code || '',
                  });
                }}
                className={selectClass}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.code} - {emp.fullName} ({emp.title})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Ngày (*)</label>
                <input
                  required
                  type="date"
                  max={new Date().toISOString().split('T')[0]}
                  value={adjustForm.date}
                  onChange={(e) => setAdjustForm({ ...adjustForm, date: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Loại nghỉ phép (nếu có)</label>
                <select
                  value={adjustForm.leaveType}
                  onChange={(e) => setAdjustForm({ ...adjustForm, leaveType: e.target.value })}
                  className={selectClass}
                >
                  <option value="">Đi làm bình thường</option>
                  <option value="PAID_LEAVE">Nghỉ phép hưởng nguyên lương</option>
                  <option value="UNPAID_LEAVE">Nghỉ không hưởng lương</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Giờ vào (HH:mm)</label>
                <input
                  type="time"
                  value={adjustForm.checkInTime}
                  onChange={(e) => setAdjustForm({ ...adjustForm, checkInTime: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Giờ ra (HH:mm)</label>
                <input
                  type="time"
                  value={adjustForm.checkOutTime}
                  onChange={(e) => setAdjustForm({ ...adjustForm, checkOutTime: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Lý do điều chỉnh <span className="text-rose-500">* (Bắt buộc)</span>
              </label>
              <textarea
                required
                rows={2}
                placeholder="VD: Quên bấm check-out do cấp cứu bệnh nhân ngoài giờ, đã xác nhận với trưởng ca..."
                value={adjustForm.reason}
                onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Ghi chú thêm</label>
              <input
                type="text"
                placeholder="Ghi chú nội bộ..."
                value={adjustForm.note}
                onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAdjustModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Lưu điều chỉnh
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* CREATE SHIFT MODAL */}
      {showShiftModal && (
        <Modal title="Thêm Ca Làm Việc Mới" onClose={() => setShowShiftModal(false)} maxWidth="max-w-md">
          <form onSubmit={handleCreateShift} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Mã ca (*)</label>
              <input
                required
                type="text"
                value={shiftForm.code}
                onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value.toUpperCase() })}
                placeholder="VD: CA_GAY, CA_DEM"
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Tên ca làm việc (*)</label>
              <input
                required
                type="text"
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                placeholder="VD: Ca sáng, Ca trực đêm..."
                className={inputClass}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Giờ bắt đầu</label>
                <input
                  type="time"
                  required
                  value={shiftForm.startTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Giờ kết thúc</label>
                <input
                  type="time"
                  required
                  value={shiftForm.endTime}
                  onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Loại ca</label>
              <select
                value={shiftForm.shiftType}
                onChange={(e) => setShiftForm({ ...shiftForm, shiftType: e.target.value })}
                className={selectClass}
              >
                <option value="REGULAR">Ca thường</option>
                <option value="ON_DUTY">Ca trực</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowShiftModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Lưu ca làm việc
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ASSIGN SHIFT MODAL */}
      {showAssignModal && (
        <Modal title="Phân Ca Làm Việc Cán Bộ Nhân Viên" onClose={() => setShowAssignModal(false)} maxWidth="max-w-md">
          <form onSubmit={handleAssignShift} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Chọn nhân viên (*)</label>
              <select
                value={assignForm.employeeId}
                onChange={(e) => setAssignForm({ ...assignForm, employeeId: Number(e.target.value) })}
                className={selectClass}
              >
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.code} - {emp.fullName} ({emp.title})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Chọn ca (*)</label>
              <select
                value={assignForm.shiftId}
                onChange={(e) => setAssignForm({ ...assignForm, shiftId: Number(e.target.value) })}
                className={selectClass}
              >
                {shifts.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.startTime} - {s.endTime})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Ngày phân ca (*)</label>
              <input
                required
                type="date"
                value={assignForm.date}
                onChange={(e) => setAssignForm({ ...assignForm, date: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Phòng khám / Ghế điều trị</label>
              <select
                value={assignForm.roomId}
                onChange={(e) => setAssignForm({ ...assignForm, roomId: Number(e.target.value) })}
                className={selectClass}
              >
                <option value={1}>Phòng khám 01 (Cơ bản & Tổng quát)</option>
                <option value={2}>Phòng khám 02 (Thẩm mỹ & Chỉnh nha)</option>
                <option value={3}>Phòng khám 03 (Tiểu phẫu răng khôn & Implant)</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2 text-xs font-bold text-white hover:bg-indigo-700"
              >
                Lưu phân ca
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function getStatusLabel(status?: string): string {
  switch (status) {
    case 'DU_NGAY':
    case 'PRESENT':
      return 'Đủ ngày (2 buổi)';
    case 'DANG_LAM':
      return 'Đang làm việc';
    case 'CHI_SANG':
      return 'Chỉ buổi sáng';
    case 'CHI_CHIEU':
      return 'Chỉ buổi chiều';
    case 'THIEU_CHECK_OUT':
      return 'Thiếu Check-out';
    case 'LATE':
      return 'Đi trễ';
    case 'VANG':
    case 'ABSENT':
      return 'Vắng mặt';
    case 'NGHI_CO_LUONG':
      return 'Nghỉ có lương';
    case 'NGHI_KHONG_LUONG':
      return 'Nghỉ không lương';
    case 'CHUA_CHECK_IN':
      return 'Chưa Check-in';
    default:
      return status || 'Chưa Check-in';
  }
}
