'use strict';
/**
 * tests/smoke/notifySmoke.js - dispatcher routing, dry-run, unknown channel, status.
 * Usage: node tests/smoke/notifySmoke.js
 */
const assert = require('assert');
const notify = require('../../lib/notify');

let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('dry-run prepares without sending', async () => { const r = await notify.send('email', 'a@b.com', 'hi', { dryRun: true }); assert.strictEqual(r.dryRun, true); assert.strictEqual(r.ok, true); });
  await t('unknown channel returns error', async () => { const r = await notify.send('pigeon', 'x', 'hi'); assert.strictEqual(r.ok, false); assert.ok(/unknown channel/.test(r.error)); });
  await t('whatsapp provider prepares when sender missing', async () => { const r = await notify.send('whatsapp', '92300', 'hi', { dryRun: false }); assert.ok(r.prepared || r.ok === false); });
  await t('broadcast hits multiple channels', async () => { const r = await notify.broadcast(['email', 'whatsapp'], 'a@b.com', 'hi', { dryRun: true }); assert.ok(r.email && r.whatsapp); });
  await t('status reports channels + dry-run flag', async () => { const s = notify.status(); assert.ok('email' in s.channels); assert.strictEqual(typeof s.dryRun, 'boolean'); });
  await t('custom provider can be registered', async () => { let called = false; notify.register('test', { detect: () => true, send: async () => { called = true; return { ok: true }; } }); const r = await notify.send('test', 'x', 'y', { dryRun: false }); assert.ok(r.ok && called); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
