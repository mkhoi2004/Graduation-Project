import { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Stethoscope, UserCheck } from 'lucide-react';
import { personnelApi } from './personnel-api';
import type { Employee, ServiceIncentive } from './personnel-types';
import { Card, formatDate, formatVnd, Message, PageHeading, PaginationBar, selectClass } from './personnel-ui';

export function IncentivePage() {
  const [incentives, setIncentives] = useState<ServiceIncentive[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleType, setRoleType] = useState('');
  const [status, setStatus] = useState('');
  const [employeeId, setEmployeeId] = useState(0);
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [list, empList] = await Promise.all([
        personnelApi.getIncentives({
          roleType: roleType || undefined,
          status: status || undefined,
          employeeId: employeeId || undefined,
        }),
        personnelApi.getEmployees({ status: 'ACTIVE' }),
      ]);
      setIncentives(list);
      setEmployees(empList);
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadData();
  }, [roleType, status, employeeId]);

  const handleSync = async () => {
    try {
      setLoading(true);
      const res = await personnelApi.syncIncentives();
      setMessage({ text: `Đồng bộ thành công: Đã tính thưởng cho ${res.createdCount} dòng dịch vụ mới!` });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  const totalValidIncentive = incentives
    .filter((i) => i.status === 'VALID')
    .reduce((sum, it) => sum + it.incentiveAmount, 0);

  const doctorTotal = incentives
    .filter((i) => i.status === 'VALID' && i.roleType === 'DOCTOR')
    .reduce((sum, it) => sum + it.incentiveAmount, 0);

  const receptionTotal = incentives
    .filter((i) => i.status === 'VALID' && i.roleType === 'RECEPTION')
    .reduce((sum, it) => sum + it.incentiveAmount, 0);

  return (
    <div>
      <PageHeading
        title="Quản Lý Thưởng Theo Dịch Vụ Nha Khoa"
        description="Tính thưởng 5% cho bác sĩ thực hiện và 5% cho nhân viên tiếp nhận trên từng dòng dịch vụ hoàn thành"
        action={
          <button
            onClick={handleSync}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <RefreshCw className="h-4 w-4" />
            Đồng bộ thưởng từ ca khám
          </button>
        }
      />

      {message && (
        <div className="mb-6">
          <Message value={message.text} error={message.error} />
        </div>
      )}

      {/* Overview Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-indigo-100 bg-indigo-50/40">
          <p className="text-xs font-bold text-slate-500 uppercase">Tổng tiền thưởng hợp lệ</p>
          <p className="mt-1 font-mono text-2xl font-black text-indigo-700">
            {formatVnd(totalValidIncentive)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Đã sẵn sàng chuyển sang kỳ bảng lương</p>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Thưởng Bác sĩ (5%)</p>
              <p className="font-mono text-xl font-bold text-slate-900">{formatVnd(doctorTotal)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Người trực tiếp điều trị ca khám</p>
        </Card>

        <Card>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <UserCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-500 uppercase">Thưởng Tiếp nhận (5%)</p>
              <p className="font-mono text-xl font-bold text-slate-900">{formatVnd(receptionTotal)}</p>
            </div>
          </div>
          <p className="mt-2 text-xs text-slate-400">Nhân viên tiếp nhận chỉ định dịch vụ</p>
        </Card>
      </div>

      {/* Rules Banner */}
      <div className="mb-6 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-4 text-xs text-indigo-900">
        <p className="font-bold">Nguyên tắc tính thưởng chuẩn xác theo tài liệu đặc tả:</p>
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-white p-2.5 border border-indigo-100">
            <strong className="text-slate-800">1. Không phụ thuộc thu tiền:</strong>
            <p className="mt-0.5 text-slate-600">Thưởng tính ngay khi ca khám Hoàn thành và ghi sổ doanh thu sang Kế toán, không chờ thu đủ tiền từ bệnh nhân.</p>
          </div>
          <div className="rounded-lg bg-white p-2.5 border border-indigo-100">
            <strong className="text-slate-800">2. Độc lập 5% + 5%:</strong>
            <p className="mt-0.5 text-slate-600">Bác sĩ nhận 5%, Tiếp nhận nhận 5% tính độc lập trên số tiền dịch vụ gốc (tổng 10%, không chia đôi).</p>
          </div>
          <div className="rounded-lg bg-white p-2.5 border border-indigo-100">
            <strong className="text-slate-800">3. Xử lý hoàn tiền:</strong>
            <p className="mt-0.5 text-slate-600">Hoàn toàn bộ dòng dịch vụ $\rightarrow$ Thưởng = 0. Nếu xảy ra sau khi bảng lương đã chốt $\rightarrow$ gắn cờ "Cần xử lý" để trừ tay ở kỳ sau.</p>
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <select
            value={employeeId}
            onChange={(e) => setEmployeeId(Number(e.target.value))}
            className={selectClass}
          >
            <option value={0}>Tất cả người nhận thưởng</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.code} - {emp.fullName}
              </option>
            ))}
          </select>

          <select
            value={roleType}
            onChange={(e) => setRoleType(e.target.value)}
            className={selectClass}
          >
            <option value="">Tất cả vai trò</option>
            <option value="DOCTOR">Bác sĩ thực hiện (5%)</option>
            <option value="RECEPTION">Nhân viên tiếp nhận (5%)</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="VALID">Hợp lệ (Được tính lương)</option>
            <option value="PAUSED">Tạm dừng (Mở khóa ca)</option>
            <option value="EXCLUDED">Bị loại (Hoàn tiền toàn bộ)</option>
            <option value="NEEDS_ATTENTION">Cần xử lý (Hoàn tiền sau chốt)</option>
          </select>

          <button
            onClick={() => {
              setRoleType('');
              setStatus('');
              setEmployeeId(0);
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Xóa bộ lọc
          </button>
        </div>
      </Card>

      {/* Incentives Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50/70 font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Dịch vụ nha khoa</th>
                <th className="px-5 py-3.5 text-right">Doanh thu gốc</th>
                <th className="px-5 py-3.5">Người nhận thưởng</th>
                <th className="px-5 py-3.5">Vai trò nhận</th>
                <th className="px-5 py-3.5 text-center">Tỷ lệ</th>
                <th className="px-5 py-3.5 text-right font-bold text-slate-900">Tiền thưởng (VNĐ)</th>
                <th className="px-5 py-3.5">Ngày hoàn thành</th>
                <th className="px-5 py-3.5">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Đang tải danh sách thưởng theo dịch vụ...
                  </td>
                </tr>
              ) : incentives.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Chưa có dòng thưởng nào được ghi nhận.
                  </td>
                </tr>
              ) : (
                incentives.slice((page - 1) * 10, page * 10).map((inc) => (
                  <tr key={inc.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{inc.serviceName}</p>
                      <p className="text-[11px] text-slate-400">Mã dòng DV: #{inc.intakeServiceId}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono font-medium text-slate-700">
                      {formatVnd(inc.serviceAmount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-bold text-slate-900">{inc.employee.fullName}</p>
                      <p className="font-mono text-[11px] text-indigo-600">{inc.employee.code}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      {inc.roleType === 'DOCTOR' ? (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                          Bác sĩ điều trị
                        </span>
                      ) : (
                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-blue-700 border border-blue-200">
                          Tiếp nhận chỉ định
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-600">
                      {inc.rate}%
                    </td>
                    <td className="px-5 py-3.5 text-right font-mono text-sm font-black text-indigo-700">
                      {formatVnd(inc.incentiveAmount)}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{formatDate(inc.completedAt)}</td>
                    <td className="px-5 py-3.5">
                      {inc.status === 'VALID' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Hợp lệ
                        </span>
                      )}
                      {inc.status === 'PAUSED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                          <Clock className="h-3.5 w-3.5 text-amber-500" /> Tạm dừng (Mở khóa)
                        </span>
                      )}
                      {inc.status === 'EXCLUDED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                          Bị loại (Hoàn tiền)
                        </span>
                      )}
                      {inc.status === 'NEEDS_ATTENTION' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          <AlertCircle className="h-3.5 w-3.5" /> Cần xử lý kỳ sau
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          currentPage={page}
          totalItems={incentives.length}
          pageSize={10}
          onPageChange={setPage}
        />
      </Card>
    </div>
  );
}
