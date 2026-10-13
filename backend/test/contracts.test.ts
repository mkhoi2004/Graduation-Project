import { describe, expect, it } from 'vitest';
import { createHash, validPassword, verifyHash } from '../src/security/password.js';
import { netPayable, outstanding, validateAllocation } from '../src/billing/money.js';
import { patientErrors, safeId, visitErrors } from '../src/validation.js';

describe('password compatibility', () => {
  it('accepts existing PBKDF2-SHA256 hashes and rejects the wrong password', () => {
    const existing = 'pbkdf2-sha256$100000$AAAAAAAAAAAAAAAAAAAAAA==$SJ2XZY2MT/Am0ejd7aiupDkBz9bjrVdnWQiNCKi0tCw=';
    expect(verifyHash('Admin1234@', existing)).toBe(true);
    expect(verifyHash('wrong', existing)).toBe(false);
  });
  it('requires more than eight characters and a special character', () => {
    expect(validPassword('Admin1234@')).toBe(true);
    expect(validPassword('Abc1234@')).toBe(false);
    expect(validPassword('Admin12345')).toBe(false);
    expect(verifyHash('Admin1234@', createHash('Admin1234@'))).toBe(true);
  });
});

describe('money remains decimal', () => {
  it('calculates fractional quantity and tax exactly', () => {
    expect(netPayable([{ quantity: '0.125', unitPrice: '100.0000', discount: '1.5000', tax: '0.0250' }], '0')).toBe('11.025');
    expect(() => validateAllocation('11.025', '10.000', '1.024')).toThrow();
    expect(outstanding('100.10', '20.02', '30.03', '0', '0')).toBe('50.05');
  });
  it('rejects refund or payment beyond the allocation', () => {
    expect(() => outstanding('100', '100', '0', '0', '101')).toThrow();
    expect(() => outstanding('100', '101', '0', '0', '0')).toThrow();
  });
  it('keeps every digit in large SQL DECIMAL multiplication', () => {
    expect(netPayable([{ quantity: '999999999.999', unitPrice: '999999999999999.9999', discount: '0', tax: '0' }], '0'))
      .toBe('999999999998999999900000.0000001');
  });
});

describe('request boundaries', () => {
  it('rejects unsafe SQL BIGINT values instead of rounding them', () => {
    expect(safeId('9007199254740991')).toBe(9007199254740991);
    expect(() => safeId('9007199254740992')).toThrow();
    expect(() => safeId('1.5')).toThrow();
  });
  it('checks birth year and visit type', () => {
    expect(patientErrors({ fullName: 'An', dateOfBirth: '2000-01-01', birthYear: 2001, phone: null })).toHaveProperty('birthYear');
    expect(visitErrors({ patientId: 1, doctorUserId: null, branchCode: 'HN', visitType: 'OTHER' })).toHaveProperty('visitType');
  });
  it('reports malformed or missing request bodies without crashing', () => {
    expect(patientErrors(undefined as unknown as Parameters<typeof patientErrors>[0])).toHaveProperty('fullName');
    expect(visitErrors(undefined as unknown as Parameters<typeof visitErrors>[0])).toHaveProperty('patientId');
  });
});
