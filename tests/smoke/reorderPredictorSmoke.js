'use strict';

/**
 * Offline smoke test for the Reorder Predictor.
 * Forces the model host unreachable so we exercise the deterministic core and
 * the template fallback. Auto-discovered by scripts/ci-smoke.js.
 */

process.env.OLLAMA_HOST = 'http://127.0.0.1:0';
process.env.LLM_HUB_DRY_RUN = 'true';

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');

// isolate data dir so the test never touches real tenant data
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'reorder-smoke-'));
process.chdir(tmp);

const reorder = require(path.join(__dirname, '..', '..', 'lib', 'reorderPredictor'));
const DAY = 24 * 60 * 60 * 1000;

(async () => {
  const T = 'tenantA';

  // tenant isolation: missing tenant throws
  assert.throws(() => reorder.predict(''), /tenantId/, 'missing tenant should throw');

  // seed 3 purchases of a consumable, 30 days apart, 1 unit each
  const base = Date.now() - 90 * DAY;
  reorder.recordPurchase(T, { customerId: 'c1', phone: '923001234567', sku: 'shampoo', name: 'Shampoo 250ml', qty: 1, at: base });
  reorder.recordPurchase(T, { customerId: 'c1', phone: '923001234567', sku: 'shampoo', qty: 1, at: base + 30 * DAY });
  reorder.recordPurchase(T, { customerId: 'c1', phone: '923001234567', sku: 'shampoo', qty: 1, at: base + 60 * DAY });

  // now is 88 days after base => last buy was 28d ago, cadence ~30d => due soon
  const now = base + 88 * DAY;
  const { predictions } = reorder.predict(T, { now, horizonDays: 7 });
  assert.strictEqual(predictions.length, 1, 'one prediction expected');
  const p = predictions[0];
  assert.strictEqual(p.basis, 'history', 'cadence should come from history');
  assert.ok(p.cadenceDays >= 28 && p.cadenceDays <= 32, 'cadence ~30d, got ' + p.cadenceDays);
  assert.ok(p.due === true, 'should be due within 7-day horizon');
  assert.ok(/\*\*\*\*/.test(p.phoneMasked), 'phone must be masked');

  // merchant-hint path: single purchase + expectedDaysPerUnit
  reorder.recordPurchase(T, { customerId: 'c2', phone: '923009999999', sku: 'filter', name: 'Water Filter', qty: 2, expectedDaysPerUnit: 15, at: now - 25 * DAY });
  const r2 = reorder.predict(T, { now, horizonDays: 7 });
  const fp = r2.predictions.find((x) => x.sku === 'filter');
  assert.ok(fp, 'filter prediction exists');
  assert.strictEqual(fp.basis, 'merchant-hint', 'should use merchant hint');
  assert.strictEqual(fp.cadenceDays, 30, '15d/unit * 2 units = 30d');

  // nudges are dry-run, template fallback (model unreachable)
  const { drafts, count } = await reorder.buildNudges(T, { now, horizonDays: 7 });
  assert.ok(count >= 1, 'at least one nudge drafted');
  for (const d of drafts) {
    assert.strictEqual(d.dryRun, true, 'nudges must be dry-run');
    assert.ok(d.message && d.message.length > 8, 'nudge has text');
    assert.ok(/\*\*\*\*/.test(d.phoneMasked), 'draft phone masked');
  }

  console.log('reorderPredictorSmoke: OK (' + count + ' nudge(s) drafted, deterministic)');
})().catch((e) => {
  console.error('reorderPredictorSmoke: FAIL', e);
  process.exit(1);
});
