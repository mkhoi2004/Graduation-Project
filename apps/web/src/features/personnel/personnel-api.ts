import { clearSession, getSession } from '@/lib/auth-session';
import type {
  AttendanceRecord,
  Employee,
  MonthlyAttendanceSummary,
  Payroll,
  PersonnelOverviewData,
  ServiceIncentive,
  ShiftAssignment,
  UserAccount,
  UserRoleAssignment,
  WorkingHoursConfig,
  WorkShift,
} from './personnel-types';

const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api';
const API_BASE = `${apiUrl}/hr`;

function getAuthHeaders(): HeadersInit {
  const session = getSession();
  return {
    'Content-Type': 'application/json',
    ...(session ? { Authorization: `${session.tokenType} ${session.accessToken}` } : {}),
  };
}

async function request<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
    }
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `Lỗi yêu cầu máy chủ: ${res.status}`);
  }

  return res.json() as Promise<T>;
}

export const personnelApi = {
  getOverview: () => request<PersonnelOverviewData>('/overview'),

  getEmployees: (params?: { search?: string; department?: string; status?: string; roomId?: number }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.department) query.set('department', params.department);
    if (params?.status) query.set('status', params.status);
    if (params?.roomId) query.set('roomId', String(params.roomId));
    const qs = query.toString();
    return request<Employee[]>(`/employees${qs ? `?${qs}` : ''}`);
  },

  getEmployeeById: (id: number) => request<Employee>(`/employees/${id}`),

  createEmployee: (data: any) =>
    request<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateEmployee: (id: number, data: any) =>
    request<Employee>(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  terminateEmployee: (id: number, data: { terminationDate: string; terminationReason: string }) =>
    request<Employee>(`/employees/${id}/terminate`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getRoles: () => request<{ roles: Array<{ id: number; code: string; name: string; description: string }>; forbiddenCombinations: any[] }>('/roles'),

  getUserAccounts: (params?: { search?: string; roleCode?: string; roleId?: number; isActive?: boolean }) => {
    const query = new URLSearchParams();
    if (params?.search) query.set('search', params.search);
    if (params?.roleCode) query.set('roleCode', params.roleCode);
    if (params?.roleId) query.set('roleId', String(params.roleId));
    if (params?.isActive !== undefined) query.set('isActive', String(params.isActive));
    const qs = query.toString();
    return request<UserAccount[]>(`/users${qs ? `?${qs}` : ''}`);
  },

  createUserAccount: (data: { username: string; fullName: string; password?: string; roleId: number; employeeId?: number }) =>
    request<UserAccount>('/users', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateUserAccount: (id: number, data: { fullName?: string; roleId?: number; employeeId?: number }) =>
    request<UserAccount>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  toggleUserActive: (id: number) =>
    request<UserAccount>(`/users/${id}/toggle-active`, {
      method: 'POST',
    }),

  resetUserPassword: (id: number, newPassword?: string) =>
    request<{ success: boolean; message: string }>(`/users/${id}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword }),
    }),

  getUserRoleAssignments: () => request<UserRoleAssignment[]>('/user-roles'),

  assignRole: (userId: number, data: { roleId: number; isPrimary?: boolean }) =>
    request<UserRoleAssignment>(`/users/${userId}/roles`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveRole: (assignmentId: number) =>
    request<UserRoleAssignment>(`/user-roles/${assignmentId}/approve`, {
      method: 'POST',
    }),

  revokeRole: (assignmentId: number) =>
    request<{ success: boolean; message: string }>(`/user-roles/${assignmentId}`, {
      method: 'DELETE',
    }),

  getShifts: () => request<WorkShift[]>('/shifts'),

  createShift: (data: { code: string; name: string; startTime: string; endTime: string; shiftType: string }) =>
    request<WorkShift>('/shifts', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getShiftAssignments: (params?: { startDate?: string; endDate?: string; employeeId?: number; roomId?: number }) => {
    const query = new URLSearchParams();
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    if (params?.employeeId) query.set('employeeId', String(params.employeeId));
    if (params?.roomId) query.set('roomId', String(params.roomId));
    const qs = query.toString();
    return request<ShiftAssignment[]>(`/shift-assignments${qs ? `?${qs}` : ''}`);
  },

  assignShift: (data: { employeeId: number; shiftId: number; date: string; roomId?: number; note?: string }) =>
    request<ShiftAssignment>('/shift-assignments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateWeeklyShifts: (data?: { year?: number; month?: number; overwriteExisting?: boolean }) =>
    request<{
      success: boolean;
      year: number;
      month: number;
      workingHours: { startTime: string; endTime: string };
      totalCreated: number;
      totalUpdated: number;
      totalStaff: number;
      message: string;
    }>('/shift-assignments/generate-weekly', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  getWorkingHoursConfig: (date?: string) =>
    request<WorkingHoursConfig>(`/working-hours${date ? `?date=${date}` : ''}`),

  getWorkingHoursHistory: () =>
    request<WorkingHoursConfig[]>('/working-hours/history'),

  saveWorkingHoursConfig: (data: { startTime: string; endTime: string; splitTime: string; effectiveDate: string; note?: string }) =>
    request<WorkingHoursConfig>('/working-hours', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getAttendanceStatus: () =>
    request<{
      hasEmployee: boolean;
      employeeId?: number;
      employeeName?: string;
      employeeCode?: string;
      record?: AttendanceRecord | null;
      status: string;
      checkInTime?: string | null;
      checkOutTime?: string | null;
      message?: string;
    }>('/attendance/status'),

  checkIn: (data?: { confirmActiveExam?: boolean }) =>
    request<{
      success: boolean;
      alreadyDone: boolean;
      message: string;
      record: AttendanceRecord;
      conflictWarning?: string;
    }>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  checkOut: (data?: { confirmActiveExam?: boolean }) =>
    request<{
      success: boolean;
      alreadyDone?: boolean;
      hasActiveExamWarning?: boolean;
      message: string;
      record?: AttendanceRecord;
    }>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(data || {}),
    }),

  getAttendance: (params?: {
    month?: number;
    year?: number;
    employeeId?: number;
    status?: string;
    roomId?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const query = new URLSearchParams();
    if (params?.month) query.set('month', String(params.month));
    if (params?.year) query.set('year', String(params.year));
    if (params?.employeeId) query.set('employeeId', String(params.employeeId));
    if (params?.status) query.set('status', params.status);
    if (params?.roomId) query.set('roomId', String(params.roomId));
    if (params?.startDate) query.set('startDate', params.startDate);
    if (params?.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    return request<AttendanceRecord[]>(`/attendance${qs ? `?${qs}` : ''}`);
  },

  getAttendanceSummary: (year?: number, month?: number) => {
    const query = new URLSearchParams();
    if (year) query.set('year', String(year));
    if (month) query.set('month', String(month));
    const qs = query.toString();
    return request<MonthlyAttendanceSummary[]>(`/attendance/summary${qs ? `?${qs}` : ''}`);
  },

  adjustAttendance: (data: {
    id?: number;
    employeeId: number;
    date: string;
    checkInTime?: string;
    checkOutTime?: string;
    leaveType?: string;
    reason: string;
    note?: string;
  }) =>
    request<AttendanceRecord>('/attendance/adjust', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approveAttendanceAdjustment: (id: number, data: { approved: boolean; reason?: string }) =>
    request<AttendanceRecord>(`/attendance/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  recordAttendance: (data: any) =>
    request<AttendanceRecord>('/attendance', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  lockAttendance: (data: { year: number; month: number }) =>
    request<{ success: boolean; count: number; message: string }>('/attendance/lock', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getIncentives: (params?: { employeeId?: number; roleType?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.employeeId) query.set('employeeId', String(params.employeeId));
    if (params?.roleType) query.set('roleType', params.roleType);
    if (params?.status) query.set('status', params.status);
    const qs = query.toString();
    return request<ServiceIncentive[]>(`/incentives${qs ? `?${qs}` : ''}`);
  },

  syncIncentives: () =>
    request<{ success: boolean; createdCount: number }>('/incentives/sync', {
      method: 'POST',
    }),

  getPayrolls: () => request<Payroll[]>('/payrolls'),

  getPayrollById: (id: number) => request<Payroll>(`/payrolls/${id}`),

  createPayroll: (data: { year: number; month: number; title: string; standardWorkingDays: number; note?: string }) =>
    request<Payroll>('/payrolls', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updatePayrollItem: (payrollId: number, itemId: number, data: any) =>
    request<{ success: boolean; netSalary: number }>(`/payrolls/${payrollId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  approvePayroll: (id: number) =>
    request<Payroll>(`/payrolls/${id}/approve`, {
      method: 'POST',
    }),

  lockPayroll: (id: number) =>
    request<Payroll>(`/payrolls/${id}/lock`, {
      method: 'POST',
    }),

  cancelPayroll: (id: number, data: { cancelReason: string }) =>
    request<Payroll>(`/payrolls/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
