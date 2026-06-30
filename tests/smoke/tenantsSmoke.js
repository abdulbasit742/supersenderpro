'use strict';
/**
 * tests/smoke/tenantsSmoke.js - tenant lifecycle on the json driver. Usage: node tests/smoke/tenantsSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const tenants = require('../../lib/tenants');

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  const ref = 'smoke_tenant_' + Date.now();
  await t('create tenant (active, free)', async () => { const x = await tenants.createTenant({ id: ref, name: 'Acme' }); assert.strictEqual(x.status, 'active'); assert.strictEqual(x.planId, 'free'); });
  await t('duplicate create rejected', async () => { let threw = false; try { await tenants.createTenant({ id: ref, name: 'Acme2' }); } catch { threw = true; } assert.ok(threw); });
  await t('list includes the tenant', async () => { const all = await tenants.listTenants(); assert.ok(all.some((x) => x.id === ref)); });
  await t('suspend -> isActive false', async () => { await tenants.suspend(ref, 'nonpayment'); assert.strictEqual(await tenants.isActive(ref), false); });
  await t('resume -> isActive true', async () => { await tenants.resume(ref); assert.strictEqual(await tenants.isActive(ref), true); });
  await t('setPlan updates plan', async () => { const x = await tenants.setPlan(ref, 'pro'); assert.strictEqual(x.planId, 'pro'); });
  await t('filter by status=active', async () => { const act = await tenants.listTenants({ status: 'active' }); assert.ok(act.some((x) => x.id === ref)); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
