import test from 'node:test';
import assert from 'node:assert/strict';
import { validatePatientPayload } from '../src/validators/patient.js';

const now = new Date('2026-10-15T12:00:00+07:00');

function expectCode(payload, code, options = {}) {
  assert.throws(
    () => validatePatientPayload(payload, { now, ...options }),
    error => error?.statusCode === 400 && error?.code === code,
  );
}

test('patient validation normalizes valid adult demographics', () => {
  const value = validatePatientPayload({
    fullName: '  Nguyễn Văn An  ',
    dateOfBirth: '1990-05-15',
    phone: '0901 234 567',
    email: ' An.Nguyen@example.com ',
  }, { now });

  assert.deepEqual(value, {
    fullName: 'Nguyễn Văn An',
    dateOfBirth: '1990-05-15',
    phone: '0901234567',
    email: 'an.nguyen@example.com',
  });
});

test('patient validation rejects a blank required name', () => {
  expectCode({ fullName: '   ', birthYear: 1990 }, 'PATIENT_NAME_REQUIRED');
});

test('patient validation rejects a future date of birth', () => {
  expectCode({ fullName: 'Bệnh nhân giả lập', dateOfBirth: '2026-10-16' }, 'DATE_OF_BIRTH_IN_FUTURE');
});

test('patient validation rejects simultaneous date of birth and birth year', () => {
  expectCode({ fullName: 'Bệnh nhân giả lập', dateOfBirth: '2000-01-01', birthYear: 2000 }, 'BIRTH_DATE_YEAR_CONFLICT');
});

test('patient validation requires either date of birth or birth year on create', () => {
  expectCode({ fullName: 'Bệnh nhân thiếu ngày sinh' }, 'PATIENT_BIRTH_INFORMATION_REQUIRED');
});

test('patient validation rejects an invalid birth year', () => {
  expectCode({ fullName: 'Bệnh nhân giả lập', birthYear: 2027 }, 'INVALID_BIRTH_YEAR');
});

test('patient validation rejects malformed phone and email', () => {
  expectCode({ fullName: 'Bệnh nhân giả lập', birthYear: 1990, phone: '123-abc' }, 'INVALID_PHONE');
  expectCode({ fullName: 'Bệnh nhân giả lập', birthYear: 1990, email: 'invalid@' }, 'INVALID_EMAIL');
});

test('patient validation requires guardian for a patient younger than 18', () => {
  expectCode({ fullName: 'Bệnh nhân vị thành niên', dateOfBirth: '2010-10-16' }, 'GUARDIAN_REQUIRED_FOR_MINOR');

  const value = validatePatientPayload({
    fullName: 'Bệnh nhân vị thành niên',
    dateOfBirth: '2010-10-16',
    guardianName: '  Nguyễn Văn Giám Hộ ',
  }, { now });
  assert.equal(value.guardianName, 'Nguyễn Văn Giám Hộ');
});

test('patient partial update validates only supplied fields', () => {
  const value = validatePatientPayload({ email: ' NEW@example.com ' }, { now, partial: true });
  assert.deepEqual(value, { email: 'new@example.com' });
});
