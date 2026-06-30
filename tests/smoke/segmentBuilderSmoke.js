// tests/smoke/segmentBuilderSmoke.js
// Offline smoke test for the segment builder. No model: build() uses the
// deterministic keyword parser. Seeds a lead-intel store so resolve() runs
// end-to-end. Exit code 0 = pass.
//
// Run: node tests/smoke/segmentBuilderSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> keyword parser

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const seg = require('../../lib/segments/segmentBuilder');
const { parseKeyword, sanitizeFilter, matches } = seg._internal;

function seedLeads(storeId, leads) {
  const p = path.join(__dirname, '..', '..', 'data', 'lead_intel', `${storeId}_scores.json`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(leads, null, 2));
}

(async () => {
  let passed = 0;
  const STORE = 'segment_smoke';

  // keyword parser extracts bands, city, score, days, flags
  const f = parseKeyword('hot leads who never bought in Lahore, score above 60, quiet for 30 days');
  assert.deepStrictEqual(f.bands, ['hot']); passed++;
  assert.strictEqual(f.city, 'lahore'); passed++;
  assert.strictEqual(f.neverPurchased, true); passed++;
  assert.strictEqual(f.scoreMin, 60); passed++;
  assert.strictEqual(f.daysSinceMin, 30); passed++;

  // at-risk detection
  assert.strictEqual(parseKeyword('at-risk customers').atRisk, true); passed++;

  // sanitize rejects unknown fields + clamps score
  const san = sanitizeFilter({ bands: ['hot', 'bogus'], scoreMin: 250, evil: 'DROP TABLE' });
  assert.deepStrictEqual(san.bands, ['hot']); passed++;
  assert.strictEqual(san.scoreMin, 100); passed++;
  assert.ok(!('evil' in san), 'unknown fields must be dropped'); passed++;

  // matches() logic
  assert.ok(matches({ band: 'hot', score: 80, signals: {} }, { bands: ['hot'], scoreMin: 70 })); passed++;
  assert.ok(!matches({ band: 'cold', score: 80, signals: {} }, { bands: ['hot'] })); passed++;

  // seed leads + resolve end-to-end
  seedLeads(STORE, {
    '+1': { band: 'hot', score: 85, atRisk: false, city: 'lahore', signals: { daysSinceLastContact: 40, hasOrderIntent: false } },
    '+2': { band: 'hot', score: 90, atRisk: false, city: 'karachi', signals: { daysSinceLastContact: 5, hasOrderIntent: true } },
    '+3': { band: 'warm', score: 55, atRisk: true, city: 'lahore', signals: { daysSinceLastContact: 50 } }
  });

  const built = await seg.buildAndResolve({ storeId: STORE, text: 'hot leads in Lahore' });
  assert.strictEqual(built.method, 'keyword'); passed++;
  assert.strictEqual(built.count, 1, `expected 1 (hot+lahore), got ${built.count}`); passed++;
  assert.strictEqual(built.contacts[0].phone, '+1'); passed++;

  // resolve by explicit filter
  const r = seg.resolve({ storeId: STORE, filter: { atRisk: true } });
  assert.strictEqual(r.count, 1); passed++;
  assert.strictEqual(r.contacts[0].phone, '+3'); passed++;

  // save + list + delete
  seg.saveSegment({ storeId: STORE, name: 'lahore-hot', filter: { bands: ['hot'], city: 'lahore' }, text: 'hot leads in lahore' });
  assert.ok(seg.listSegments({ storeId: STORE }).some(s => s.name === 'lahore-hot')); passed++;
  assert.strictEqual(seg.deleteSegment({ storeId: STORE, name: 'lahore-hot' }).deleted, true); passed++;

  // empty text throws
  let threw = false; try { await seg.build({ text: '' }); } catch { threw = true; }
  assert.ok(threw, 'build with no text should throw'); passed++;

  console.log(`\u2705 segmentBuilder smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c segmentBuilder smoke failed:', e); process.exit(1); });
