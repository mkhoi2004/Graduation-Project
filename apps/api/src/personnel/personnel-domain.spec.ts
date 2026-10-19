import { describe, expect, it } from 'vitest';
import {
  calculateAttendanceMetrics,
  calculateAttendanceSalary,
  calculateHourlyRate,
  calculateOvertimePay,
  calculateSalary,
  calculateServiceIncentive,
  formatEmployeeCode,
  formatPayrollCode,
  maskSensitiveString,
  OVERTIME_RATES,
  validateForbiddenRoles,
  validateWorkingHoursOrder,
} from './personnel-domain.js';

describe('Personnel Domain Logic', () => {
  it('formats employee code as NV-0001', () => {
    expect(formatEmployeeCode(1)).toBe('NV-0001');
    expect(formatEmployeeCode(25)).toBe('NV-0025');
    expect(formatEmployeeCode(1200)).toBe('NV-1200');
  });

  it('formats payroll code with reset sequence by month', () => {
    expect(formatPayrollCode(2026, 10, 1)).toBe('BL202610/0001');
    expect(formatPayrollCode(2026, 9, 12)).toBe('BL202609/0012');
  });

  it('calculates attendance salary proportionally and rounded', () => {
    // 26,000,000 / 26 days * 20 days = 20,000,000
    const attSalary = calculateAttendanceSalary(26_000_000, 26, 20);
    expect(attSalary).toBe(20_000_000);

    // 15,000,000 / 26 * 17 = 9807692.3 -> 9807692
    const attSalaryRounded = calculateAttendanceSalary(15_000_000, 26, 17);
    expect(attSalaryRounded).toBe(9_807_692);
  });

  it('calculates monthly salary with standard 26 days and paid leave days (Decree 145/2020/ND-CP)', () => {
    // Base salary: 26,000,000, actual worked: 20 days, paid leave: 2 days (annual/holiday), unpaid leave: 4 days
    // Formula: (26,000,000 / 26) * (20 + 2) = 1,000,000 * 22 = 22,000,000
    const attSalary = calculateAttendanceSalary(26_000_000, 26, 20, 2);
    expect(attSalary).toBe(22_000_000);

    const fullRes = calculateSalary({
      baseSalary: 26_000_000,
      standardDays: 26,
      actualDays: 20,
      paidLeaveDays: 2,
    });
    expect(fullRes.attendanceSalary).toBe(22_000_000);
    expect(fullRes.grossSalary).toBe(22_000_000);
    expect(fullRes.netSalary).toBe(22_000_000);
  });

  it('calculates overtime pay based on hourly rate and day types (Labor Code 2019 Article 98)', () => {
    // Base salary: 26,000,000, 26 working days, 8 hours/day
    // Hourly rate = 26,000,000 / (26 * 8) = 125,000 đ/hour
    const hourlyRate = calculateHourlyRate(26_000_000, 26, 8);
    expect(hourlyRate).toBe(125_000);

    // 1. Normal working day (Monday - Saturday): rate >= 150% (1.5)
    // 2 hours OT = 125,000 * 1.5 * 2 = 375,000 đ
    expect(OVERTIME_RATES.NORMAL).toBe(1.5);
    const normalOtPay = calculateOvertimePay(hourlyRate, 2, 'NORMAL');
    expect(normalOtPay).toBe(375_000);

    // 2. Weekly rest day (Sunday): rate >= 200% (2.0)
    // 4 hours OT = 125,000 * 2.0 * 4 = 1,000,000 đ
    expect(OVERTIME_RATES.WEEKEND).toBe(2.0);
    const weekendOtPay = calculateOvertimePay(hourlyRate, 4, 'WEEKEND');
    expect(weekendOtPay).toBe(1_000_000);

    // 3. Holidays, New Year, paid leave: rate >= 300% (3.0)
    // 8 hours OT = 125,000 * 3.0 * 8 = 3,000,000 đ
    expect(OVERTIME_RATES.HOLIDAY).toBe(3.0);
    const holidayOtPay = calculateOvertimePay(hourlyRate, 8, 'HOLIDAY');
    expect(holidayOtPay).toBe(3_000_000);
  });

  it('calculates gross, deductions, and net salary correctly', () => {
    const res = calculateSalary({
      baseSalary: 26_000_000,
      standardDays: 26,
      actualDays: 26,
      allowanceAmount: 3_000_000,
      serviceIncentiveAmount: 4_500_000,
      otherBonus: 500_000,
      overtimePay: 1_000_000,
      insuranceDeduction: 2_000_000,
      advanceDeduction: 1_000_000,
      otherDeduction: 500_000,
    });

    expect(res.isValid).toBe(true);
    expect(res.attendanceSalary).toBe(26_000_000);
    expect(res.grossSalary).toBe(35_000_000);
    expect(res.totalDeductions).toBe(3_500_000);
    expect(res.netSalary).toBe(31_500_000);
    // Invariant holds
    expect(res.grossSalary).toBe(res.netSalary + res.totalDeductions);
  });

  it('blocks negative net salary and returns error message', () => {
    const res = calculateSalary({
      baseSalary: 10_000_000,
      standardDays: 26,
      actualDays: 10, // 3,846,154
      insuranceDeduction: 2_000_000,
      advanceDeduction: 5_000_000, // Total deductions = 7,000,000 > gross
    });

    expect(res.isValid).toBe(false);
    expect(res.errorMessage).toContain('Thực nhận không được âm');
  });

  it('calculates 5% service incentive independently on service line amount', () => {
    // 25,000,000 * 5% = 1,250,000
    expect(calculateServiceIncentive(25_000_000, 5.0)).toBe(1_250_000);
    // 400,000 * 5% = 20,000
    expect(calculateServiceIncentive(400_000, 5.0)).toBe(20_000);
  });

  it('masks sensitive data properly', () => {
    expect(maskSensitiveString('0071001234567')).toBe('******4567');
    expect(maskSensitiveString('079088001122')).toBe('******1122');
    expect(maskSensitiveString('123')).toBe('***');
    expect(maskSensitiveString(null)).toBe('');
  });

  it('validates forbidden role combinations', () => {
    const forbiddenCombos = [
      { roleA: 'ACCOUNTING_STAFF', roleB: 'WAREHOUSE_MANAGEMENT', reason: 'Không kiêm nhiệm kho' },
      { roleA: 'ACCOUNTING_STAFF', roleB: 'RECEPTION_STAFF', reason: 'Không kiêm nhiệm thu tiền' },
    ];

    const check1 = validateForbiddenRoles(['ACCOUNTING_STAFF', 'WAREHOUSE_MANAGEMENT'], forbiddenCombos);
    expect(check1.isAllowed).toBe(false);
    expect(check1.violationReason).toContain('Không kiêm nhiệm kho');

    const check2 = validateForbiddenRoles(['RECEPTION_STAFF', 'WAREHOUSE_MANAGEMENT'], forbiddenCombos);
    expect(check2.isAllowed).toBe(true);
  });

  describe('Working Hours & Attendance Calculation Rules', () => {
    const defaultMilestones = {
      startTime: '09:00',
      endTime: '18:00',
      splitTime: '12:00',
    };

    it('validates working hours order: S < M < E', () => {
      expect(validateWorkingHoursOrder('09:00', '12:00', '18:00').isValid).toBe(true);
      
      const invalidOrder1 = validateWorkingHoursOrder('13:00', '12:00', '18:00');
      expect(invalidOrder1.isValid).toBe(false);
      expect(invalidOrder1.error).toContain('Giờ vào làm phải trước mốc phân buổi');

      const invalidOrder2 = validateWorkingHoursOrder('09:00', '18:30', '18:00');
      expect(invalidOrder2.isValid).toBe(false);
      expect(invalidOrder2.error).toContain('Mốc phân buổi phải trước giờ tan làm');
    });

    it('calculates Case 1: 08:50 - 18:00 (Standard full day 2 sessions, 1.0 công, 0 late, 0 ot)', () => {
      const res = calculateAttendanceMetrics({
        checkInTime: '08:50',
        checkOutTime: '18:00',
        milestones: defaultMilestones,
      });

      expect(res.morningPresent).toBe(true);
      expect(res.afternoonPresent).toBe(true);
      expect(res.sessionCount).toBe(2);
      expect(res.workUnits).toBe(1.0);
      expect(res.lateMinutes).toBe(0);
      expect(res.overtimeHours).toBe(0);
      expect(res.status).toBe('DU_NGAY');
    });

    it('calculates Case 2: 09:20 - 19:30 (Late 20 min, Overtime 1.50 hr, 2 sessions, 1.0 công)', () => {
      const res = calculateAttendanceMetrics({
        checkInTime: '09:20',
        checkOutTime: '19:30',
        milestones: defaultMilestones,
      });

      expect(res.morningPresent).toBe(true);
      expect(res.afternoonPresent).toBe(true);
      expect(res.sessionCount).toBe(2);
      expect(res.workUnits).toBe(1.0);
      expect(res.lateMinutes).toBe(20);
      expect(res.overtimeHours).toBe(1.5);
      expect(res.status).toBe('DU_NGAY');
    });

    it('calculates Case 3: 09:00 - 11:30 (Morning only 1 session, 0.5 công, 0 late, 0 ot)', () => {
      const res = calculateAttendanceMetrics({
        checkInTime: '09:00',
        checkOutTime: '11:30',
        milestones: defaultMilestones,
      });

      expect(res.morningPresent).toBe(true);
      expect(res.afternoonPresent).toBe(false);
      expect(res.sessionCount).toBe(1);
      expect(res.workUnits).toBe(0.5);
      expect(res.lateMinutes).toBe(0);
      expect(res.overtimeHours).toBe(0);
      expect(res.status).toBe('CHI_SANG');
    });

    it('calculates Case 4: 13:00 - 18:00 (Afternoon only 1 session, 0.5 công, late = 0, 0 ot)', () => {
      const res = calculateAttendanceMetrics({
        checkInTime: '13:00',
        checkOutTime: '18:00',
        milestones: defaultMilestones,
      });

      expect(res.morningPresent).toBe(false);
      expect(res.afternoonPresent).toBe(true);
      expect(res.sessionCount).toBe(1);
      expect(res.workUnits).toBe(0.5);
      expect(res.lateMinutes).toBe(0);
      expect(res.overtimeHours).toBe(0);
      expect(res.status).toBe('CHI_CHIEU');
    });

    it('calculates Case 5: 09:05 - 12:00 (Morning only, 5 min late, 0.5 công, 0 ot)', () => {
      const res = calculateAttendanceMetrics({
        checkInTime: '09:05',
        checkOutTime: '12:00',
        milestones: defaultMilestones,
      });

      expect(res.morningPresent).toBe(true);
      expect(res.afternoonPresent).toBe(false);
      expect(res.sessionCount).toBe(1);
      expect(res.workUnits).toBe(0.5);
      expect(res.lateMinutes).toBe(5);
      expect(res.overtimeHours).toBe(0);
      expect(res.status).toBe('CHI_SANG');
    });

    it('calculates Case 6: 20:00 - 21:00 (Night shift/overtime, ot = 1.00 hr)', () => {
      const res = calculateAttendanceMetrics({
        checkInTime: '20:00',
        checkOutTime: '21:00',
        milestones: defaultMilestones,
      });

      expect(res.morningPresent).toBe(false);
      expect(res.afternoonPresent).toBe(true);
      expect(res.sessionCount).toBe(1);
      expect(res.workUnits).toBe(0.5);
      expect(res.lateMinutes).toBe(0);
      expect(res.overtimeHours).toBe(1.0);
      expect(res.status).toBe('CHI_CHIEU');
    });

    it('ensures early arrival (08:30) and early departure (17:30) never produce negative values', () => {
      const res = calculateAttendanceMetrics({
        checkInTime: '08:30',
        checkOutTime: '17:30',
        milestones: defaultMilestones,
      });

      expect(res.lateMinutes).toBe(0);
      expect(res.overtimeHours).toBe(0);
      expect(res.sessionCount).toBe(2);
      expect(res.workUnits).toBe(1.0);
    });

    it('handles pending checkout on same day (DANG_LAM) and past day (THIEU_CHECK_OUT)', () => {
      const sameDay = calculateAttendanceMetrics({
        checkInTime: '08:55',
        isPastDay: false,
        milestones: defaultMilestones,
      });
      expect(sameDay.status).toBe('DANG_LAM');
      expect(sameDay.sessionCount).toBe(1);
      expect(sameDay.workUnits).toBe(0.5);

      const pastDay = calculateAttendanceMetrics({
        checkInTime: '08:55',
        isPastDay: true,
        milestones: defaultMilestones,
      });
      expect(pastDay.status).toBe('THIEU_CHECK_OUT');
    });

    it('handles no check-in on same day (CHUA_CHECK_IN) vs past day (VANG) vs ON_LEAVE', () => {
      const today = calculateAttendanceMetrics({ isPastDay: false });
      expect(today.status).toBe('CHUA_CHECK_IN');

      const past = calculateAttendanceMetrics({ isPastDay: true });
      expect(past.status).toBe('VANG');

      const paidLeave = calculateAttendanceMetrics({ isOnLeave: true, leaveType: 'PAID_LEAVE' });
      expect(paidLeave.status).toBe('NGHI_CO_LUONG');

      const unpaidLeave = calculateAttendanceMetrics({ isOnLeave: true, leaveType: 'UNPAID_LEAVE' });
      expect(unpaidLeave.status).toBe('NGHI_KHONG_LUONG');
    });
  });
});
