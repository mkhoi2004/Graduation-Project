import test from 'node:test';
import assert from 'node:assert/strict';
import { validateAppointmentPayload } from '../src/validators/appointment.js';
import { assertVisitTransition } from '../src/validators/visit-status.js';

const now = new Date('2026-10-15T09:00:00+07:00');

function expectAppointmentCode(payload, code) {
  assert.throws(
    () => validateAppointmentPayload(payload, { now }),
    error => error?.statusCode === 400 && error?.code === code,
  );
}

test('appointment validation accepts and normalizes a future slot', () => {
  const value = validateAppointmentPayload({
    patientId: 'patient-1',
    branchId: 'branch-1',
    doctorId: 'doctor-1',
    roomId: 'room-1',
    startsAt: '2026-10-15T10:00:00+07:00',
    endsAt: '2026-10-15T10:30:00+07:00',
    note: '  Tái khám  ',
  }, { now });

  assert.equal(value.startsAt.toISOString(), '2026-10-15T03:00:00.000Z');
  assert.equal(value.endsAt.toISOString(), '2026-10-15T03:30:00.000Z');
  assert.equal(value.note, 'Tái khám');
});

test('appointment validation rejects missing doctor assignment', () => {
  expectAppointmentCode({
    patientId: 'patient-1', branchId: 'branch-1',
    startsAt: '2026-10-15T10:00:00+07:00', endsAt: '2026-10-15T10:30:00+07:00',
  }, 'APPOINTMENT_DOCTOR_REQUIRED');
});

test('appointment validation rejects past, invalid and reversed slots', () => {
  expectAppointmentCode({
    patientId: 'patient-1', branchId: 'branch-1', doctorId: 'doctor-1',
    startsAt: 'not-a-date', endsAt: '2026-10-15T10:30:00+07:00',
  }, 'INVALID_APPOINTMENT_TIME');
  expectAppointmentCode({
    patientId: 'patient-1', branchId: 'branch-1', doctorId: 'doctor-1',
    startsAt: '2026-10-15T08:00:00+07:00', endsAt: '2026-10-15T08:30:00+07:00',
  }, 'APPOINTMENT_IN_PAST');
  expectAppointmentCode({
    patientId: 'patient-1', branchId: 'branch-1', doctorId: 'doctor-1',
    startsAt: '2026-10-15T10:30:00+07:00', endsAt: '2026-10-15T10:00:00+07:00',
  }, 'APPOINTMENT_END_BEFORE_START');
});

test('visit state machine allows only documented forward transitions', () => {
  assert.doesNotThrow(() => assertVisitTransition('REGISTERED', 'IN_PROGRESS'));
  assert.doesNotThrow(() => assertVisitTransition('IN_PROGRESS', 'CLINICAL_COMPLETED'));
  assert.doesNotThrow(() => assertVisitTransition('CLINICAL_COMPLETED', 'CLOSED'));

  assert.throws(
    () => assertVisitTransition('REGISTERED', 'CLINICAL_COMPLETED'),
    error => error?.statusCode === 409 && error?.code === 'INVALID_VISIT_STATUS_TRANSITION',
  );
  assert.throws(
    () => assertVisitTransition('CLOSED', 'IN_PROGRESS'),
    error => error?.statusCode === 409 && error?.code === 'INVALID_VISIT_STATUS_TRANSITION',
  );
});

test('visit cancellation and hold require a reason', () => {
  for (const status of ['CANCELLED', 'ON_HOLD']) {
    assert.throws(
      () => assertVisitTransition('REGISTERED', status, '   '),
      error => error?.statusCode === 400 && error?.code === 'VISIT_STATUS_REASON_REQUIRED',
    );
  }
  assert.doesNotThrow(() => assertVisitTransition('REGISTERED', 'CANCELLED', 'Bệnh nhân yêu cầu hủy'));
});
