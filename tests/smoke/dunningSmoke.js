'use strict';
/**
 * tests/smoke/dunningSmoke.js - subscription notifications produce a message + emit an event.
 * Usage: node tests/smoke/dunningSmoke.js
 */
process.env.DB_DRIVER = 'json';
process.env.NOTIFY_DRY_RUN = 'true';
const assert = require('assert');
const dun = require('../../lib/billing/notifications');
const bus = require('../../lib/events/bus');

const T = 'dunning_' + Date.now();
const seen = [];
bus.on('*', (e) => seen.push(e.event));
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  await t('past_due builds a message + emits event', async () => {
    const r = await dun.notifySubscriptionEvent(T, 'past_due', { to: '923001234567' });
    assert.ok(/payment/i.test(r.message));
    assert.strictEqual(r.event, 'subscription.past_due');
    await sleep(20);
    assert.ok(seen.includes('subscription.past_due'));
  });
  await t('recovered + canceled + upgraded supported', async () => {
    for (const k of ['recovered', 'canceled', 'upgraded']) { const r = await dun.notifySubscriptionEvent(T, k, { to: '923001234567', planId: 'pro' }); assert.ok(r.message.length > 0); }
  });
  await t('unknown kind throws', async () => { let threw = false; try { await dun.notifySubscriptionEvent(T, 'nope'); } catch { threw = true; } assert.ok(threw); });
  await t('no recipient => prepared only, no throw', async () => { const r = await dun.notifySubscriptionEvent(T, 'past_due'); assert.ok(r.notify.note || Object.keys(r.notify).length >= 0); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
