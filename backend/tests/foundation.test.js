import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { parseEnv } from '../src/config/env.js';
import { createHealthService } from '../src/services/health-service.js';

const config = { clientOrigin: 'http://localhost:5173', logLevel: 'silent' };

test('liveness does not require SQL; readiness does query SQL', async () => {
  let calls = 0;
  const health = createHealthService({ checkDatabase: async () => { calls++; } });
  const app = createApp({ config, health });
  await request(app).get('/api/health').expect(200).expect(({ body }) => assert.equal(body.status, 'ok'));
  assert.equal(calls, 0);
  await request(app).get('/api/health/ready').expect(200)
    .expect(({ body }) => assert.equal(body.database, 'ready'));
  assert.equal(calls, 1);
});

test('SQL failure is 503 without leaking SQL credentials or query', async () => {
  const health = createHealthService({ checkDatabase: async () => { throw new Error('password=secret; SELECT patient'); } });
  const response = await request(createApp({ config, health })).get('/api/health/ready').expect(503);
  assert.equal(response.body.database, 'unavailable');
  assert.doesNotMatch(response.text, /secret|password|SELECT/);
});

test('unknown API and invalid JSON have stable errors without stack traces', async () => {
  const app = createApp({ config, health: createHealthService({ checkDatabase: async () => {} }) });
  await request(app).get('/api/missing').expect(404)
    .expect(({ body }) => assert.equal(body.error.code, 'NOT_FOUND'));
  const response = await request(app).post('/api/missing').set('Content-Type', 'application/json').send('{').expect(400);
  assert.equal(response.body.error.code, 'INVALID_JSON');
  assert.doesNotMatch(response.text, /SyntaxError|stack|node_modules/);
});

test('configuration parses false correctly and supports named instance or fixed port', () => {
  const named = parseEnv({ DB_ENCRYPT: 'false', DB_TRUST_SERVER_CERTIFICATE: 'true' });
  assert.equal(named.db.encrypt, false);
  assert.equal(named.db.instance, 'SQLEXPRESS');
  assert.equal(named.db.name, 'Graduation Project');
  const fixed = parseEnv({ DB_PORT: '14330' });
  assert.equal(fixed.db.port, 14330);
  assert.equal(fixed.db.instance, undefined);
  assert.throws(() => parseEnv({ DB_ENCRYPT: 'typo' }));
  assert.throws(() => parseEnv({ PORT: '-1' }));
  assert.throws(() => parseEnv({ CLIENT_ORIGIN: 'https://example.com' }));
});
