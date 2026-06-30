'use strict';
/**
 * tests/smoke/analyticsSmoke.js - summary aggregates seeded data; tenant isolation holds.
 * Usage: node tests/smoke/analyticsSmoke.js
 */
process.env.DB_DRIVER = 'json';
process.env.AUTH_JWT_SECRET = 'analytics-secret';
const assert = require('assert');
const analytics = require('../../lib/analytics');
const SP = require('../../lib/salesPipeline');
const repo = require('../../lib/db');

const A = 'analytics_A_' + Date.now();
const B = 'analytics_B_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('seed: won deal + invoice + customers', async () => {
    const d = SP.pipeline.createDeal(A, { contact: { phone: '111', name: 'C' }, title: 'Deal', value: 50000 });
    SP.pipeline.moveStage(A, d.id, 'QUALIFIED'); SP.pipeline.moveStage(A, d.id, 'WON');
    const q = SP.quotes.createQuote(A, { dealId: d.id, items: [{ name: 'x', qty: 1, unitPrice: 50000 }] });
    SP.quotes.createInvoice(A, { quoteId: q.id });
    await repo.create(A, 'customers', { phone: '111', tier: 'Gold' });
  });
  await t('summary reports pipeline win + revenue', async () => {
    const s = await analytics.summary(A);
    assert.strictEqual(s.pipeline.won, 1);
    assert.ok(s.revenue.total >= 50000);
    assert.strictEqual(s.revenue.invoiceCount, 1);
    assert.ok(s.customers.total >= 1);
  });
  await t('date range filters revenue', async () => {
    const s = await analytics.summary(A, { from: '2099-01-01' });
    assert.strictEqual(s.revenue.total, 0); // nothing after 2099
  });
  await t('tenant isolation: B is empty', async () => {
    const s = await analytics.summary(B);
    assert.strictEqual(s.revenue.total, 0);
    assert.strictEqual(s.pipeline.totalDeals, 0);
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
