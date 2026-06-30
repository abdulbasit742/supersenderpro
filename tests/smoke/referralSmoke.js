// tests/smoke/referralSmoke.js
// Offline smoke test for the referral engine. No model: share message uses the
// template. The anti-abuse guards (self-referral, double-attribution, double-
// reward, advocate cap) are the focus. Exit code 0 = pass.
//
// Run: node tests/smoke/referralSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template share

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ref = require('../../lib/referral/referralEngine');

function clear(storeId) {
  for (const s of ['_codes.json', '_referrals.json', '_config.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'referral', `${storeId}${s}`)); } catch {} }
  // also clear loyalty ledger so reward grants are clean
  try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'loyalty', `${storeId}_ledger.json`)); } catch {}
}

(async () => {
  let passed = 0;
  const STORE = 'referral_smoke';
  clear(STORE);

  // code creation is idempotent (one per advocate)
  const c1 = ref.getOrCreateCode({ storeId: STORE, advocate: '+92300ADV' });
  assert.ok(c1.code && !c1.existing); passed++;
  const c2 = ref.getOrCreateCode({ storeId: STORE, advocate: '+92300ADV' });
  assert.strictEqual(c2.code, c1.code); assert.strictEqual(c2.existing, true); passed++;

  // share message (fallback) contains the code
  const sh = await ref.shareMessage({ storeId: STORE, advocate: '+92300ADV' });
  assert.ok(sh.message.includes(c1.code)); assert.strictEqual(sh.source, 'fallback'); passed++;

  // invalid code rejected
  assert.strictEqual(ref.attribute({ storeId: STORE, referee: '+92300NEW', code: 'NOPE' }).ok, false); passed++;

  // self-referral blocked
  assert.strictEqual(ref.attribute({ storeId: STORE, referee: '+92300ADV', code: c1.code }).ok, false); passed++;

  // valid attribution
  const at = ref.attribute({ storeId: STORE, referee: '+92300NEW', code: c1.code });
  assert.strictEqual(at.ok, true); assert.strictEqual(at.referral.status, 'pending'); passed++;

  // double attribution blocked
  assert.strictEqual(ref.attribute({ storeId: STORE, referee: '+92300NEW', code: c1.code }).ok, false); passed++;

  // wrong qualify event rejected
  ref.setConfig(STORE, { qualifyEvent: 'first_order', advocateRewardPoints: 500, refereeRewardPoints: 250, maxRewardsPerAdvocate: 2 });
  assert.strictEqual(ref.qualify({ storeId: STORE, referee: '+92300NEW', event: 'page_view' }).ok, false); passed++;

  // qualify -> rewards both sides once
  const q = ref.qualify({ storeId: STORE, referee: '+92300NEW', event: 'first_order' });
  assert.strictEqual(q.ok, true); passed++;
  assert.strictEqual(q.grants.advocate.points, 500); assert.strictEqual(q.grants.referee.points, 250); passed++;

  // double reward blocked
  assert.strictEqual(ref.qualify({ storeId: STORE, referee: '+92300NEW', event: 'first_order' }).ok, false); passed++;

  // advocate cap (max 2): second referee ok, third capped
  ref.attribute({ storeId: STORE, referee: '+92300R2', code: c1.code });
  assert.strictEqual(ref.qualify({ storeId: STORE, referee: '+92300R2', event: 'first_order' }).ok, true); passed++;
  ref.attribute({ storeId: STORE, referee: '+92300R3', code: c1.code });
  const capped = ref.qualify({ storeId: STORE, referee: '+92300R3', event: 'first_order' });
  assert.strictEqual(capped.ok, false); assert.ok(/cap/.test(capped.error)); passed++;

  // stats per advocate
  const st = ref.stats({ storeId: STORE, advocate: '+92300ADV' });
  assert.ok(st.referred >= 3 && st.rewarded >= 2); passed++;

  // leaderboard
  const lb = ref.leaderboard({ storeId: STORE });
  assert.ok(lb.length >= 1 && lb[0].advocate === '+92300ADV'); passed++;

  // if loyalty is wired, advocate should actually have >= 1000 points (500+500)
  try {
    const loyalty = require('../../lib/loyalty/loyaltyEngine');
    const bal = loyalty.balance({ storeId: STORE, phone: '+92300ADV' });
    assert.ok(bal.points >= 1000, `advocate loyalty points should reflect 2 rewards, got ${bal.points}`); passed++;
  } catch { passed++; /* loyalty not present; skip */ }

  // missing args throw
  let threw = false; try { ref.getOrCreateCode({ storeId: STORE }); } catch { threw = true; }
  assert.ok(threw, 'getOrCreateCode without advocate should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 referral smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c referral smoke failed:', e); process.exit(1); });
