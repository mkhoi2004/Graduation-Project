import { useEffect, useState } from 'react';
import { Briefcase, Building2, Search, Stethoscope, UserMinus, UserPlus, Users } from 'lucide-react';
import { personnelApi } from './personnel-api';
import type { Employee, PersonnelOverviewData } from './personnel-types';
import { Card, formatDate, formatVnd, inputClass, Message, Modal, PageHeading, PaginationBar, selectClass } from './personnel-ui';

export function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [overview, setOverview] = useState<PersonnelOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [department, setDepartment] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<Employee | null>(null);
  const [showTerminateModal, setShowTerminateModal] = useState<Employee | null>(null);

  // Form states
  const [form, setForm] = useState({
    fullName: '',
    dateOfBirth: '1990-01-01',
    gender: 'Nam',
    phone: '',
    email: '',
    address: '',
    citizenId: '',
    title: 'Nhân viên',
    department: 'Khối Hành chính',
    joinDate: '2026-01-01',
    baseSalary: 12000000,
    fixedAllowance: 1500000,
    bankName: 'Vietcombank',
    bankAccountNumber: '',
    bankAccountName: '',
    insuranceCode: '',
    contractNumber: '',
    contractType: 'XAC_DINH_THOI_HAN',
    contractStartDate: '2026-01-01',
    contractEndDate: '',
    note: '',
  });

  const [termForm, setTermForm] = useState({
    terminationDate: new Date().toISOString().split('T')[0],
    terminationReason: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [empList, ovData] = await Promise.all([
        personnelApi.getEmployees({ search, department, status }),
        personnelApi.getOverview(),
      ]);
      setEmployees(empList);
      setOverview(ovData);
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    loadData();
  }, [search, department, status]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await personnelApi.createEmployee(form);
      setMessage({ text: 'Tạo hồ sơ nhân viên mới thành công!' });
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleTerminate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showTerminateModal) return;
    try {
      await personnelApi.terminateEmployee(showTerminateModal.id, termForm);
      setMessage({ text: `Đã xử lý nghỉ việc và khóa tài khoản nhân viên ${showTerminateModal.fullName}` });
      setShowTerminateModal(null);
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  return (
    <div>
      <PageHeading
        title="Quản Lý Hồ Sơ Nhân Sự"
        description="Quản lý thông tin cán bộ nhân viên, chức danh, hợp đồng lao động và tài khoản chi trả lương"
        action={
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            <UserPlus className="h-4 w-4" />
            Thêm nhân viên mới
          </button>
        }
      />

      {message && (
        <div className="mb-6">
          <Message value={message.text} error={message.error} />
        </div>
      )}

      {/* KPI Stats */}
      {overview && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="flex items-center gap-3.5 border-indigo-100 bg-indigo-50/40">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Đang làm việc</p>
              <p className="text-xl font-black text-indigo-700">{overview.employees.totalActive}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-3.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Bác sĩ lâm sàng</p>
              <p className="text-xl font-black text-slate-800">{overview.employees.doctorCount}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-3.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Lễ tân & Tiếp nhận</p>
              <p className="text-xl font-black text-slate-800">{overview.employees.receptionCount}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-3.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Kế toán & Kho</p>
              <p className="text-xl font-black text-slate-800">{overview.employees.accountingCount + overview.employees.warehouseCount}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-3.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-rose-100 text-rose-700">
              <UserMinus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Đã nghỉ việc</p>
              <p className="text-xl font-black text-rose-600">{overview.employees.totalTerminated}</p>
            </div>
          </Card>

          <Card className="flex items-center gap-3.5 border-amber-100 bg-amber-50/30">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-amber-600 text-white">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-500">Chờ duyệt quyền</p>
              <p className="text-xl font-black text-amber-700">{overview.governance.pendingRoleApprovals}</p>
            </div>
          </Card>
        </div>
      )}

      {/* Filter bar */}
      <Card className="mb-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã NV, họ tên, SĐT..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`${inputClass} pl-10`}
            />
          </div>

          <select
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            className={selectClass}
          >
            <option value="">Tất cả phòng ban / Khối</option>
            <option value="Khối Chuyên môn Lâm sàng">Khối Chuyên môn Lâm sàng</option>
            <option value="Phòng Tiếp nhận">Phòng Tiếp nhận</option>
            <option value="Bộ phận Quản lý Kho">Bộ phận Quản lý Kho</option>
            <option value="Phòng Tài chính - Kế toán">Phòng Tài chính - Kế toán</option>
            <option value="Phòng Hành chính - Nhân sự">Phòng Hành chính - Nhân sự</option>
            <option value="Ban Giám Đốc">Ban Giám Đốc</option>
            <option value="Ban Quản Trị">Ban Quản Trị</option>
          </select>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={selectClass}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang làm việc (Active)</option>
            <option value="TERMINATED">Đã nghỉ việc (Terminated)</option>
          </select>

          <button
            onClick={() => {
              setSearch('');
              setDepartment('');
              setStatus('');
            }}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
          >
            Xóa bộ lọc
          </button>
        </div>
      </Card>

      {/* Employees Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Mã NV</th>
                <th className="px-5 py-3.5">Họ và tên</th>
                <th className="px-5 py-3.5">Chức danh & Phòng ban</th>
                <th className="px-5 py-3.5">Số điện thoại</th>
                <th className="px-5 py-3.5">Lương cơ bản</th>
                <th className="px-5 py-3.5">Phụ cấp</th>
                <th className="px-5 py-3.5">Ngày vào làm</th>
                <th className="px-5 py-3.5">Trạng thái</th>
                <th className="px-5 py-3.5 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Đang tải dữ liệu hồ sơ nhân sự...
                  </td>
                </tr>
              ) : employees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    Không tìm thấy nhân viên phù hợp với tiêu chí lọc.
                  </td>
                </tr>
              ) : (
                employees.slice((page - 1) * 10, page * 10).map((emp) => (
                  <tr key={emp.id} className="transition hover:bg-slate-50/60">
                    <td className="px-5 py-4 font-mono font-bold text-indigo-600">{emp.code}</td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-900">{emp.fullName}</p>
                      <p className="text-xs text-slate-400">{emp.gender} • Sinh ngày {formatDate(emp.dateOfBirth)}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium text-slate-800">{emp.title}</p>
                      <p className="text-xs text-slate-500">{emp.department || 'Chưa phân ban'}</p>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-600">{emp.phone}</td>
                    <td className="px-5 py-4 font-mono font-medium text-slate-800">
                      {formatVnd(emp.baseSalary)}
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-600">
                      {formatVnd(emp.fixedAllowance)}
                    </td>
                    <td className="px-5 py-4 text-slate-600">{formatDate(emp.joinDate)}</td>
                    <td className="px-5 py-4">
                      {emp.status === 'ACTIVE' ? (
                        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                          Đang làm
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200">
                          Nghỉ việc
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={async () => {
                            const fullEmp = await personnelApi.getEmployeeById(emp.id);
                            setShowDetailModal(fullEmp);
                          }}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Chi tiết
                        </button>
                        {emp.status === 'ACTIVE' && (
                          <button
                            onClick={() => setShowTerminateModal(emp)}
                            className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                          >
                            Nghỉ việc
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <PaginationBar
          currentPage={page}
          totalItems={employees.length}
          pageSize={10}
          onPageChange={setPage}
        />
      </Card>

      {/* CREATE EMPLOYEE MODAL */}
      {showCreateModal && (
        <Modal title="Thêm Hồ Sơ Nhân Viên Mới" onClose={() => setShowCreateModal(false)} maxWidth="max-w-3xl">
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Họ và tên (*)</label>
                <input
                  required
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="VD: Nguyễn Văn An"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Ngày sinh (*)</label>
                <input
                  required
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Giới tính (*)</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className={selectClass}
                >
                  <option value="Nam">Nam</option>
                  <option value="Nữ">Nữ</option>
                  <option value="Khác">Khác</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Số điện thoại (*)</label>
                <input
                  required
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="VD: 0901234567"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="email@dentalcare.vn"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Số CCCD / CMND</label>
                <input
                  type="text"
                  value={form.citizenId}
                  onChange={(e) => setForm({ ...form, citizenId: e.target.value })}
                  placeholder="079090001234"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Chức danh chuyên môn (*)</label>
                <input
                  required
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="VD: Bác sĩ điều trị, Tiếp nhận..."
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Phòng ban / Khối</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className={selectClass}
                >
                  <option value="Khối Chuyên môn Lâm sàng">Khối Chuyên môn Lâm sàng</option>
                  <option value="Phòng Tiếp nhận">Phòng Tiếp nhận</option>
                  <option value="Bộ phận Quản lý Kho">Bộ phận Quản lý Kho</option>
                  <option value="Phòng Tài chính - Kế toán">Phòng Tài chính - Kế toán</option>
                  <option value="Phòng Hành chính - Nhân sự">Phòng Hành chính - Nhân sự</option>
                  <option value="Ban Giám Đốc">Ban Giám Đốc</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-700">Ngày vào làm (*)</label>
                <input
                  required
                  type="date"
                  value={form.joinDate}
                  onChange={(e) => setForm({ ...form, joinDate: e.target.value })}
                  className={inputClass}
                />
              </div>
            </div>

            {/* Salary & Bank details */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-bold uppercase text-slate-700">Thông tin Lương & Tài khoản chi trả</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Lương cơ bản (VNĐ) (*)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={form.baseSalary}
                    onChange={(e) => setForm({ ...form, baseSalary: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Phụ cấp cố định (VNĐ)</label>
                  <input
                    type="number"
                    min="0"
                    value={form.fixedAllowance}
                    onChange={(e) => setForm({ ...form, fixedAllowance: Number(e.target.value) })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Ngân hàng</label>
                  <input
                    type="text"
                    value={form.bankName}
                    onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Số tài khoản</label>
                  <input
                    type="text"
                    value={form.bankAccountNumber}
                    onChange={(e) => setForm({ ...form, bankAccountNumber: e.target.value })}
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            {/* Contract info */}
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <p className="mb-3 text-xs font-bold uppercase text-slate-700">Hợp đồng lao động ban đầu (Lưu hồ sơ)</p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Số hợp đồng</label>
                  <input
                    type="text"
                    value={form.contractNumber}
                    onChange={(e) => setForm({ ...form, contractNumber: e.target.value })}
                    placeholder="HDLD-2026/01"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Loại hợp đồng</label>
                  <select
                    value={form.contractType}
                    onChange={(e) => setForm({ ...form, contractType: e.target.value })}
                    className={selectClass}
                  >
                    <option value="THU_VIEC">Thử việc</option>
                    <option value="XAC_DINH_THOI_HAN">Xác định thời hạn (1 - 3 năm)</option>
                    <option value="KHONG_THOI_HAN">Không xác định thời hạn</option>
                    <option value="CHUYEN_GIA">Hợp đồng chuyên gia / Cộng tác viên</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-bold text-slate-600">Mã sổ BHXH (nếu có)</label>
                  <input
                    type="text"
                    value={form.insuranceCode}
                    onChange={(e) => setForm({ ...form, insuranceCode: e.target.value })}
                    placeholder="BH79001234"
                    className={inputClass}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                Lưu hồ sơ nhân viên
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* DETAIL MODAL */}
      {showDetailModal && (
        <Modal title={`Hồ Sơ Nhân Viên: ${showDetailModal.fullName} (${showDetailModal.code})`} onClose={() => setShowDetailModal(null)} maxWidth="max-w-2xl">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Mã nhân viên:</span>
                <p className="font-mono font-bold text-indigo-600">{showDetailModal.code}</p>
              </div>
              <div>
                <span className="text-slate-500">Chức danh:</span>
                <p className="font-semibold text-slate-800">{showDetailModal.title}</p>
              </div>
              <div>
                <span className="text-slate-500">Phòng ban:</span>
                <p className="text-slate-800">{showDetailModal.department || 'Chưa phân ban'}</p>
              </div>
              <div>
                <span className="text-slate-500">Phòng khám mặc định:</span>
                <p className="text-slate-800">{showDetailModal.room?.name || 'Toàn viện'}</p>
              </div>
              <div>
                <span className="text-slate-500">Số điện thoại:</span>
                <p className="font-mono text-slate-800">{showDetailModal.phone}</p>
              </div>
              <div>
                <span className="text-slate-500">Email:</span>
                <p className="text-slate-800">{showDetailModal.email || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Số CCCD / CMND:</span>
                <p className="font-mono text-slate-800">{showDetailModal.citizenId || '-'}</p>
              </div>
              <div>
                <span className="text-slate-500">Mã số BHXH:</span>
                <p className="font-mono text-slate-800">{showDetailModal.insuranceCode || '-'}</p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <p className="mb-2 text-xs font-bold uppercase text-slate-700">Tài khoản & Lương cố định</p>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500">Lương cơ bản:</span>
                  <p className="font-mono font-bold text-slate-900">{formatVnd(showDetailModal.baseSalary)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Phụ cấp:</span>
                  <p className="font-mono font-semibold text-slate-800">{formatVnd(showDetailModal.fixedAllowance)}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500">Tài khoản chi lương:</span>
                  <p className="font-mono text-xs font-semibold text-slate-800">
                    {showDetailModal.bankName} - {showDetailModal.bankAccountNumber}
                  </p>
                </div>
              </div>
            </div>

            {/* Contracts list */}
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-slate-700">Lịch sử hợp đồng lao động</p>
              {showDetailModal.contracts && showDetailModal.contracts.length > 0 ? (
                <div className="space-y-2">
                  {showDetailModal.contracts.map((c) => (
                    <div key={c.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{c.contractNumber}</p>
                        <p className="text-slate-500">Loại: {c.contractType} • Hiệu lực từ {formatDate(c.startDate)}</p>
                      </div>
                      <span className="rounded bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">Đang lưu</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Chưa có hợp đồng nào được lưu.</p>
              )}
            </div>

            <div className="flex justify-end pt-3">
              <button
                onClick={() => setShowDetailModal(null)}
                className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* TERMINATE MODAL */}
      {showTerminateModal && (
        <Modal title={`Xác Nhận Nghỉ Việc Nhân Viên: ${showTerminateModal.fullName}`} onClose={() => setShowTerminateModal(null)} maxWidth="max-w-md">
          <form onSubmit={handleTerminate} className="space-y-4">
            <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3 text-xs text-rose-800">
              <p className="font-bold">Lưu ý quan trọng theo quy định hệ thống:</p>
              <ul className="mt-1 list-disc pl-4 space-y-1">
                <li>Hệ thống <strong>không xóa cứng</strong> dữ liệu nhân viên để bảo toàn lịch sử chấm công, phiếu lương.</li>
                <li>Tài khoản đăng nhập liên kết sẽ bị <strong>vô hiệu hóa tức thì</strong>.</li>
                <li>Nếu là bác sĩ, hệ thống sẽ kiểm tra chặn nếu còn ca khám dở dang.</li>
              </ul>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Ngày chính thức nghỉ việc (*)</label>
              <input
                required
                type="date"
                value={termForm.terminationDate}
                onChange={(e) => setTermForm({ ...termForm, terminationDate: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Lý do nghỉ việc bắt buộc (*)</label>
              <textarea
                required
                rows={3}
                value={termForm.terminationReason}
                onChange={(e) => setTermForm({ ...termForm, terminationReason: e.target.value })}
                placeholder="Nhập lý do nghỉ việc theo quyết định nhân sự..."
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowTerminateModal(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-rose-600 px-5 py-2 text-sm font-semibold text-white hover:bg-rose-700"
              >
                Xác nhận nghỉ việc
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
