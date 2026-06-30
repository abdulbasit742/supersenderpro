'use strict';
/**
 * tests/smoke/webhookRetrySmoke.js - failed deliveries get retried + exhausted after max.
 * Seeds failed delivery rows directly, then runs the retry job. Usage: node tests/smoke/webhookRetrySmoke.js
 */
process.env.DB_DRIVER = 'json';
process.env.WEBHOOK_RETRY_MAX = '2';
const assert = require('assert');
const repo = require('../../lib/db');
const retryJob = require('../../lib/webhooks/retryJob');

const T = 'whretry_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('seed a failed delivery', async () => {
    await repo.create(T, 'webhook_deliveries', { url: 'https://dead.example.com/hook', host: 'dead.example.com', event: 'order.paid', status: 'failed', payload: { event: 'order.paid' }, retryCount: 0, at: new Date().toISOString() });
    const rows = await repo.list(T, 'webhook_deliveries', {});
    assert.ok(rows.length === 1);
  });
  await t('retry job increments retryCount', async () => {
    const r = await retryJob.retryTenant(T);
    assert.ok(r.retried >= 1);
    const rows = await repo.list(T, 'webhook_deliveries', {});
    const original = rows.find((x) => x.url.includes('dead.example.com'));
    assert.ok(Number(original.retryCount) >= 1);
  });
  await t('after max attempts marked exhausted', async () => {
    // bump to max then run again
    const rows = await repo.list(T, 'webhook_deliveries', {});
    const original = rows.find((x) => x.url.includes('dead.example.com'));
    await repo.update(T, 'webhook_deliveries', original.id, { retryCount: 2, status: 'failed' });
    await retryJob.retryTenant(T);
    const after = (await repo.list(T, 'webhook_deliveries', {})).find((x) => x.url.includes('dead.example.com'));
    assert.strictEqual(after.status, 'exhausted');
  });
  await t('runAll returns per-tenant summaries', async () => {
    const res = await retryJob.runAll();
    assert.ok(Array.isArray(res));
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
