import test from 'node:test';
import assert from 'node:assert/strict';
import { validateToothChart, validateToothCode } from '../src/validators/odontogram.js';

const now = new Date('2026-10-15T12:00:00+07:00');

function expectCode(entries, code, patient = {}) {
  assert.throws(
    () => validateToothChart(entries, patient, { now }),
    error => error?.statusCode === 400 && error?.code === code,
  );
}

test('odontogram accepts permanent and primary FDI teeth with valid surfaces', () => {
  const result = validateToothChart([
    { toothCode: '11', surfaceCode: 'I', findingCode: 'CARIES' },
    { toothCode: '46', surfaceCode: 'O', findingCode: 'CARIES' },
    { toothCode: '55', surfaceCode: 'O', findingCode: 'CARIES' },
    { toothCode: '48', surfaceCode: null, findingCode: 'IMPACTED' },
  ], { dateOfBirth: '2018-05-01' }, { now });

  assert.equal(result.entries.length, 4);
  assert.deepEqual(result.warnings, []);
});

test('odontogram rejects tooth numbers outside FDI permanent and primary sets', () => {
  expectCode([{ toothCode: '19', surfaceCode: 'O', findingCode: 'CARIES' }], 'INVALID_FDI_TOOTH');
  assert.throws(
    () => validateToothCode('A'),
    error => error?.code === 'INVALID_FDI_TOOTH',
  );
});

test('odontogram rejects unknown and anatomically mismatched surfaces', () => {
  expectCode([{ toothCode: '46', surfaceCode: 'X', findingCode: 'CARIES' }], 'INVALID_TOOTH_SURFACE');
  expectCode([{ toothCode: '11', surfaceCode: 'O', findingCode: 'CARIES' }], 'TOOTH_SURFACE_NOT_APPLICABLE');
  expectCode([{ toothCode: '46', surfaceCode: 'I', findingCode: 'CARIES' }], 'TOOTH_SURFACE_NOT_APPLICABLE');
});

test('odontogram requires a surface for a caries finding', () => {
  expectCode([{ toothCode: '16', findingCode: 'CARIES' }], 'TOOTH_SURFACE_REQUIRED');
});

test('odontogram rejects duplicate tooth and surface findings in one payload', () => {
  expectCode([
    { toothCode: '16', surfaceCode: 'O', findingCode: 'CARIES' },
    { toothCode: '16', surfaceCode: 'O', findingCode: 'CROWN' },
  ], 'DUPLICATE_TOOTH_SURFACE');
});

test('odontogram warns instead of blocking primary teeth for an adult patient', () => {
  const result = validateToothChart(
    [{ toothCode: '55', surfaceCode: null, findingCode: 'MISSING' }],
    { dateOfBirth: '1990-01-01' },
    { now },
  );

  assert.equal(result.warnings[0].code, 'PRIMARY_TOOTH_ADULT_WARNING');
  assert.equal(result.warnings[0].toothCode, '55');
});
