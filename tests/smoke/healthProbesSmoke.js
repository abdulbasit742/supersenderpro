'use strict';
/**
 * tests/smoke/healthProbesSmoke.js - db + redis probes report sane statuses; readiness includes db.
 * Usage: node tests/smoke/healthProbesSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const { dbProbe, redisProbe } = require('../../lib/healthCheck/probes/datastore');
const health = require('../../lib/healthCheck');

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('db probe ok on json driver', async () => { const r = await dbProbe(); assert.strictEqual(r.status, 'ok'); assert.strictEqual(r.driver, 'json'); });
  await t('redis probe degraded (not down) without REDIS_URL', async () => { const r = await redisProbe(); assert.strictEqual(r.status, 'degraded'); assert.strictEqual(r.mode, 'memory'); });
  await t('full health includes db + redis checks', async () => { const h = await health.getHealth({ force: true }); assert.ok(h.checks.db); assert.ok(h.checks.redis); });
  await t('readiness gates on db', async () => { const r = await health.getReadiness(); assert.ok(r.checks.db); assert.notStrictEqual(r.status, undefined); });
  await t('memory-fallback redis keeps overall not-down', async () => { const h = await health.getHealth({ force: true }); assert.notStrictEqual(h.status, 'down'); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
