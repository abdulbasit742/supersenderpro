// tests/smoke/leadIntelSmoke.js
// Offline smoke test for lead intelligence. No model required: AI enrichment
// returns null when the brain is unconfigured; deterministic scoring is exercised
// directly. Exit code 0 = pass.
//
// Run: node tests/smoke/leadIntelSmoke.js

const assert = require('assert');
const leadIntel = require('../../lib/leadIntel/leadIntel');
const { deriveSignals, scoreSignals } = leadIntel._internal;

(async () => {
  let passed = 0;

  // Hot lead: recent, multiple buy signals, urgency
  const hot = scoreSignals({ messageCount: 4, daysSinceLastContact: 0, buyIntentHits: 2, urgencyHits: 1, negativeHits: 0, escalated: false, hasOrderIntent: true });
  assert.ok(hot.score >= 70, `expected hot, got ${hot.score}`); passed++;
  assert.strictEqual(hot.band, 'hot'); passed++;

  // Cold lead: old, no intent
  const cold = scoreSignals({ messageCount: 1, daysSinceLastContact: 30, buyIntentHits: 0, urgencyHits: 0, negativeHits: 0, escalated: false, hasOrderIntent: false });
  assert.ok(cold.score < 40, `expected cold-ish, got ${cold.score}`); passed++;

  // At-risk: negative signals flag + penalty
  const risk = scoreSignals({ messageCount: 3, daysSinceLastContact: 1, buyIntentHits: 0, urgencyHits: 0, negativeHits: 2, escalated: true, hasOrderIntent: false });
  assert.strictEqual(risk.atRisk, true); passed++;

  // deriveSignals from a thread shape
  const sig = deriveSignals({ history: [
    { role: 'user', content: 'kitne ka hai? I want to order today', ts: Date.now() },
    { role: 'agent', content: 'sure!', ts: Date.now() }
  ], lastIntent: 'order' });
  assert.ok(sig.buyIntentHits >= 1, 'should detect buy intent'); passed++;
  assert.ok(sig.urgencyHits >= 1, 'should detect urgency (today)'); passed++;
  assert.strictEqual(sig.hasOrderIntent, true); passed++;

  // scoreLead end-to-end (no model -> enriched=false, no throw)
  const rec = await leadIntel.scoreLead({ storeId: 'leadintel_smoke', phone: '+920000000001', signals: { messageCount: 3, daysSinceLastContact: 0, buyIntentHits: 2, hasOrderIntent: true } });
  assert.ok(rec.score > 0 && rec.band, 'should produce a score+band'); passed++;
  assert.ok(Array.isArray(rec.reasons) && rec.reasons.length, 'should explain reasons'); passed++;

  // top leads + get
  const top = leadIntel.topLeads({ storeId: 'leadintel_smoke', limit: 5 });
  assert.ok(top.length >= 1); passed++;
  assert.ok(leadIntel.getLead({ storeId: 'leadintel_smoke', phone: '+920000000001' })); passed++;

  // batch over explicit leads
  const batch = await leadIntel.batchScore({ storeId: 'leadintel_smoke', leads: [ { phone: '+921', signals: { messageCount: 5, daysSinceLastContact: 0, buyIntentHits: 3, hasOrderIntent: true } }, { phone: '+922', signals: { messageCount: 1, daysSinceLastContact: 40 } } ], enrichAI: false });
  assert.strictEqual(batch.count, 2); passed++;
  assert.ok(batch.scored[0].score >= batch.scored[1].score, 'batch should be sorted desc'); passed++;

  console.log(`\u2705 leadIntel smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c leadIntel smoke failed:', e); process.exit(1); });
