'use strict';
/**
 * tests/smoke/dataExportSmoke.js - export bundles data, erase requires confirm + wipes, isolation holds.
 * Usage: node tests/smoke/dataExportSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const repo = require('../../lib/db');
const { exportTenant, eraseTenant } = require('../../lib/compliance/dataExport');

const A = 'gdpr_A_' + Date.now();
const B = 'gdpr_B_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('seed + export bundles tenant data', async () => {
    await repo.create(A, 'customers', { phone: '111', name: 'A1' });
    await repo.create(A, 'deals', { title: 'D1' });
    await repo.create(B, 'customers', { phone: '222', name: 'B1' });
    const bundle = await exportTenant(A);
    assert.ok(bundle.totalRows >= 2);
    assert.ok(bundle.data.customers.length >= 1);
  });
  await t('export redacts password/key hashes', async () => {
    await repo.create(A, 'users', { email: 'x@a.com', passwordHash: 'SECRET' });
    const bundle = await exportTenant(A);
    assert.ok(bundle.data.users.every((u) => !('passwordHash' in u)));
  });
  await t('erase without confirm throws', async () => { let threw = false; try { await eraseTenant(A, 'wrong'); } catch { threw = true; } assert.ok(threw); });
  await t('erase with confirm wipes A', async () => {
    const r = await eraseTenant(A, A);
    assert.ok(r.total >= 2);
    const after = await exportTenant(A);
    assert.strictEqual(after.totalRows, 0);
  });
  await t('B untouched by A erasure', async () => {
    const b = await exportTenant(B);
    assert.ok(b.data.customers.length >= 1);
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
