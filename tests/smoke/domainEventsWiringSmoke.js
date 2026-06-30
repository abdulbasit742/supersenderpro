'use strict';
/**
 * tests/smoke/domainEventsWiringSmoke.js - confirms pipeline/quotes actually emit domain events.
 * Subscribes to the bus, performs real actions, asserts the events fire. Usage: node tests/smoke/domainEventsWiringSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const bus = require('../../lib/events/bus');
const SP = require('../../lib/salesPipeline');

const T = 'domevt_' + Date.now();
const seen = [];
bus.on('*', (e) => { seen.push(e.event); });
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  let deal;
  await t('createDeal emits deal.created', async () => { deal = SP.pipeline.createDeal(T, { contact: { phone: '111' }, title: 'D', value: 1000 }); await sleep(20); assert.ok(seen.includes('deal.created')); });
  await t('moveStage to WON emits deal.won', async () => { SP.pipeline.moveStage(T, deal.id, 'QUALIFIED'); SP.pipeline.moveStage(T, deal.id, 'WON'); await sleep(20); assert.ok(seen.includes('deal.won')); });
  await t('createInvoice emits invoice.created', async () => { const q = SP.quotes.createQuote(T, { items: [{ name: 'x', qty: 1, unitPrice: 1000 }] }); SP.quotes.createInvoice(T, { quoteId: q.id }); await sleep(20); assert.ok(seen.includes('invoice.created')); });
  await t('actions still return normally (emit is non-blocking)', async () => { const m = SP.pipeline.metrics(T); assert.strictEqual(m.won, 1); });
  console.log('\n' + passed + ' checks passed. events=' + Array.from(new Set(seen)).join(','));
  process.exit(process.exitCode || 0);
})();
