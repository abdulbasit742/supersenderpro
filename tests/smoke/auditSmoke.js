'use strict';
/**
 * tests/smoke/auditSmoke.js - audit record/query + tenant isolation. Usage: node tests/smoke/auditSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const audit = require('../../lib/audit');

const A = 'audit_A_' + Date.now();
const B = 'audit_B_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('record returns an entry with action+timestamp', async () => { const e = await audit.record(A, 'billing.plan_change', { id: 'u1', email: 'o@a.com', role: 'owner' }, { from: 'free', to: 'pro' }); assert.strictEqual(e.action, 'billing.plan_change'); assert.ok(e.at); });
  await t('missing tenantId throws', async () => { let threw = false; try { await audit.record(undefined, 'x', {}); } catch { threw = true; } assert.ok(threw); });
  await t('query returns newest first', async () => { await audit.record(A, 'auth.login', { id: 'u1' }, {}); const rows = await audit.query(A, {}); assert.ok(rows.length >= 2); assert.ok(new Date(rows[0].at) >= new Date(rows[1].at)); });
  await t('filter by action', async () => { const rows = await audit.query(A, { action: 'auth.login' }); assert.ok(rows.every((r) => r.action === 'auth.login')); });
  await t('tenant isolation: B sees none of A', async () => { const rows = await audit.query(B, {}); assert.strictEqual(rows.length, 0); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
