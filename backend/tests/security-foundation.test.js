import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import bcrypt from 'bcrypt';
import { passwordSchema } from '../src/validators/password.js';
import { requestLogger } from '../src/middlewares/request-logger.js';
import { createDatabase } from '../src/config/db.js';
import { parseEnv } from '../src/config/env.js';

test('password policy rejects missing character classes and bcrypt truncation', () => {
  for (const invalid of ['Ab1!xxxx', 'abcdefgh1!', 'ABCDEFGH1!', 'Abcdefgh!!', 'Abcdefgh12', `Aa1!${'é'.repeat(35)}`]) {
    assert.equal(passwordSchema.safeParse(invalid).success, false);
  }
  assert.equal(passwordSchema.safeParse('ValidLocal123!').success, true);
});

test('bcrypt hashes verify and do not store the cleartext password', async () => {
  const hash = await bcrypt.hash('ValidLocal123!', 4);
  assert.equal(hash.length, 60);
  assert.equal(await bcrypt.compare('ValidLocal123!', hash), true);
  assert.equal(await bcrypt.compare('WrongLocal123!', hash), false);
});

test('request logging omits URL query, headers and clinical payload', () => {
  const output = [];
  const logger = { info: (...args) => output.push(args) };
  const req = { method: 'POST', url: '/emr?patient=SECRET', body: { diagnosis: 'SECRET' }, headers: { authorization: 'SECRET' } };
  const res = new EventEmitter();
  res.set = () => {};
  res.statusCode = 200;
  requestLogger(logger)(req, res, () => {});
  res.emit('finish');
  assert.equal(output.length, 1);
  assert.equal(output[0][0].status, 200);
  assert.doesNotMatch(JSON.stringify(output), /SECRET|diagnosis|authorization/);
});

test('missing SQL credentials fail before opening any connection', async () => {
  const db = createDatabase(parseEnv({}).db);
  try {
    await assert.rejects(db.checkDatabase(), { code: 'DB_CREDENTIALS_MISSING' });
  } finally {
    await db.close();
  }
});
