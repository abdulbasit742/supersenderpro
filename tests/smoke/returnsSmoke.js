// tests/smoke/returnsSmoke.js
// Offline smoke test for the returns/RMA engine. No model: replies use
// templates. The policy guards (out-of-window deny, non-returnable deny,
// review-reason routing, auto-approve) are the focus. Exit code 0 = pass.
//
// Run: node tests/smoke/returnsSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template replies

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const ret = require('../../lib/returns/returnsEngine');
const { decideEligibility, DEFAULT_POLICY } = ret._internal;

function clear(storeId) {
  for (const s of ['_rma.json', '_policy.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'returns', `${storeId}${s}`)); } catch {} }
  try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'loyalty', `${storeId}_ledger.json`)); } catch {}
}

(async () => {
  let passed = 0;
  const STORE = 'returns_smoke';
  clear(STORE);
  const DAY = 86400000;
  const policy = { ...DEFAULT_POLICY, windowDays: 7, nonReturnable: ['gift card'], restockingFeePct: 10, requirePhotoForDamage: true };

  // out of window -> deny
  const ow = decideEligibility({ policy, product: 'shirt', reason: 'changed_mind', deliveredAt: Date.now() - 10 * DAY });
  assert.strictEqual(ow.decision, 'deny'); assert.ok(/window/.test(ow.reason)); passed++;

  // non-returnable -> deny (even in window, even good reason)
  const nr = decideEligibility({ policy, product: 'Gift Card', reason: 'defective', deliveredAt: Date.now() });
  assert.strictEqual(nr.decision, 'deny'); passed++;

  // ineligible reason -> deny
  const ir = decideEligibility({ policy, product: 'shirt', reason: 'too_lazy', deliveredAt: Date.now() });
  assert.strictEqual(ir.decision, 'deny'); passed++;

  // damage without photo -> review (needs proof)
  const dmgNoPhoto = decideEligibility({ policy, product: 'mug', reason: 'damaged', deliveredAt: Date.now(), hasPhoto: false });
  assert.strictEqual(dmgNoPhoto.decision, 'review'); passed++;
  // damage with photo -> approve
  const dmgPhoto = decideEligibility({ policy, product: 'mug', reason: 'damaged', deliveredAt: Date.now(), hasPhoto: true });
  assert.strictEqual(dmgPhoto.decision, 'approve'); assert.strictEqual(dmgPhoto.refundPct, 100); passed++;

  // change of mind -> review, with restocking fee applied to refundPct
  const com = decideEligibility({ policy, product: 'shirt', reason: 'changed_mind', deliveredAt: Date.now() });
  assert.strictEqual(com.decision, 'review'); assert.strictEqual(com.refundPct, 90); passed++;

  // wrong item -> auto-approve
  const wrong = decideEligibility({ policy, product: 'shirt', reason: 'wrong_item', deliveredAt: Date.now() });
  assert.strictEqual(wrong.decision, 'approve'); passed++;

  // end-to-end: set policy, open an auto-approve return
  ret.setPolicy(STORE, policy);
  const open = await ret.openReturn({ storeId: STORE, orderId: 'O1', phone: '+92300', product: 'shirt', reason: 'wrong_item', deliveredAt: Date.now(), value: 2000 });
  assert.strictEqual(open.decision, 'approve'); assert.strictEqual(open.status, 'approved'); passed++;
  assert.ok(open.reply && open.reply.length && open.rmaId.startsWith('RMA')); passed++;

  // receive -> refund (value 2000 * 100% = 2000)
  assert.strictEqual(ret.markReceived({ storeId: STORE, rmaId: open.rmaId }).ok, true); passed++;
  const ref = ret.refund({ storeId: STORE, rmaId: open.rmaId });
  assert.strictEqual(ref.ok, true); assert.strictEqual(ref.status, 'refunded'); assert.strictEqual(ref.refundValue, 2000); passed++;
  // cannot refund twice
  assert.strictEqual(ret.refund({ storeId: STORE, rmaId: open.rmaId }).ok, false); passed++;

  // a review-status return then human approve
  const open2 = await ret.openReturn({ storeId: STORE, orderId: 'O2', phone: '+92301', product: 'shirt', reason: 'changed_mind', deliveredAt: Date.now(), value: 1000 });
  assert.strictEqual(open2.status, 'review'); passed++;
  const dec = ret.decide({ storeId: STORE, rmaId: open2.rmaId, decision: 'approve', refundPct: 90 });
  assert.strictEqual(dec.ok, true); assert.strictEqual(dec.status, 'approved'); assert.strictEqual(dec.refundPct, 90); passed++;

  // out-of-window open -> denied immediately
  const open3 = await ret.openReturn({ storeId: STORE, phone: '+92302', product: 'shirt', reason: 'changed_mind', deliveredAt: Date.now() - 30 * DAY, value: 500 });
  assert.strictEqual(open3.status, 'denied'); passed++;
  // cannot receive a denied RMA
  assert.strictEqual(ret.markReceived({ storeId: STORE, rmaId: open3.rmaId }).ok, false); passed++;

  // stats
  const st = ret.stats({ storeId: STORE });
  assert.ok(st.total >= 3 && st.refunded >= 1 && st.denied >= 1); passed++;

  // missing args throw
  let threw = false; try { await ret.openReturn({ storeId: STORE, phone: '+9' }); } catch { threw = true; }
  assert.ok(threw, 'openReturn without reason should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 returns smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c returns smoke failed:', e); process.exit(1); });
