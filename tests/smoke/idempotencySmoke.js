'use strict';
/**
 * tests/smoke/idempotencySmoke.js - begin/complete replay + concurrent-dup behavior (memory cache).
 * Usage: node tests/smoke/idempotencySmoke.js
 */
const assert = require('assert');
const store = require('../../lib/idempotency');

const T = 'idem_tenant_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  const key = 'key_' + Date.now();
  await t('first begin is new', async () => { const r = await store.begin(T, key); assert.strictEqual(r.state, 'new'); });
  await t('second begin (before complete) is pending', async () => { const r = await store.begin(T, key); assert.strictEqual(r.state, 'pending'); });
  await t('after complete, begin replays stored response', async () => { await store.complete(T, key, { status: 200, body: { ok: true, id: 'order_1' } }); const r = await store.begin(T, key); assert.strictEqual(r.state, 'done'); assert.deepStrictEqual(r.response.body, { ok: true, id: 'order_1' }); });
  await t('different tenant + same key is independent', async () => { const r = await store.begin('other_' + T, key); assert.strictEqual(r.state, 'new'); });
  await t('empty key is skipped', async () => { const r = await store.begin(T, ''); assert.strictEqual(r.state, 'skip'); });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
