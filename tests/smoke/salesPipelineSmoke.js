'use strict';
/**
 * tests/smoke/salesPipelineSmoke.js - dependency-free smoke test.
 * Exercises deal lifecycle, follow-up scheduling, cart recovery, quote/invoice.
 * Usage: node tests/smoke/salesPipelineSmoke.js
 */
process.env.SALES_PIPELINE_DRY_RUN = 'true';
const assert = require('assert');
const SP = require('../../lib/salesPipeline');

const TID = 'smoke_' + Date.now();
let passed = 0;
const t = (name, fn) => { try { const r = fn(); if (r && r.then) return r; passed++; console.log('OK', name); } catch (e) { console.error('XX', name, '-', e.message); process.exitCode = 1; } };

(async () => {
  let deal = SP.pipeline.createDeal(TID, { contact: { phone: '923001234567', name: 'Ali Raza' }, title: 'Pro plan', value: 5000 });
  t('create deal (NEW_LEAD)', () => { assert.strictEqual(deal.stage, 'NEW_LEAD'); assert.ok(deal.stageOpen); });
  t('follow-ups scheduled on create', () => { assert.ok(SP.followUps.listForDeal(TID, deal.id).filter((x) => x.status === 'pending').length >= 1); });
  t('move NEW_LEAD -> QUALIFIED -> NEGOTIATION', () => { SP.pipeline.moveStage(TID, deal.id, 'QUALIFIED'); const d = SP.pipeline.moveStage(TID, deal.id, 'NEGOTIATION'); assert.strictEqual(d.stage, 'NEGOTIATION'); });
  t('win deal cancels follow-ups', () => { const d = SP.pipeline.moveStage(TID, deal.id, 'WON'); assert.strictEqual(d.outcome, 'won'); assert.strictEqual(SP.followUps.listForDeal(TID, deal.id).filter((x) => x.status === 'pending').length, 0); });
  t('quote totals', () => { const q = SP.quotes.createQuote(TID, { dealId: deal.id, contact: deal.contact, items: [{ name: 'Pro plan', qty: 2, unitPrice: 1000 }], taxPercent: 10 }); assert.strictEqual(q.subtotal, 2000); assert.strictEqual(q.tax, 200); assert.strictEqual(q.total, 2200); assert.ok(/^QUO-\d+$/.test(q.number)); });
  t('invoice from quote', () => { const q = SP.quotes.list(TID, { type: 'quote' })[0]; const inv = SP.quotes.createInvoice(TID, { quoteId: q.id }); assert.strictEqual(inv.total, q.total); assert.ok(/^INV-\d+$/.test(inv.number)); });
  SP.cartRecovery.trackCart(TID, { contact: { phone: '923009998877', name: 'Sara' }, items: [{ name: 'Widget', qty: 1, unitPrice: 500 }] });
  SP.config.cartRecoveryStepsMin[0] = 0;
  const r = await SP.cartRecovery.processRecovery(TID);
  t('cart recovery prepares in dry-run', () => { assert.strictEqual(r.dryRun, true); assert.ok(r.count >= 1); });
  t('metrics report win', () => { const m = SP.pipeline.metrics(TID); assert.strictEqual(m.won, 1); assert.strictEqual(m.winRate, 100); });
  console.log('\n' + passed + ' checks passed.');
})();
