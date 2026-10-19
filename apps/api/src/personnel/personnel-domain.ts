export interface SalaryCalculationInput {
  baseSalary: number;
  standardDays: number;
  actualDays: number;
  paidLeaveDays?: number;
  allowanceAmount?: number;
  serviceIncentiveAmount?: number;
  otherBonus?: number;
  overtimePay?: number;
  insuranceDeduction?: number;
  advanceDeduction?: number;
  otherDeduction?: number;
}

export interface SalaryCalculationResult {
  attendanceSalary: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  isValid: boolean;
  errorMessage?: string;
}

export function formatEmployeeCode(sequence: number): string {
  return `NV-${sequence.toString().padStart(4, '0')}`;
}

export function formatPayrollCode(year: number, month: number, sequence: number): string {
  const mm = month < 10 ? `0${month}` : `${month}`;
  const seq = sequence.toString().padStart(4, '0');
  return `BL${year}${mm}/${seq}`;
}

export function calculateAttendanceSalary(
  baseSalary: number,
  standardDays = 26,
  actualDays = 0,
  paidLeaveDays = 0,
): number {
  const stdDays = standardDays > 0 ? standardDays : 26;
  return Math.round((baseSalary / stdDays) * (actualDays + paidLeaveDays));
}

export type OvertimeDayType = 'NORMAL' | 'WEEKEND' | 'HOLIDAY';

/**
 * Tỷ lệ tiền lương làm thêm giờ tối thiểu theo Điều 98 Bộ luật Lao động 2019:
 * - Ngày làm việc bình thường (Thứ 2 - Thứ 7): >= 150% (1.5)
 * - Ngày nghỉ hằng tuần (Chủ Nhật): >= 200% (2.0)
 * - Ngày lễ, Tết, ngày nghỉ có hưởng lương: >= 300% (3.0)
 */
export const OVERTIME_RATES: Record<OvertimeDayType, number> = {
  NORMAL: 1.5,
  WEEKEND: 2.0,
  HOLIDAY: 3.0,
};

/**
 * Tiền lương 1 giờ thực trả (theo chuẩn 26 ngày công, 8 giờ/ngày)
 * Theo Điểm a3 Khoản 1 Điều 54 Nghị định 145/2020/NĐ-CP
 */
export function calculateHourlyRate(baseSalary: number, standardDays = 26, normalHoursPerDay = 8): number {
  const stdDays = standardDays > 0 ? standardDays : 26;
  const hours = normalHoursPerDay > 0 ? normalHoursPerDay : 8;
  return baseSalary / (stdDays * hours);
}

/**
 * Tiền lương làm thêm giờ = Tiền lương giờ thực trả × Hệ số (150%/200%/300%) × Số giờ làm thêm
 */
export function calculateOvertimePay(
  hourlyRate: number,
  overtimeHours: number,
  dayType: OvertimeDayType = 'NORMAL',
): number {
  if (overtimeHours <= 0 || hourlyRate <= 0) return 0;
  const rate = OVERTIME_RATES[dayType] ?? 1.5;
  return Math.round(hourlyRate * rate * overtimeHours);
}

export function calculateSalary(input: SalaryCalculationInput): SalaryCalculationResult {
  const attendanceSalary = calculateAttendanceSalary(
    input.baseSalary,
    input.standardDays,
    input.actualDays,
    input.paidLeaveDays ?? 0,
  );
  const allowances = input.allowanceAmount ?? 0;
  const incentive = input.serviceIncentiveAmount ?? 0;
  const bonus = input.otherBonus ?? 0;
  const overtime = input.overtimePay ?? 0;

  const grossSalary = attendanceSalary + allowances + incentive + bonus + overtime;

  const insurance = input.insuranceDeduction ?? 0;
  const advance = input.advanceDeduction ?? 0;
  const otherDeduction = input.otherDeduction ?? 0;

  const totalDeductions = insurance + advance + otherDeduction;
  const netSalary = grossSalary - totalDeductions;

  // Invariant validation: grossSalary = netSalary + totalDeductions
  const invariantHolds = grossSalary === netSalary + totalDeductions;
  const isNonNegative = netSalary >= 0;

  if (!invariantHolds) {
    return {
      attendanceSalary,
      grossSalary,
      totalDeductions,
      netSalary,
      isValid: false,
      errorMessage: 'Lỗi tính toán: Lương gộp không khớp với Thực nhận + Tổng khấu trừ.',
    };
  }

  if (!isNonNegative) {
    return {
      attendanceSalary,
      grossSalary,
      totalDeductions,
      netSalary,
      isValid: false,
      errorMessage: 'Thực nhận không được âm. Vui lòng điều chỉnh lại các khoản khấu trừ.',
    };
  }

  return {
    attendanceSalary,
    grossSalary,
    totalDeductions,
    netSalary,
    isValid: true,
  };
}

export function calculateServiceIncentive(serviceAmount: number, rate = 5.0): number {
  if (serviceAmount <= 0 || rate <= 0) return 0;
  return Math.round((serviceAmount * rate) / 100);
}

export function maskSensitiveString(value: string | null | undefined, visibleTail = 4): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (trimmed.length <= visibleTail) return '***';
  const hiddenPart = '*'.repeat(Math.min(6, trimmed.length - visibleTail));
  const tail = trimmed.slice(-visibleTail);
  return `${hiddenPart}${tail}`;
}

export function validateForbiddenRoles(
  assignedRoles: string[],
  forbiddenCombos: Array<{ roleA: string; roleB: string; reason: string }>,
): { isAllowed: boolean; violationReason?: string } {
  for (const combo of forbiddenCombos) {
    if (assignedRoles.includes(combo.roleA) && assignedRoles.includes(combo.roleB)) {
      return {
        isAllowed: false,
        violationReason: `Tổ hợp vai trò bị cấm: ${combo.roleA} và ${combo.roleB}. Lý do: ${combo.reason}`,
      };
    }
  }
  return { isAllowed: true };
}

export const SENSITIVE_ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTING_STAFF', 'HR'];

// -------------------------------------------------------------
// WORKING HOURS & ATTENDANCE DOMAIN LOGIC
// -------------------------------------------------------------

export interface WorkingHoursMilestones {
  startTime: string; // HH:mm (default '09:00')
  endTime: string;   // HH:mm (default '18:00')
  splitTime: string; // HH:mm (default '12:00')
}

export const DEFAULT_WORKING_HOURS: WorkingHoursMilestones = {
  startTime: '09:00',
  endTime: '18:00',
  splitTime: '12:00',
};

export function timeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

export function minutesToTime(minutes: number): string {
  const clamped = Math.max(0, Math.min(1439, Math.floor(minutes)));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function validateWorkingHoursOrder(
  startTime: string,
  splitTime: string,
  endTime: string,
): { isValid: boolean; error?: string } {
  const s = timeToMinutes(startTime);
  const m = timeToMinutes(splitTime);
  const e = timeToMinutes(endTime);

  if (s >= m) {
    return {
      isValid: false,
      error: 'Giờ vào làm phải trước mốc phân buổi (Giờ vào làm < Mốc phân buổi).',
    };
  }
  if (m >= e) {
    return {
      isValid: false,
      error: 'Mốc phân buổi phải trước giờ tan làm (Mốc phân buổi < Giờ tan làm).',
    };
  }
  return { isValid: true };
}

export interface AttendanceCalculationInput {
  checkInTime?: string | null;
  checkOutTime?: string | null;
  milestones?: WorkingHoursMilestones;
  isPastDay?: boolean;
  isOnLeave?: boolean;
  leaveType?: string | null;
}

export interface AttendanceCalculationResult {
  morningPresent: boolean;
  afternoonPresent: boolean;
  sessionCount: number; // 0 | 1 | 2
  workUnits: number; // 0 | 0.5 | 1.0
  lateMinutes: number; // >= 0
  overtimeHours: number; // >= 0, rounded to 2 decimals
  status: string; // CHUA_CHECK_IN | DANG_LAM | DU_NGAY | CHI_SANG | CHI_CHIEU | THIEU_CHECK_OUT | VANG | NGHI_CO_LUONG | NGHI_KHONG_LUONG
}

export function calculateAttendanceMetrics(input: AttendanceCalculationInput): AttendanceCalculationResult {
  const ms = input.milestones ?? DEFAULT_WORKING_HOURS;
  const s = timeToMinutes(ms.startTime);
  const e = timeToMinutes(ms.endTime);
  const m = timeToMinutes(ms.splitTime);

  // If no check-in
  if (!input.checkInTime) {
    if (input.isOnLeave) {
      const status = input.leaveType === 'UNPAID_LEAVE' ? 'NGHI_KHONG_LUONG' : 'NGHI_CO_LUONG';
      return {
        morningPresent: false,
        afternoonPresent: false,
        sessionCount: 0,
        workUnits: 0,
        lateMinutes: 0,
        overtimeHours: 0,
        status,
      };
    }
    if (input.isPastDay) {
      return {
        morningPresent: false,
        afternoonPresent: false,
        sessionCount: 0,
        workUnits: 0,
        lateMinutes: 0,
        overtimeHours: 0,
        status: 'VANG',
      };
    }
    return {
      morningPresent: false,
      afternoonPresent: false,
      sessionCount: 0,
      workUnits: 0,
      lateMinutes: 0,
      overtimeHours: 0,
      status: 'CHUA_CHECK_IN',
    };
  }

  const tIn = timeToMinutes(input.checkInTime);
  // Morning presence: T_in < M
  const morningPresent = tIn < m;

  // Late minutes: only if morning present: max(0, T_in - S)
  const lateMinutes = morningPresent ? Math.max(0, tIn - s) : 0;

  // If checked in but not checked out yet
  if (!input.checkOutTime) {
    const sessionCount = morningPresent ? 1 : 0;
    const workUnits = 0.5 * sessionCount;
    const status = input.isPastDay ? 'THIEU_CHECK_OUT' : 'DANG_LAM';
    return {
      morningPresent,
      afternoonPresent: false,
      sessionCount,
      workUnits,
      lateMinutes,
      overtimeHours: 0,
      status,
    };
  }

  // Both check-in and check-out exist
  const tOut = timeToMinutes(input.checkOutTime);
  // Afternoon presence: T_out > M
  const afternoonPresent = tOut > m;

  const sessionCount = (morningPresent ? 1 : 0) + (afternoonPresent ? 1 : 0);
  const workUnits = 0.5 * sessionCount;

  // Overtime: max(0, T_out - max(T_in, E)) in minutes, converted to hours with 2 decimal places
  const otThreshold = Math.max(tIn, e);
  const otMinutes = Math.max(0, tOut - otThreshold);
  const overtimeHours = Math.round((otMinutes / 60) * 100) / 100;

  let status = 'CHUA_CHECK_IN';
  if (sessionCount === 2) {
    status = 'DU_NGAY';
  } else if (morningPresent && !afternoonPresent) {
    status = 'CHI_SANG';
  } else if (!morningPresent && afternoonPresent) {
    status = 'CHI_CHIEU';
  } else {
    // neither morning nor afternoon? e.g. checked in between M and M?
    status = input.isPastDay ? 'THIEU_CHECK_OUT' : 'DANG_LAM';
  }

  return {
    morningPresent,
    afternoonPresent,
    sessionCount,
    workUnits,
    lateMinutes,
    overtimeHours,
    status,
  };
}

export function getVietnamDateNow(): { dateStr: string; timeStr: string; dateUtcMidnight: Date } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const year = parseInt(getPart('year'), 10);
  const month = parseInt(getPart('month'), 10);
  const day = parseInt(getPart('day'), 10);
  const hour = getPart('hour');
  const minute = getPart('minute');

  const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const timeStr = `${hour}:${minute}`;
  const dateUtcMidnight = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));

  return { dateStr, timeStr, dateUtcMidnight };
}
