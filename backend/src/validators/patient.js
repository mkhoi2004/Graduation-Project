import { ApiError } from '../utils/api-error.js';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOCAL_PHONE_PATTERN = /^0\d{9}$/;
const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

function parseDateOnly(value) {
  if (typeof value !== 'string' || !DATE_ONLY_PATTERN.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) return null;
  return { date, year, month, day };
}

function ageOn({ year, month, day }, now) {
  const currentYear = now.getFullYear();
  let age = currentYear - year;
  const birthdayPassed = (now.getMonth() + 1) > month
    || ((now.getMonth() + 1) === month && now.getDate() >= day);
  if (!birthdayPassed) age -= 1;
  return age;
}

function normalizePhone(value) {
  return String(value).trim().replace(/[\s().-]/g, '');
}

export function validatePatientPayload(payload, { now = new Date(), partial = false } = {}) {
  const input = payload && typeof payload === 'object' ? payload : {};
  const value = {};

  if (!partial || input.fullName !== undefined) {
    const fullName = String(input.fullName ?? '').trim();
    if (!fullName) {
      throw ApiError.badRequest('PATIENT_NAME_REQUIRED', 'Họ và tên bệnh nhân là bắt buộc');
    }
    value.fullName = fullName;
  }

  const hasDateOfBirth = input.dateOfBirth !== undefined && input.dateOfBirth !== null && input.dateOfBirth !== '';
  const hasBirthYear = input.birthYear !== undefined && input.birthYear !== null && input.birthYear !== '';
  if (!partial && !hasDateOfBirth && !hasBirthYear) {
    throw ApiError.badRequest(
      'PATIENT_BIRTH_INFORMATION_REQUIRED',
      'Ngày sinh hoặc năm sinh của bệnh nhân là bắt buộc',
    );
  }
  if (hasDateOfBirth && hasBirthYear) {
    throw ApiError.badRequest('BIRTH_DATE_YEAR_CONFLICT', 'Chỉ nhập ngày sinh hoặc năm sinh, không nhập đồng thời cả hai');
  }

  let patientAge = null;
  if (hasDateOfBirth) {
    const parsed = parseDateOnly(input.dateOfBirth);
    if (!parsed) {
      throw ApiError.badRequest('INVALID_DATE_OF_BIRTH', 'Ngày sinh phải là ngày hợp lệ theo định dạng yyyy-MM-dd');
    }
    const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    if (parsed.date.getTime() > todayUtc) {
      throw ApiError.badRequest('DATE_OF_BIRTH_IN_FUTURE', 'Ngày sinh không được ở tương lai');
    }
    value.dateOfBirth = input.dateOfBirth;
    patientAge = ageOn(parsed, now);
  } else if (input.dateOfBirth !== undefined) {
    value.dateOfBirth = null;
  }

  if (hasBirthYear) {
    const birthYear = Number(input.birthYear);
    const currentYear = now.getFullYear();
    if (!Number.isInteger(birthYear) || birthYear < 1900 || birthYear > currentYear) {
      throw ApiError.badRequest('INVALID_BIRTH_YEAR', `Năm sinh phải nằm trong khoảng 1900-${currentYear}`);
    }
    value.birthYear = birthYear;
    patientAge = currentYear - birthYear;
  } else if (input.birthYear !== undefined) {
    value.birthYear = null;
  }

  if (input.phone !== undefined) {
    if (input.phone === null || String(input.phone).trim() === '') {
      value.phone = null;
    } else {
      const phone = normalizePhone(input.phone);
      if (!LOCAL_PHONE_PATTERN.test(phone) && !E164_PHONE_PATTERN.test(phone)) {
        throw ApiError.badRequest('INVALID_PHONE', 'Số điện thoại phải gồm 10 chữ số nội địa hoặc theo định dạng E.164');
      }
      value.phone = phone;
    }
  }

  if (input.email !== undefined) {
    if (input.email === null || String(input.email).trim() === '') {
      value.email = null;
    } else {
      const email = String(input.email).trim().toLowerCase();
      if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
        throw ApiError.badRequest('INVALID_EMAIL', 'Email không đúng định dạng');
      }
      value.email = email;
    }
  }

  if (input.guardianName !== undefined) {
    value.guardianName = String(input.guardianName ?? '').trim() || null;
  }

  if (patientAge !== null && patientAge < 18 && !String(input.guardianName ?? '').trim()) {
    throw ApiError.badRequest('GUARDIAN_REQUIRED_FOR_MINOR', 'Bệnh nhân dưới 18 tuổi bắt buộc có người giám hộ');
  }

  for (const key of ['gender', 'status', 'allergy', 'allergyReaction', 'medicalHistory', 'confirmDuplicatePhone', 'patientCode']) {
    if (input[key] !== undefined) value[key] = input[key];
  }

  return value;
}

