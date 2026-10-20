import { describe, expect, it } from 'vitest';
import { clinicDateToDbDate, getClinicBusinessDate, getClinicTimeParts } from './clinic-time.js';

describe('clinic time in Asia/Ho_Chi_Minh', () => {
  it('changes the business date exactly at midnight in the clinic timezone', () => {
    expect(getClinicBusinessDate(new Date('2026-10-20T16:59:59.000Z'))).toBe('2026-10-20');
    expect(getClinicBusinessDate(new Date('2026-10-20T17:00:00.000Z'))).toBe('2026-10-21');
  });

  it('returns clinic-local date and time independently of the host timezone', () => {
    expect(getClinicTimeParts(new Date('2026-10-20T18:30:00.000Z'))).toEqual({
      date: '2026-10-21',
      time: '01:30',
    });
  });

  it('stores a business date as a stable UTC date-only value', () => {
    expect(clinicDateToDbDate('2026-10-21').toISOString()).toBe('2026-10-21T00:00:00.000Z');
    expect(() => clinicDateToDbDate('21/10/2026')).toThrow('Ngày nghiệp vụ không hợp lệ');
  });
});
