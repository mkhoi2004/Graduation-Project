import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Lock,
  Search,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  Unlock,
  UserCheck,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { personnelApi } from './personnel-api';
import type { Employee, UserAccount, UserRoleAssignment } from './personnel-types';
import { Card, inputClass, Message, Modal, PageHeading, PaginationBar, selectClass } from './personnel-ui';

export function AccessPage() {
  const [activeTab, setActiveTab] = useState<'ACCOUNTS' | 'PERMISSIONS'>('ACCOUNTS');
  const [userPage, setUserPage] = useState(1);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [assignments, setAssignments] = useState<UserRoleAssignment[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [roles, setRoles] = useState<Array<{ id: number; code: string; name: string; description: string }>>([]);
  const [forbiddenCombos, setForbiddenCombos] = useState<Array<{ roleA: string; roleB: string; reason: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  // User filters
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('');

  // Create User Modal
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createUserForm, setCreateUserForm] = useState({
    username: '',
    fullName: '',
    password: 'Dental@123',
    roleId: 0,
    employeeId: 0,
  });

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState<UserAccount | null>(null);
  const [newPassword, setNewPassword] = useState('Dental@123');

  // Assign Role Modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number>(0);
  const [selectedRoleId, setSelectedRoleId] = useState<number>(0);
  const [isPrimary, setIsPrimary] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [userList, assignList, roleData, empList] = await Promise.all([
        personnelApi.getUserAccounts(),
        personnelApi.getUserRoleAssignments(),
        personnelApi.getRoles(),
        personnelApi.getEmployees({ status: 'ACTIVE' }),
      ]);
      setUsers(userList);
      setAssignments(assignList);
      setRoles(roleData.roles);
      setForbiddenCombos(roleData.forbiddenCombinations || []);
      setEmployees(empList);

      if (userList.length > 0 && selectedUserId === 0) {
        setSelectedUserId(userList[0].id);
      }
      if (roleData.roles.length > 0) {
        if (createUserForm.roleId === 0) {
          setCreateUserForm((prev) => ({ ...prev, roleId: roleData.roles[0].id }));
        }
        if (selectedRoleId === 0) {
          setSelectedRoleId(roleData.roles[0].id);
        }
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

  // Handle Employee selection in Create User form
  const handleSelectEmployeeForUser = (empId: number) => {
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      const generatedUsername = emp.code.toLowerCase().replace('-', '');
      setCreateUserForm((prev) => ({
        ...prev,
        employeeId: emp.id,
        fullName: emp.fullName,
        username: prev.username || generatedUsername,
      }));
    } else {
      setCreateUserForm((prev) => ({
        ...prev,
        employeeId: 0,
      }));
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await personnelApi.createUserAccount({
        username: createUserForm.username.trim(),
        fullName: createUserForm.fullName.trim(),
        password: createUserForm.password.trim() || 'Dental@123',
        roleId: createUserForm.roleId,
        employeeId: createUserForm.employeeId || undefined,
      });
      setMessage({ text: `Đã cấp tài khoản "${createUserForm.username}" thành công!` });
      setShowCreateUserModal(false);
      setCreateUserForm({
        username: '',
        fullName: '',
        password: 'Dental@123',
        roleId: roles.length > 0 ? roles[0].id : 0,
        employeeId: 0,
      });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleToggleUserActive = async (user: UserAccount) => {
    const actionLabel = user.isActive ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc chắn muốn ${actionLabel} tài khoản "${user.username}" (${user.fullName})?`)) {
      return;
    }
    try {
      await personnelApi.toggleUserActive(user.id);
      setMessage({ text: `Đã ${actionLabel} tài khoản "${user.username}" thành công!` });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    try {
      await personnelApi.resetUserPassword(resettingUser.id, newPassword.trim() || 'Dental@123');
      setMessage({ text: `Đã đặt lại mật khẩu cho tài khoản "${resettingUser.username}" thành công!` });
      setResettingUser(null);
      setNewPassword('Dental@123');
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await personnelApi.assignRole(selectedUserId, { roleId: selectedRoleId, isPrimary });
      setMessage({ text: 'Đã gửi yêu cầu gán vai trò thành công!' });
      setShowAssignModal(false);
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await personnelApi.approveRole(id);
      setMessage({ text: 'Đã phê duyệt vai trò nhạy cảm thành công!' });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const handleRevoke = async (id: number) => {
    try {
      await personnelApi.revokeRole(id);
      setMessage({ text: 'Đã thu hồi vai trò thành công!' });
      loadData();
    } catch (err: any) {
      setMessage({ text: err.message, error: true });
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      !userSearch ||
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.fullName.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.employee?.code && u.employee.code.toLowerCase().includes(userSearch.toLowerCase()));

    const matchRole = !userRoleFilter || u.role.code === userRoleFilter;
    const matchStatus =
      !userStatusFilter ||
      (userStatusFilter === 'ACTIVE' && u.isActive) ||
      (userStatusFilter === 'INACTIVE' && !u.isActive);

    return matchSearch && matchRole && matchStatus;
  });

  const pendingAssignments = assignments.filter((a) => !a.isApproved);
  const approvedAssignments = assignments.filter((a) => a.isApproved);

  const doctorAccountsCount = users.filter((u) => u.role.code === 'DOCTOR').length;
  const receptionAccountsCount = users.filter((u) => u.role.code === 'RECEPTION_STAFF').length;
  const activeAccountsCount = users.filter((u) => u.isActive).length;
  const lockedAccountsCount = users.filter((u) => !u.isActive).length;

  return (
    <div>
      <PageHeading
        title="Quản Lý Tài Khoản & Phân Quyền Vai Trò"
        description="Cấp tài khoản đăng nhập, quản lý người dùng (Tiếp nhận, Bác sĩ, Kho, Kế toán...), kiểm soát tổ hợp cấm và phê duyệt vai trò nhạy cảm"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateUserModal(true)}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" />
              Cấp tài khoản mới
            </button>
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <ShieldCheck className="h-4 w-4" />
              Gán vai trò kiêm nhiệm
            </button>
          </div>
        }
      />

      {message && (
        <div className="mb-6">
          <Message value={message.text} error={message.error} />
        </div>
      )}

      {/* Tabs Switcher */}
      <div className="mb-6 flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('ACCOUNTS')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'ACCOUNTS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          Danh Sách Tài Khoản Người Dùng ({users.length})
        </button>
        <button
          onClick={() => setActiveTab('PERMISSIONS')}
          className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'PERMISSIONS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldAlert className="h-4 w-4" />
          Phân Quyền & Phê Duyệt Vai Trò
          {pendingAssignments.length > 0 && (
            <span className="ml-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
              {pendingAssignments.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'ACCOUNTS' ? (
        <div>
          {/* Account Metrics */}
          <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card className="border-indigo-100 bg-indigo-50/40">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Tổng tài khoản</p>
                  <p className="font-mono text-xl font-black text-indigo-700">{users.length}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <Stethoscope className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Tài khoản Bác sĩ</p>
                  <p className="font-mono text-xl font-bold text-slate-900">{doctorAccountsCount}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-100 text-blue-700">
                  <UserCheck className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Tài khoản Tiếp nhận</p>
                  <p className="font-mono text-xl font-bold text-slate-900">{receptionAccountsCount}</p>
                </div>
              </div>
            </Card>

            <Card>
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-slate-100 text-slate-700">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-slate-500">Hoạt động / Bị khóa</p>
                  <p className="font-mono text-xl font-bold text-slate-900">
                    <span className="text-emerald-600">{activeAccountsCount}</span>
                    <span className="text-slate-300"> / </span>
                    <span className="text-rose-600">{lockedAccountsCount}</span>
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Search & Filters */}
          <Card className="mb-6">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo username, họ tên, mã NV..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </div>

              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">Tất cả vai trò hệ thống</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.code}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className={selectClass}
              >
                <option value="">Tất cả trạng thái tài khoản</option>
                <option value="ACTIVE">Đang hoạt động</option>
                <option value="INACTIVE">Đã khóa / Tạm dừng</option>
              </select>
            </div>
          </Card>

          {/* User Accounts Table */}
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/70 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Tên đăng nhập & Họ tên</th>
                    <th className="px-5 py-3.5">Cán bộ nhân viên liên kết</th>
                    <th className="px-5 py-3.5">Vai trò chính</th>
                    <th className="px-5 py-3.5">Vai trò kiêm nhiệm</th>
                    <th className="px-5 py-3.5">Trạng thái</th>
                    <th className="px-5 py-3.5 text-right">Thao tác quản trị</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Đang tải danh sách tài khoản người dùng...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Không tìm thấy tài khoản người dùng phù hợp.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.slice((userPage - 1) * 10, userPage * 10).map((u) => {
                      const secondaryRoles = (u.roleAssignments || []).filter(
                        (ra) => ra.roleId !== u.roleId && ra.isApproved,
                      );
                      return (
                        <tr key={u.id} className="transition hover:bg-slate-50/60">
                          <td className="px-5 py-3.5">
                            <p className="font-mono font-bold text-indigo-700">@{u.username}</p>
                            <p className="font-semibold text-slate-900">{u.fullName}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            {u.employee ? (
                              <div>
                                <p className="font-mono font-bold text-slate-800">{u.employee.code}</p>
                                <p className="text-[11px] text-slate-500">{u.employee.title}</p>
                                <p className="text-[10px] text-slate-400">{u.employee.department}</p>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Chưa liên kết hồ sơ</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex rounded-lg border border-slate-200 bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800">
                              {u.role.name}
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            {secondaryRoles.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {secondaryRoles.map((sr) => (
                                  <span
                                    key={sr.id}
                                    className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-700 border border-purple-200"
                                  >
                                    {sr.role.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            {u.isActive ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Hoạt động
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 border border-rose-200">
                                <XCircle className="h-3.5 w-3.5" /> Đã khóa
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setSelectedUserId(u.id);
                                  setShowAssignModal(true);
                                }}
                                title="Gán vai trò kiêm nhiệm"
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                              >
                                <ShieldCheck className="h-4 w-4 text-indigo-600" />
                              </button>
                              <button
                                onClick={() => {
                                  setResettingUser(u);
                                  setNewPassword('Dental@123');
                                }}
                                title="Đặt lại mật khẩu"
                                className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
                              >
                                <KeyRound className="h-4 w-4 text-amber-600" />
                              </button>
                              <button
                                onClick={() => handleToggleUserActive(u)}
                                title={u.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                                className={`rounded-lg border p-1.5 ${
                                  u.isActive
                                    ? 'border-rose-200 bg-white text-rose-600 hover:bg-rose-50'
                                    : 'border-emerald-200 bg-white text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                {u.isActive ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <PaginationBar
              currentPage={userPage}
              totalItems={filteredUsers.length}
              pageSize={10}
              onPageChange={setUserPage}
              itemName="tài khoản"
            />
          </Card>
        </div>
      ) : (
        <div>
          {/* Forbidden Combinations Banner */}
          <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-amber-900">
                  Quy tắc kiểm soát nội bộ: Tổ hợp vai trò bị cấm kiêm nhiệm
                </h3>
                <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 text-xs text-amber-800">
                  {forbiddenCombos.map((c, idx) => (
                    <div key={idx} className="rounded-lg bg-white/80 p-2.5 border border-amber-200/80">
                      <p className="font-bold text-slate-800">
                        ⛔ {c.roleA} + {c.roleB}
                      </p>
                      <p className="mt-0.5 text-slate-600">{c.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Pending Sensitive Role Approvals */}
          {pendingAssignments.length > 0 && (
            <div className="mb-6">
              <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900">
                <ShieldAlert className="h-5 w-5 text-amber-600" />
                Yêu cầu gán vai trò nhạy cảm chờ phê duyệt ({pendingAssignments.length})
              </h2>
              <Card className="overflow-hidden p-0 border-amber-200 bg-amber-50/20">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-amber-100 bg-amber-100/50 font-bold uppercase text-amber-900">
                      <tr>
                        <th className="px-5 py-3.5">Tài khoản</th>
                        <th className="px-5 py-3.5">Họ và tên</th>
                        <th className="px-5 py-3.5">Vai trò đề xuất</th>
                        <th className="px-5 py-3.5">Trạng thái</th>
                        <th className="px-5 py-3.5 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {pendingAssignments.map((pa) => (
                        <tr key={pa.id} className="transition hover:bg-amber-50/50">
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                            {pa.user?.username}
                          </td>
                          <td className="px-5 py-3.5 font-medium text-slate-800">
                            {pa.user?.fullName}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex rounded-lg bg-indigo-100 px-2.5 py-1 text-xs font-bold text-indigo-800">
                              {pa.role.name} ({pa.role.code})
                            </span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-800">
                              Chờ Admin / HR duyệt
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApprove(pa.id)}
                                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                              >
                                Duyệt vai trò
                              </button>
                              <button
                                onClick={() => handleRevoke(pa.id)}
                                className="rounded-lg border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                              >
                                Từ chối
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Active Role Assignments Table */}
          <h2 className="mb-3 text-base font-bold text-slate-900">
            Danh sách phân quyền vai trò đang có hiệu lực ({approvedAssignments.length})
          </h2>
          <Card className="overflow-hidden p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50/70 font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5">Mã NV / Username</th>
                    <th className="px-5 py-3.5">Họ và tên nhân sự</th>
                    <th className="px-5 py-3.5">Vai trò hệ thống</th>
                    <th className="px-5 py-3.5">Phân loại quyền</th>
                    <th className="px-5 py-3.5">Trạng thái tài khoản</th>
                    <th className="px-5 py-3.5 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Đang tải danh sách phân quyền...
                      </td>
                    </tr>
                  ) : approvedAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Chưa có vai trò nào được gán.
                      </td>
                    </tr>
                  ) : (
                    approvedAssignments.map((a) => (
                      <tr key={a.id} className="transition hover:bg-slate-50/60">
                        <td className="px-5 py-3.5">
                          <p className="font-mono font-bold text-indigo-600">
                            {a.user?.employee?.code || 'HỆ THỐNG'}
                          </p>
                          <p className="font-mono text-[11px] text-slate-400">@{a.user?.username}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <p className="font-semibold text-slate-900">{a.user?.fullName}</p>
                          <p className="text-[11px] text-slate-500">{a.user?.employee?.title || 'Quản trị viên'}</p>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200">
                            {a.role.name}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {a.isPrimary ? (
                            <span className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700 border border-blue-200">
                              Vai trò chính
                            </span>
                          ) : (
                            <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700 border border-purple-200">
                              Kiêm nhiệm
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          {a.user?.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" /> Đang hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700">
                              <XCircle className="h-3.5 w-3.5 text-rose-500" /> Bị vô hiệu hóa
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {!a.isPrimary && (
                            <button
                              onClick={() => handleRevoke(a.id)}
                              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                            >
                              Thu hồi
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* CREATE USER ACCOUNT MODAL */}
      {showCreateUserModal && (
        <Modal
          title="Cấp Tài Khoản Người Dùng Mới"
          onClose={() => setShowCreateUserModal(false)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900">
              <p className="font-bold">Hướng dẫn cấp tài khoản:</p>
              <p className="mt-1 text-slate-600">
                HR có thể chọn cán bộ nhân viên để liên kết thông tin tự động, hoặc tạo tài khoản mới cho Bác sĩ, Tiếp nhận, Kho, Kế toán...
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Liên kết với nhân viên (Tùy chọn)
              </label>
              <select
                value={createUserForm.employeeId}
                onChange={(e) => handleSelectEmployeeForUser(Number(e.target.value))}
                className={selectClass}
              >
                <option value={0}>-- Tài khoản độc lập / Không gắn mã NV --</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.code} - {emp.fullName} ({emp.title})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Tên đăng nhập (*)</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: bs.minh, tiepnhan01..."
                value={createUserForm.username}
                onChange={(e) => setCreateUserForm({ ...createUserForm, username: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Họ và tên hiển thị (*)</label>
              <input
                type="text"
                required
                placeholder="Nhập họ và tên đầy đủ"
                value={createUserForm.fullName}
                onChange={(e) => setCreateUserForm({ ...createUserForm, fullName: e.target.value })}
                className={inputClass}
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Vai trò ban đầu (*)</label>
              <select
                value={createUserForm.roleId}
                onChange={(e) => setCreateUserForm({ ...createUserForm, roleId: Number(e.target.value) })}
                className={selectClass}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">
                Mật khẩu khởi tạo (Mặc định: Dental@123)
              </label>
              <input
                type="text"
                placeholder="Dental@123"
                value={createUserForm.password}
                onChange={(e) => setCreateUserForm({ ...createUserForm, password: e.target.value })}
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowCreateUserModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Cấp tài khoản
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* RESET PASSWORD MODAL */}
      {resettingUser && (
        <Modal
          title={`Đặt Lại Mật Khẩu: @${resettingUser.username}`}
          onClose={() => setResettingUser(null)}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-xs text-slate-600">
              Bạn đang thực hiện đặt lại mật khẩu cho tài khoản <strong>@{resettingUser.username}</strong> ({resettingUser.fullName}).
            </p>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Mật khẩu mới</label>
              <input
                type="text"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
              />
              <p className="mt-1 text-[11px] text-slate-400">Gợi ý: Mật khẩu mặc định hệ thống là Dental@123</p>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setResettingUser(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Xác nhận đổi mật khẩu
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ASSIGN ROLE MODAL */}
      {showAssignModal && (
        <Modal title="Gán Vai Trò Cho Tài Khoản" onClose={() => setShowAssignModal(false)} maxWidth="max-w-md">
          <form onSubmit={handleAssignRole} className="space-y-4">
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-3 text-xs text-indigo-900">
              <p className="font-bold">Quy định gán vai trò & Phê duyệt:</p>
              <ul className="mt-1 list-disc pl-4 space-y-1 text-slate-600">
                <li>Role thường (Tiếp nhận, Kho): HR tự gán, có hiệu lực ngay.</li>
                <li>Role nhạy cảm (Admin, Kế toán, HR): cần Admin hoặc nhân sự quản lý duyệt.</li>
                <li>HR không được tự gán vai trò cho chính mình.</li>
              </ul>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Chọn tài khoản người dùng (*)</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(Number(e.target.value))}
                className={selectClass}
              >
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    @{u.username} - {u.fullName} ({u.role.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-700">Chọn vai trò hệ thống (*)</label>
              <select
                value={selectedRoleId}
                onChange={(e) => setSelectedRoleId(Number(e.target.value))}
                className={selectClass}
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.code})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isPrimary"
                type="checkbox"
                checked={isPrimary}
                onChange={(e) => setIsPrimary(e.target.checked)}
                className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="isPrimary" className="text-xs font-medium text-slate-700">
                Đặt làm vai trò chính mặc định khi đăng nhập
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Xác nhận gán
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
