import { ApiError } from '../utils/api-error.js';

export function validateAppointmentPayload(payload, { now = new Date() } = {}) {
  const input = payload && typeof payload === 'object' ? payload : {};
  if (!input.patientId || !input.branchId) {
    throw ApiError.badRequest('APPOINTMENT_REQUIRED_FIELDS', 'Bệnh nhân và chi nhánh là bắt buộc');
  }
  if (!input.doctorId) {
    throw ApiError.badRequest('APPOINTMENT_DOCTOR_REQUIRED', 'Lịch hẹn phải được phân công bác sĩ');
  }

  const startsAt = new Date(input.startsAt);
  const endsAt = new Date(input.endsAt);
  if (!input.startsAt || !input.endsAt || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    throw ApiError.badRequest('INVALID_APPOINTMENT_TIME', 'Thời gian bắt đầu và kết thúc lịch hẹn phải hợp lệ');
  }
  if (startsAt.getTime() < now.getTime()) {
    throw ApiError.badRequest('APPOINTMENT_IN_PAST', 'Không thể đặt lịch hẹn trong quá khứ');
  }
  if (endsAt.getTime() <= startsAt.getTime()) {
    throw ApiError.badRequest('APPOINTMENT_END_BEFORE_START', 'Thời gian kết thúc phải sau thời gian bắt đầu');
  }

  return {
    ...input,
    startsAt,
    endsAt,
    note: input.note ? String(input.note).trim() : null,
  };
}

