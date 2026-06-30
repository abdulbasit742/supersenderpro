// tests/smoke/loyaltySmoke.js
// Offline smoke test for the loyalty engine. No model: nudges use templates.
// The critical invariant — balance NEVER goes negative — is fuzz-tested across
// random earn/redeem sequences. Exit code 0 = pass.
//
// Run: node tests/smoke/loyaltySmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template nudges

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const loyalty = require('../../lib/loyalty/loyaltyEngine');
const { tierFor, DEFAULT_CONFIG } = loyalty._internal;

function clear(storeId) {
  for (const s of ['_ledger.json', '_config.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'loyalty', `${storeId}${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'loyalty_smoke';
  clear(STORE);

  // tier resolution
  assert.strictEqual(tierFor(0, DEFAULT_CONFIG.tiers).tier.name, 'bronze'); passed++;
  assert.strictEqual(tierFor(1200, DEFAULT_CONFIG.tiers).tier.name, 'silver'); passed++;
  assert.strictEqual(tierFor(20000, DEFAULT_CONFIG.tiers).tier.name, 'platinum'); passed++;
  const t = tierFor(0, DEFAULT_CONFIG.tiers);
  assert.strictEqual(t.next.name, 'silver'); assert.strictEqual(t.toNext, 1000); passed++;

  // earn by spend (bronze x1) -> 2000 points
  const e1 = loyalty.earn({ storeId: STORE, phone: '+92300', spend: 2000 });
  assert.strictEqual(e1.earned, 2000); assert.strictEqual(e1.balance, 2000); passed++;
  // now silver -> next earn uses 1.25x
  const e2 = loyalty.earn({ storeId: STORE, phone: '+92300', spend: 1000 });
  assert.strictEqual(e2.earned, 1250, `expected 1.25x, got ${e2.earned}`); passed++;
  assert.strictEqual(e2.balance, 3250); passed++;

  // balance reports tier + next reward
  const b = loyalty.balance({ storeId: STORE, phone: '+92300' });
  assert.strictEqual(b.tier, 'silver'); passed++;
  assert.ok(b.affordable.length >= 1, 'should afford some reward at 3250 pts'); passed++;

  // redeem a reward by id (r3 = 3000)
  const r = loyalty.redeem({ storeId: STORE, phone: '+92300', rewardId: 'r3' });
  assert.strictEqual(r.ok, true); assert.strictEqual(r.redeemed, 3000); assert.strictEqual(r.balance, 250); passed++;

  // cannot redeem more than balance
  const bad = loyalty.redeem({ storeId: STORE, phone: '+92300', points: 5000 });
  assert.strictEqual(bad.ok, false); assert.strictEqual(bad.balance, 250); passed++;

  // nudge produces a message (fallback)
  const n = await loyalty.nudge({ storeId: STORE, phone: '+92300' });
  assert.ok(n.message && n.message.length); assert.strictEqual(n.source, 'fallback'); passed++;

  // FUZZ: random earn/redeem sequence, balance must never go negative
  clear(STORE);
  let fuzzOk = true;
  for (let i = 0; i < 3000; i++) {
    if (Math.random() < 0.6) loyalty.earn({ storeId: STORE, phone: '+fuzz', points: Math.floor(Math.random() * 500) });
    else loyalty.redeem({ storeId: STORE, phone: '+fuzz', points: Math.floor(Math.random() * 800) });
    const bal = loyalty.balance({ storeId: STORE, phone: '+fuzz' });
    if (bal.points < 0) { fuzzOk = false; break; }
  }
  assert.ok(fuzzOk, 'balance must never go negative across fuzzed earn/redeem'); passed++;

  // leaderboard returns sorted by lifetime points
  loyalty.earn({ storeId: STORE, phone: '+a', points: 100 });
  loyalty.earn({ storeId: STORE, phone: '+b', points: 900 });
  const lb = loyalty.leaderboard({ storeId: STORE });
  assert.ok(lb.length >= 2 && lb[0].lifetimePoints >= lb[1].lifetimePoints); passed++;

  // missing phone throws
  let threw = false; try { loyalty.earn({ storeId: STORE, points: 10 }); } catch { threw = true; }
  assert.ok(threw, 'earn without phone should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 loyalty smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c loyalty smoke failed:', e); process.exit(1); });
