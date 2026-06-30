// tests/smoke/fraudRiskSmoke.js
// Offline smoke test for the fraud/COD-risk scorer. No model: verification
// messages use templates; scoring + action thresholds + learning are exercised
// directly. Exit code 0 = pass.
//
// Run: node tests/smoke/fraudRiskSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template verify

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const fraud = require('../../lib/fraudRisk/fraudRisk');
const { scoreOrder, looksOddNumber, addressComplete, DEFAULT_CONFIG } = fraud._internal;

function clear(storeId) {
  for (const s of ['_history.json', '_config.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'fraud_risk', `${storeId}${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'fraud_smoke';
  clear(STORE);
  const cfg = DEFAULT_CONFIG;

  // helpers
  assert.ok(looksOddNumber('111111111')); passed++;
  assert.ok(looksOddNumber('123')); passed++;
  assert.ok(!looksOddNumber('+923001234999')); passed++;
  assert.ok(addressComplete('House 12, Street 4, Gulberg Lahore')); passed++;
  assert.ok(!addressComplete('lahore')); passed++;

  // new COD customer, incomplete address, high value -> elevated/high risk
  const risky = scoreOrder({ phone: '+923001112223', value: 15000, address: 'lhr', paymentMethod: 'cod' }, { config: cfg, hist: { orders: 0, delivered: 0, returned: 0, cancelled: 0, recentTs: [] }, lead: null });
  assert.ok(risky.score >= cfg.verifyAbove, `expected risky, got ${risky.score}`); passed++;
  assert.ok(['verify', 'require_advance', 'hold'].includes(risky.action)); passed++;
  assert.ok(risky.reasons.length >= 3); passed++;

  // trusted repeat customer, prepaid, complete address -> low risk, approve
  const safe = scoreOrder({ phone: '+923009998887', value: 2000, address: 'House 9, Block B, DHA Karachi', paymentMethod: 'advance' }, { config: cfg, hist: { orders: 5, delivered: 5, returned: 0, cancelled: 0, recentTs: [] }, lead: null });
  assert.ok(safe.score < cfg.verifyAbove, `expected low, got ${safe.score}`); passed++;
  assert.strictEqual(safe.action, 'approve'); passed++;

  // prior RTO raises risk
  const rto = scoreOrder({ phone: '+923005554443', value: 3000, address: 'House 5, Street 2, Model Town', paymentMethod: 'cod' }, { config: cfg, hist: { orders: 3, delivered: 1, returned: 2, cancelled: 0, recentTs: [] }, lead: null });
  assert.ok(rto.score > safe.score); passed++;
  assert.ok(rto.reasons.some(r => /return/i.test(r))); passed++;

  // velocity/burst flag
  const now = Date.now();
  const burst = scoreOrder({ phone: '+923002223334', value: 1000, address: 'House 1, Street 1, Johar Town', paymentMethod: 'cod', ts: now }, { config: cfg, hist: { orders: 1, delivered: 1, returned: 0, cancelled: 0, recentTs: [now - 60000, now - 120000] }, lead: null });
  assert.ok(burst.reasons.some(r => /velocity/i.test(r))); passed++;

  // end-to-end assess + learning loop
  const a1 = await fraud.assess({ storeId: STORE, order: { phone: '+92300NEW', value: 12000, address: 'x', paymentMethod: 'cod' } });
  assert.ok(a1.score > 0 && a1.message && a1.message.length); passed++;
  // record two deliveries -> next assessment for same phone should score lower
  fraud.recordOutcome({ storeId: STORE, phone: '+92300NEW', outcome: 'delivered' });
  fraud.recordOutcome({ storeId: STORE, phone: '+92300NEW', outcome: 'delivered' });
  const a2 = await fraud.assess({ storeId: STORE, order: { phone: '+92300NEW', value: 2000, address: 'House 3, Street 5, Gulshan', paymentMethod: 'advance' } });
  assert.ok(a2.score < a1.score, 'trusted history + prepaid should lower risk'); passed++;

  // recordOutcome RTO bumps stats
  fraud.recordOutcome({ storeId: STORE, phone: '+92300RTO', outcome: 'returned' });
  const st = fraud.stats({ storeId: STORE });
  assert.ok(st.orders >= 3 && st.returned >= 1 && st.rtoRate !== null); passed++;

  // missing args throw
  let threw = false; try { await fraud.assess({ storeId: STORE, order: {} }); } catch { threw = true; }
  assert.ok(threw, 'assess without phone should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 fraudRisk smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c fraudRisk smoke failed:', e); process.exit(1); });
