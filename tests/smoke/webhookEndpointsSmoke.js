'use strict';
/**
 * tests/smoke/webhookEndpointsSmoke.js - CRUD + secret-once + event subscription + fanout (dry-run).
 * Usage: node tests/smoke/webhookEndpointsSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const ep = require('../../lib/webhooks/endpoints');

const A = 'whep_A_' + Date.now();
const B = 'whep_B_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  let id;
  await t('create returns secret once + valid url enforced', async () => {
    let threw = false; try { await ep.create(A, { url: 'ftp://bad' }); } catch { threw = true; } assert.ok(threw);
    const e = await ep.create(A, { url: 'https://hook.example.com', events: ['order.paid'] });
    assert.ok(e.secret && e.secret.startsWith('whsec_'));
    id = e.id;
  });
  await t('list masks secret', async () => { const list = await ep.list(A); assert.ok(list[0].hasSecret === true); assert.ok(!('secret' in list[0])); });
  await t('subscription matching works', async () => { assert.ok(ep.subscribed({ events: ['*'] }, 'anything')); assert.ok(ep.subscribed({ events: ['order.paid'] }, 'order.paid')); assert.ok(!ep.subscribed({ events: ['order.paid'] }, 'order.refunded')); });
  await t('fanout delivers to subscribed endpoints (dry-run)', async () => { const r = await ep.fanout(A, 'order.paid', { id: 1 }); assert.strictEqual(r.delivered, 1); });
  await t('fanout skips non-subscribed event', async () => { const r = await ep.fanout(A, 'unrelated.event', {}); assert.strictEqual(r.delivered, 0); });
  await t('update deactivate stops fanout', async () => { await ep.update(A, id, { active: false }); const r = await ep.fanout(A, 'order.paid', {}); assert.strictEqual(r.delivered, 0); });
  await t('tenant isolation: B has no endpoints', async () => { const list = await ep.list(B); assert.strictEqual(list.length, 0); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
