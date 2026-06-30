// tests/smoke/upsellSmoke.js
// Offline smoke test for the upsell engine. No model: cross-sell line uses the
// template fallback; the co-occurrence recommender is exercised directly by
// recording purchases. Exit code 0 = pass.
//
// Run: node tests/smoke/upsellSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> fallback phrasing

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const upsell = require('../../lib/upsell/upsellEngine');
const { coOccurRecommend, norm } = upsell._internal;

function clearStore(storeId) {
  const p = path.join(__dirname, '..', '..', 'data', 'upsell', `${storeId}_cooccurrence.json`);
  try { fs.unlinkSync(p); } catch {}
}

(async () => {
  let passed = 0;
  const STORE = 'upsell_smoke';
  clearStore(STORE);

  // norm
  assert.strictEqual(norm('  Red   Shirt '), 'red shirt'); passed++;

  // record purchases that establish phone-case co-occurs with phone
  upsell.recordPurchase({ storeId: STORE, items: ['phone', 'phone case', 'screen protector'] });
  upsell.recordPurchase({ storeId: STORE, items: ['phone', 'phone case'] });
  upsell.recordPurchase({ storeId: STORE, items: ['phone', 'charger'] });
  upsell.recordPurchase({ storeId: STORE, items: ['laptop', 'mouse'] });
  passed++;

  // stats reflect learned data
  const st = upsell.stats({ storeId: STORE });
  assert.ok(st.items >= 5 && st.pairs >= 4); passed++;

  // co-occurrence: buying a phone should recommend phone case first
  const recs = coOccurRecommend(STORE, ['phone'], { k: 3 });
  assert.ok(recs.length >= 1); passed++;
  assert.strictEqual(recs[0].name, 'phone case', `expected phone case, got ${recs[0] && recs[0].name}`); passed++;
  // items already in cart are excluded
  assert.ok(!recs.find(r => r.name === 'phone'), 'seed item should be excluded'); passed++;

  // recommend end-to-end (fallback message, no catalog)
  const r = await upsell.recommend({ storeId: STORE, items: ['phone'], k: 2 });
  assert.ok(r.recommendations.length >= 1); passed++;
  assert.ok(r.message && /add/i.test(r.message), 'should produce a cross-sell line'); passed++;
  assert.strictEqual(r.source, 'fallback'); passed++;

  // bundle builds seed + top add-on with a discount line
  const b = await upsell.bundle({ storeId: STORE, items: ['phone'], discountPct: 10 });
  assert.ok(b.bundle && b.bundle.items.includes('phone')); passed++;
  assert.ok(b.bundle.items.length >= 2, 'bundle should add at least one item'); passed++;
  assert.ok(/10%/.test(b.message)); passed++;

  // no-seed throws
  let threw = false; try { await upsell.recommend({ storeId: STORE, items: [] }); } catch { threw = true; }
  assert.ok(threw, 'recommend with no items should throw'); passed++;

  // unknown seed -> no recs, no throw
  const none = await upsell.recommend({ storeId: STORE, items: ['nonexistent-item'], k: 3 });
  assert.strictEqual(none.recommendations.length, 0); passed++;

  clearStore(STORE);
  console.log(`\u2705 upsell smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c upsell smoke failed:', e); process.exit(1); });
