export interface EmployeeContract {
  id: number;
  contractNumber: string;
  contractType: string;
  startDate: string;
  endDate?: string | null;
  note?: string | null;
}

export interface UserRoleAssignment {
  id: number;
  userId: number;
  roleId: number;
  isPrimary: boolean;
  isApproved: boolean;
  assignedById?: number | null;
  approvedById?: number | null;
  approvedAt?: string | null;
  role: {
    id: number;
    code: string;
    name: string;
    description: string;
  };
  user?: {
    id: number;
    username: string;
    fullName: string;
    isActive: boolean;
    employee?: {
      id: number;
      code: string;
      title: string;
    } | null;
  };
}

export interface UserAccount {
  id: number;
  username: string;
  fullName: string;
  isActive: boolean;
  roleId: number;
  createdAt: string;
  role: {
    id: number;
    code: string;
    name: string;
    description: string;
  };
  employee?: {
    id: number;
    code: string;
    fullName: string;
    title: string;
    department: string;
    status: string;
    phone: string;
  } | null;
  roleAssignments?: UserRoleAssignment[];
}

export interface Employee {
  id: number;
  code: string;
  fullName: string;
  dateOfBirth: string;
  gender: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  citizenId?: string | null;
  title: string;
  department?: string | null;
  roomId?: number | null;
  room?: { id: number; code: string; name: string } | null;
  joinDate: string;
  status: 'ACTIVE' | 'TERMINATED';
  terminationDate?: string | null;
  terminationReason?: string | null;
  insuranceCode?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  baseSalary: number;
  fixedAllowance: number;
  userId?: number | null;
  user?: {
    id: number;
    username: string;
    role: { code: string; name: string };
    roleAssignments: UserRoleAssignment[];
  } | null;
  contracts?: EmployeeContract[];
}

export interface WorkShift {
  id: number;
  code: string;
  name: string;
  startTime: string;
  endTime: string;
  shiftType: string;
  isActive: boolean;
}

export interface ShiftAssignment {
  id: number;
  employeeId: number;
  shiftId: number;
  date: string;
  roomId?: number | null;
  note?: string | null;
  employee: Employee;
  shift: WorkShift;
  room?: { id: number; name: string } | null;
}

export interface AttendanceAudit {
  id: number;
  attendanceRecordId: number;
  action: string;
  originalCheckInTime?: string | null;
  originalCheckOutTime?: string | null;
  newCheckInTime?: string | null;
  newCheckOutTime?: string | null;
  reason?: string | null;
  actorId?: number | null;
  actorRole?: string | null;
  createdAt: string;
}

export interface AttendanceRecord {
  id: number;
  employeeId: number;
  date: string;
  status: string; // CHUA_CHECK_IN | DANG_LAM | DU_NGAY | CHI_SANG | CHI_CHIEU | THIEU_CHECK_OUT | VANG | NGHI_CO_LUONG | NGHI_KHONG_LUONG | PRESENT | LATE | ON_LEAVE
  checkInTime?: string | null;
  checkOutTime?: string | null;
  lateMinutes: number;
  leaveType?: string | null;
  overtimeHours: number;
  sessionCount: number;
  workUnits: number;
  source: string; // SELF | HR
  roleUsed?: string | null;
  clinicRoomId?: number | null;
  configSnapshot?: string | null;
  originalCheckInTime?: string | null;
  originalCheckOutTime?: string | null;
  isAdjusted: boolean;
  adjustmentReason?: string | null;
  adjustedById?: number | null;
  approvalStatus: 'APPROVED' | 'PENDING_APPROVAL' | 'REJECTED';
  approvedById?: number | null;
  approvedAt?: string | null;
  hasLeaveConflict: boolean;
  conflictNote?: string | null;
  isOnDuty: boolean;
  isLocked: boolean;
  note?: string | null;
  employee: Employee;
  audits?: AttendanceAudit[];
}

export interface WorkingHoursConfig {
  id: number;
  startTime: string;
  endTime: string;
  splitTime: string;
  effectiveDate: string;
  note?: string | null;
  createdById?: number | null;
  createdAt: string;
  updatedAt: string;
  audits?: Array<{
    id: number;
    action: string;
    oldData?: string | null;
    newData: string;
    changedById?: number | null;
    changedAt: string;
  }>;
}

export interface MonthlyAttendanceSummary {
  employeeId: number;
  employeeCode: string;
  fullName: string;
  title: string;
  totalWorkUnits: number;
  totalLateMinutes: number;
  totalOvertimeHours: number;
  missingCheckoutCount: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  absentDays: number;
}

export interface PayrollItem {
  id: number;
  payrollId: number;
  employeeId: number;
  employee: Employee;
  baseSalary: number;
  standardDays: number;
  actualDays: number;
  attendanceSalary: number;
  allowanceAmount: number;
  serviceIncentiveAmount: number;
  otherBonus: number;
  overtimePay: number;
  grossSalary: number;
  insuranceDeduction: number;
  advanceDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  netSalary: number;
  accountingPayableId?: number | null;
  isPaid?: boolean;
}

export interface Payroll {
  id: number;
  code: string;
  year: number;
  month: number;
  title: string;
  standardWorkingDays: number;
  status: 'DRAFT' | 'APPROVED' | 'LOCKED' | 'PAID' | 'CANCELLED';
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  createdById: number;
  createdBy?: { id: number; username: string; fullName: string };
  approvedById?: number | null;
  approvedBy?: { id: number; username: string; fullName: string } | null;
  approvedAt?: string | null;
  lockedAt?: string | null;
  paidAt?: string | null;
  cancelReason?: string | null;
  note?: string | null;
  items: PayrollItem[];
}

export interface ServiceIncentive {
  id: number;
  intakeServiceId: number;
  examinationId: number;
  employeeId: number;
  employee: Employee;
  roleType: 'DOCTOR' | 'RECEPTION';
  serviceName: string;
  serviceAmount: number;
  rate: number;
  incentiveAmount: number;
  status: 'VALID' | 'PAUSED' | 'EXCLUDED' | 'NEEDS_ATTENTION';
  completedAt: string;
  statusReason?: string | null;
}

export interface PersonnelOverviewData {
  employees: {
    totalActive: number;
    totalTerminated: number;
    doctorCount: number;
    receptionCount: number;
    warehouseCount: number;
    accountingCount: number;
  };
  today: {
    scheduledShifts: number;
    presentCount: number;
    lateCount: number;
    onLeaveCount: number;
  };
  governance: {
    pendingRoleApprovals: number;
  };
  latestPayroll: {
    id: number;
    code: string;
    year: number;
    month: number;
    status: string;
    totalGross: number;
    totalNet: number;
    totalEmployees: number;
  } | null;
}
