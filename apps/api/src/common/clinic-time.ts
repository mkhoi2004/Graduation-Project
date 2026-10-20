const CLINIC_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const clinicDateTimeFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: CLINIC_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function getClinicTimeParts(now: Date = new Date()): { date: string; time: string } {
  const parts = Object.fromEntries(
    clinicDateTimeFormatter
      .formatToParts(now)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );

  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    time: `${parts.hour}:${parts.minute}`,
  };
}

export function getClinicBusinessDate(now: Date = new Date()): string {
  return getClinicTimeParts(now).date;
}

export function clinicDateToDbDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error('Ngày nghiệp vụ không hợp lệ.');
  }

  const value = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(value.getTime()) || value.toISOString().slice(0, 10) !== date) {
    throw new Error('Ngày nghiệp vụ không hợp lệ.');
  }
  return value;
}

