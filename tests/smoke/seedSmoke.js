'use strict';
/**
 * tests/smoke/seedSmoke.js - seeding creates data, clearing removes it, isolation holds.
 * Usage: node tests/smoke/seedSmoke.js
 */
process.env.DB_DRIVER = 'json';
process.env.AUTH_JWT_SECRET = 'seed-secret';
const assert = require('assert');
const { seedTenant, clearTenant } = require('../../lib/seed/demoData');
const SP = require('../../lib/salesPipeline');
const auth = require('../../lib/auth');

const T = 'seed_demo_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('seed creates owner + deals + invoice', async () => {
    const s = await seedTenant(T);
    assert.ok(s.created.customers >= 4);
    assert.ok(s.created.deals >= 5);
    assert.ok(s.created.invoice);
  });
  await t('seeded owner can log in', async () => { const r = await auth.login(T, { email: 'owner@demo.test', password: 'demopassword1' }); assert.ok(r.token); });
  await t('seeded pipeline has a won deal', async () => { const m = SP.pipeline.metrics(T); assert.ok(m.won >= 1); });
  await t('clear removes seeded data', async () => { const c = await clearTenant(T); assert.ok(c.cleared.deals >= 5); const m = SP.pipeline.metrics(T); assert.strictEqual(m.totalDeals, 0); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
