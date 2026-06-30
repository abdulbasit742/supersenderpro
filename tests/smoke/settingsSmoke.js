'use strict';
/**
 * tests/smoke/settingsSmoke.js - defaults, set, type coercion, unknown-key rejection, isolation.
 * Usage: node tests/smoke/settingsSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const settings = require('../../lib/settings');

const A = 'settings_A_' + Date.now();
const B = 'settings_B_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('getAll returns defaults', async () => { const s = await settings.getAll(A); assert.strictEqual(s.brandName, 'SuperSender'); assert.strictEqual(s.currency, 'PKR'); assert.strictEqual(s.followUpEnabled, true); });
  await t('set overrides + coerces bool', async () => { const s = await settings.set(A, { brandName: 'Acme', followUpEnabled: 'false' }); assert.strictEqual(s.brandName, 'Acme'); assert.strictEqual(s.followUpEnabled, false); });
  await t('json setting coerces from string', async () => { const s = await settings.set(A, { businessHours: '{"mon":"10:00-16:00"}' }); assert.strictEqual(s.businessHours.mon, '10:00-16:00'); });
  await t('unknown key rejected', async () => { let threw = false; try { await settings.set(A, { nope: 1 }); } catch { threw = true; } assert.ok(threw); });
  await t('reset(key) restores default', async () => { const s = await settings.reset(A, 'brandName'); assert.strictEqual(s.brandName, 'SuperSender'); });
  await t('tenant isolation: B has defaults, not A overrides', async () => { const s = await settings.getAll(B); assert.strictEqual(s.brandName, 'SuperSender'); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
