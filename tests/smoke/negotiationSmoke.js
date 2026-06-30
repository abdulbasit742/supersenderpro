// tests/smoke/negotiationSmoke.js
// Offline smoke test for the negotiation engine. No model: replies use the
// template fallback. The critical invariant — NEVER counter/accept below the
// floor — is fuzz-tested across many random offers. Exit code 0 = pass.
//
// Run: node tests/smoke/negotiationSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template replies

const assert = require('assert');
const neg = require('../../lib/negotiation/negotiator');
const { decide } = neg._internal;

(async () => {
  let passed = 0;
  const STORE = 'neg_smoke';

  // set a policy: Pro Plan list 5000, floor 4000 (max 20% off), 3 rounds
  neg.setPolicy(STORE, { defaults: { maxDiscountPct: 10, maxRounds: 3, acceptWithinPct: 2 }, products: { 'pro plan': { listPrice: 5000, floor: 4000, maxRounds: 3 } } });
  const pol = neg.getPolicy(STORE);
  assert.ok(pol.products['pro plan'].floor === 4000); passed++;

  // limitsFor derives floor from discount when not explicit
  const lim = neg.limitsFor(pol, 'unknown item', 1000); // uses defaults: 10% -> floor 900
  assert.strictEqual(lim.floor, 900); passed++;

  // decide: offer above floor -> accept at the offer (capped at list)
  const a = decide({ listPrice: 5000, floor: 4000, customerOffer: 4500, round: 1, maxRounds: 3, acceptWithinPct: 2 });
  assert.strictEqual(a.decision, 'accept'); assert.strictEqual(a.price, 4500); passed++;

  // decide: lowball -> counter, never below floor
  const c = decide({ listPrice: 5000, floor: 4000, customerOffer: 3000, round: 1, maxRounds: 3, acceptWithinPct: 2 });
  assert.strictEqual(c.decision, 'counter'); assert.ok(c.price >= 4000 && c.price <= 5000); passed++;

  // decide: out of rounds -> hold at floor exactly
  const h = decide({ listPrice: 5000, floor: 4000, customerOffer: 3500, round: 3, maxRounds: 3, acceptWithinPct: 2 });
  assert.strictEqual(h.decision, 'hold_at_floor'); assert.strictEqual(h.price, 4000); passed++;

  // FUZZ: across many random offers/rounds, price must NEVER drop below floor
  let fuzzOk = true;
  for (let i = 0; i < 5000; i++) {
    const list = 1000 + Math.floor(Math.random() * 9000);
    const floor = Math.floor(list * (0.5 + Math.random() * 0.4)); // 50-90% of list
    const offer = Math.floor(Math.random() * (list * 1.2));
    const maxRounds = 1 + Math.floor(Math.random() * 5);
    const round = 1 + Math.floor(Math.random() * (maxRounds + 2));
    const d = decide({ listPrice: list, floor, customerOffer: offer, round, maxRounds, acceptWithinPct: 2 });
    if (d.price != null && d.price < floor) { fuzzOk = false; break; }
    if (d.decision === 'accept' && offer < floor) { fuzzOk = false; break; } // must never accept below floor
  }
  assert.ok(fuzzOk, 'floor invariant must hold across all fuzzed scenarios'); passed++;

  // end-to-end handleOffer: lowball -> counter (>= floor), state advances
  const r1 = await neg.handleOffer({ storeId: STORE, phone: '+92300', product: 'Pro Plan', customerOffer: 3000 });
  assert.strictEqual(r1.decision, 'counter'); assert.ok(r1.price >= 4000); passed++;
  assert.ok(r1.reply && r1.reply.length); passed++;
  assert.strictEqual(r1.round, 1); passed++;

  // accept path: offer at floor -> accept, state locks
  const r2 = await neg.handleOffer({ storeId: STORE, phone: '+92301', product: 'Pro Plan', customerOffer: 4200 });
  assert.strictEqual(r2.decision, 'accept'); assert.strictEqual(r2.price, 4200); passed++;
  const stt = neg.getState({ storeId: STORE, phone: '+92301', product: 'Pro Plan' });
  assert.strictEqual(stt.status, 'accepted'); passed++;
  // re-offer after accept -> stays accepted (no reopening below floor)
  const r3 = await neg.handleOffer({ storeId: STORE, phone: '+92301', product: 'Pro Plan', customerOffer: 100 });
  assert.strictEqual(r3.decision, 'accept'); assert.ok(r3.price >= 4000); passed++;

  // rounds cap: keep lowballing same contact -> eventually hold_at_floor, never below
  let last;
  for (let i = 0; i < 5; i++) last = await neg.handleOffer({ storeId: STORE, phone: '+92302', product: 'Pro Plan', customerOffer: 1000 });
  assert.ok(['hold_at_floor', 'counter'].includes(last.decision)); assert.ok(last.price >= 4000); passed++;

  // missing args throw
  let threw = false; try { await neg.handleOffer({ storeId: STORE, phone: '+9' }); } catch { threw = true; }
  assert.ok(threw, 'handleOffer without product should throw'); passed++;

  console.log(`\u2705 negotiation smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c negotiation smoke failed:', e); process.exit(1); });
