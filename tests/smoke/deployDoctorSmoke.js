'use strict';
/**
 * tests/smoke/deployDoctorSmoke.js - validates the env schema logic (no process exit).
 * Usage: node tests/smoke/deployDoctorSmoke.js
 */
const assert = require('assert');
const { validate } = require('../../lib/deploy/envSchema');

let passed = 0;
const t = (n, fn) => { try { fn(); passed++; console.log('OK', n); } catch (e) { console.error('XX', n, '-', e.message); process.exitCode = 1; } };

t('missing required secrets are flagged', () => {
  const r = validate({ DB_DRIVER: 'json' });
  const keys = r.missing.map((m) => m.key);
  assert.ok(keys.includes('SESSION_SECRET'));
  assert.ok(keys.includes('AUTH_JWT_SECRET'));
  assert.strictEqual(r.ok, false);
});
t('postgres driver requires DATABASE_URL', () => {
  const r = validate({ SESSION_SECRET: 'x'.repeat(32), AUTH_JWT_SECRET: 'y'.repeat(32), DB_DRIVER: 'postgres' });
  assert.ok(r.missing.map((m) => m.key).includes('DATABASE_URL'));
});
t('valid minimal prod env passes', () => {
  const r = validate({ SESSION_SECRET: 'x'.repeat(32), AUTH_JWT_SECRET: 'y'.repeat(32), DB_DRIVER: 'json' });
  assert.strictEqual(r.ok, true);
});
t('stripe key without webhook secret warns', () => {
  const r = validate({ SESSION_SECRET: 'x'.repeat(32), AUTH_JWT_SECRET: 'y'.repeat(32), STRIPE_SECRET_KEY: 'sk_test' });
  assert.ok(r.warnings.some((w) => w.includes('STRIPE_WEBHOOK_SECRET')));
});

console.log('\n' + passed + ' checks passed.');
process.exit(process.exitCode || 0);
