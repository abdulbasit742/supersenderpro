'use strict';
/**
 * tests/smoke/eventBusSmoke.js - emit reaches local subscribers + webhook + audit + metric.
 * Usage: node tests/smoke/eventBusSmoke.js
 */
process.env.DB_DRIVER = 'json';
const assert = require('assert');
const bus = require('../../lib/events/bus');
const ep = require('../../lib/webhooks/endpoints');
const audit = require('../../lib/audit');
const metrics = require('../../lib/observability/metrics');

const T = 'eventbus_' + Date.now();
let passed = 0;
const t = (n, fn) => fn().then(() => { passed++; console.log('OK', n); }).catch((e) => { console.error('XX', n, '-', e.message); process.exitCode = 1; });

(async () => {
  await t('requires tenantId + event', async () => { let threw = false; try { await bus.emit(null, 'x'); } catch { threw = true; } assert.ok(threw); });
  await t('local subscriber receives event', async () => {
    let got = null; const off = bus.on('deal.won', (e) => { got = e; });
    await bus.emit(T, 'deal.won', { dealId: 'd1' });
    assert.ok(got && got.event === 'deal.won' && got.payload.dealId === 'd1');
    off();
  });
  await t('wildcard subscriber receives all', async () => {
    let count = 0; const off = bus.on('*', () => { count++; });
    await bus.emit(T, 'invoice.created', {});
    assert.ok(count >= 1); off();
  });
  await t('webhook fanout runs (no endpoints = 0 delivered)', async () => {
    const r = await bus.emit(T, 'deal.won', {});
    assert.ok(r.sinks.webhook && typeof r.sinks.webhook.delivered === 'number');
  });
  await t('fanout reaches a registered endpoint', async () => {
    await ep.create(T, { url: 'https://hook.example.com', events: ['deal.won'] });
    const r = await bus.emit(T, 'deal.won', { dealId: 'd2' });
    assert.strictEqual(r.sinks.webhook.delivered, 1);
  });
  await t('audit entry written for the event', async () => {
    const rows = await audit.query(T, { action: 'event.deal.won' });
    assert.ok(rows.length >= 1);
  });
  await t('metric counter bumped', async () => {
    assert.ok(/domain_events_total\{[^}]*event="deal.won"[^}]*\}/.test(metrics.render()));
  });
  console.log('\n' + passed + ' checks passed.');
  process.exit(process.exitCode || 0);
})();
