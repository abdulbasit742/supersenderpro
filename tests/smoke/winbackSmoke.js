// tests/smoke/winbackSmoke.js
// Offline smoke test for win-back. No model: messages use templates. Seeds a
// lead-intel store so dormant detection + segmentation run end-to-end. Exit 0.
//
// Run: node tests/smoke/winbackSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template fallback
process.env.WINBACK_DORMANT_DAYS = '21';
process.env.WINBACK_MAX_ATTEMPTS = '2';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const wb = require('../../lib/winback/winback');
const { segmentOf } = wb._internal;

function seedLeads(storeId, leads) {
  const p = path.join(__dirname, '..', '..', 'data', 'lead_intel', `${storeId}_scores.json`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(leads, null, 2));
}
function clearState(storeId) {
  const p = path.join(__dirname, '..', '..', 'data', 'winback', `${storeId}_state.json`);
  try { fs.unlinkSync(p); } catch {}
}

(async () => {
  let passed = 0;
  const STORE = 'winback_smoke';
  clearState(STORE);

  // segmentation logic
  assert.strictEqual(segmentOf({ atRisk: true, signals: {} }), 'at_risk'); passed++;
  assert.strictEqual(segmentOf({ band: 'dormant', signals: { buyIntentHits: 2 } }), 'price_sensitive'); passed++;
  assert.strictEqual(segmentOf({ signals: { hasOrderIntent: true, buyIntentHits: 0 } }), 'lapsed_buyer'); passed++;
  assert.strictEqual(segmentOf({ signals: { messageCount: 3, hasOrderIntent: false } }), 'never_purchased'); passed++;

  // seed leads: 3 dormant (>=21d), 1 active (recent)
  seedLeads(STORE, {
    '+1': { score: 70, band: 'cold', atRisk: false, signals: { daysSinceLastContact: 40, buyIntentHits: 2 } },     // price_sensitive
    '+2': { score: 50, band: 'warm', atRisk: true,  signals: { daysSinceLastContact: 25 } },                        // at_risk
    '+3': { score: 30, band: 'cold', atRisk: false, signals: { daysSinceLastContact: 60, hasOrderIntent: true, buyIntentHits: 0 } }, // lapsed_buyer
    '+4': { score: 80, band: 'hot',  atRisk: false, signals: { daysSinceLastContact: 2 } }                          // active, excluded
  });

  // findDormant excludes the active one
  const dormant = wb.findDormant({ storeId: STORE, dormantDays: 21 });
  assert.strictEqual(dormant.length, 3, `expected 3 dormant, got ${dormant.length}`); passed++;
  assert.ok(!dormant.find(d => d.phone === '+4'), 'active contact should be excluded'); passed++;

  // segment counts present
  const counts = wb.segmentCounts(dormant);
  assert.ok(counts.at_risk >= 1 && counts.price_sensitive >= 1); passed++;

  // craft message (fallback template)
  const msg = await wb.craftMessage({ segment: 'price_sensitive' });
  assert.strictEqual(msg.source, 'fallback'); passed++;
  assert.ok(msg.text.includes('{{name}}')); passed++;

  // launch builds a plan, one per dormant, attempts incremented
  const launched = await wb.launch({ storeId: STORE, dormantDays: 21 });
  assert.strictEqual(launched.queued, 3); passed++;
  assert.ok(launched.plan.every(p => p.text && p.whenISO && p.attempt === 1)); passed++;

  // second launch increments attempts to 2 (still allowed)
  const launched2 = await wb.launch({ storeId: STORE, dormantDays: 21 });
  assert.strictEqual(launched2.queued, 3); passed++;
  assert.ok(launched2.plan.every(p => p.attempt === 2)); passed++;

  // third launch: all hit MAX_ATTEMPTS=2 -> exhausted, none queued
  const launched3 = await wb.launch({ storeId: STORE, dormantDays: 21 });
  assert.strictEqual(launched3.queued, 0, 'should suppress after max attempts'); passed++;

  // outcome transitions
  assert.strictEqual(wb.markWon({ storeId: STORE, phone: '+1' }).status, 'won'); passed++;
  assert.strictEqual(wb.suppress({ storeId: STORE, phone: '+2' }).status, 'suppressed'); passed++;
  // won/suppressed excluded from future dormant scans
  const dormant2 = wb.findDormant({ storeId: STORE, dormantDays: 21 });
  assert.ok(!dormant2.find(d => d.phone === '+1' || d.phone === '+2'), 'won/suppressed excluded'); passed++;

  clearState(STORE);
  console.log(`\u2705 winback smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c winback smoke failed:', e); process.exit(1); });
