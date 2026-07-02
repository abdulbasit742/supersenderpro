// tests/smoke/cartRecoverySmoke.js
// Offline smoke test for cart recovery. No model: messages use the template
// fallback. Seeds an order-extraction draft store so detection runs end-to-end.
// Exit code 0 = pass.
//
// Run: node tests/smoke/cartRecoverySmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template fallback

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const cart = require('../../lib/cartRecovery/cartRecovery');
const { cartLabel, cartTotal, templateMessage } = cart._internal;

function seedDrafts(storeId, drafts) {
  const p = path.join(__dirname, '..', '..', 'data', 'orders_draft', `${storeId}_drafts.json`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(drafts, null, 2));
}

(async () => {
  let passed = 0;
  const STORE = 'cart_smoke';
  const order = { items: [{ name: 'red shirt', qty: 2, unitPrice: 1000 }, { name: 'cap', qty: 1, unitPrice: 500 }] };

  // helpers
  assert.ok(/2x red shirt/.test(cartLabel(order))); passed++;
  assert.strictEqual(cartTotal(order), 2500); passed++;
  assert.ok(/CONFIRM/.test(templateMessage({ order, step: 0, incentive: '' }))); passed++;
  assert.ok(/STOP/.test(templateMessage({ order, step: 2, incentive: '5% off' })), 'final step should have opt-out'); passed++;

  // seed: one stalled draft (3h old), one fresh draft (now), one confirmed
  const now = Date.now();
  seedDrafts(STORE, {
    '+92300stalled': { id: 'd1', status: 'draft', order, total: 2500, ts: now - 3 * 3600 * 1000 },
    '+92300fresh':   { id: 'd2', status: 'draft', order, total: 2500, ts: now },
    '+92300done':    { id: 'd3', status: 'confirmed', order, total: 2500, ts: now - 5 * 3600 * 1000, confirmedAt: now }
  });

  // detect: only the stalled one (>2h) qualifies
  const stalled = cart.detectStalled({ storeId: STORE, stallHours: 2 });
  assert.strictEqual(stalled.length, 1, `expected 1 stalled, got ${stalled.length}`); passed++;
  assert.strictEqual(stalled[0].phone, '+92300stalled'); passed++;

  // draft message (fallback)
  const dm = await cart.draftMessage({ order, step: 0 });
  assert.strictEqual(dm.source, 'fallback'); passed++;
  assert.ok(dm.text.length); passed++;

  // scan builds a cadence for the stalled cart
  const scan = await cart.scan({ storeId: STORE, stallHours: 2 });
  assert.strictEqual(scan.started, 1); passed++;
  const active = cart.listActive({ storeId: STORE });
  assert.strictEqual(active.length, 1); passed++;
  assert.strictEqual(active[0].steps.length, 3, 'default cadence is 3 steps'); passed++;
  assert.ok(active[0].steps[2].incentive, 'final step should carry an incentive'); passed++;

  // scan again should NOT double-start (already active)
  const scan2 = await cart.scan({ storeId: STORE, stallHours: 2 });
  assert.strictEqual(scan2.started, 0, 'should not re-start an active cadence'); passed++;

  // mark a step sent, then recovered
  cart.markStepSent({ storeId: STORE, phone: '+92300stalled', step: 0 });
  const rec = cart.markRecovered({ storeId: STORE, phone: '+92300stalled' });
  assert.strictEqual(rec.ok, true); passed++;
  // recovered carts are excluded from future detection
  const stalled2 = cart.detectStalled({ storeId: STORE, stallHours: 2 });
  assert.strictEqual(stalled2.length, 0, 'recovered cart should be excluded'); passed++;

  console.log(`\u2705 cartRecovery smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c cartRecovery smoke failed:', e); process.exit(1); });
