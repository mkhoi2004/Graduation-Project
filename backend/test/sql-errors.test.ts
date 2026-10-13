import { expect, it } from 'vitest';
import { sqlErrorStatus } from '../src/http.js';

it('classifies the underlying FK violation when ODBC reports statement termination last', () => {
  expect(sqlErrorStatus({ number: 3621, precedingErrors: [{ number: 547 }] })).toBe(409);
  expect(sqlErrorStatus({ number: 3621, precedingErrors: [{ number: 51020 }] })).toBe(409);
  expect(sqlErrorStatus({ number: 229 })).toBe(403);
});
