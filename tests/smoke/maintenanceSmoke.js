'use strict';
/**
 * tests/smoke/maintenanceSmoke.js - mode transitions + guard behavior. Usage: node tests/smoke/maintenanceSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const maintenance = require('../../lib/maintenance');
const { maintenanceGuard } = require('../../lib/maintenance/middleware');

function res() { const o = { _c: 200, _h: {}, set: (k, v) => { o._h[k] = v; }, status(c) { o._c = c; return o; }, json(j) { o._j = j; return o; } }; return o; }
function run(method, path) { return new Promise((resolve) => { const r = res(); let nexted = false; maintenanceGuard()({ method, path, url: path }, r, () => { nexted = true; }); setTimeout(() => resolve({ r, nexted }), 5); }); }

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('off: everything passes', async () => { await maintenance.set('off'); const { nexted } = await run('POST', '/api/deals'); assert.ok(nexted); });
  await t('read-only: GET passes, POST 503', async () => { await maintenance.set('read-only'); const g = await run('GET', '/api/deals'); assert.ok(g.nexted); const p = await run('POST', '/api/deals'); assert.strictEqual(p.r._c, 503); assert.ok(p.r._h['Retry-After']); });
  await t('full: blocks GET too', async () => { await maintenance.set('full'); const g = await run('GET', '/api/deals'); assert.strictEqual(g.r._c, 503); });
  await t('allowlist: health/version pass even in full', async () => { const h = await run('GET', '/api/health'); assert.ok(h.nexted); const v = await run('GET', '/version'); assert.ok(v.nexted); });
  await t('status reflects mode + active flag', async () => { const s = maintenance.status(); assert.strictEqual(s.mode, 'full'); assert.strictEqual(s.active, true); await maintenance.set('off'); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
