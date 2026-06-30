// tests/smoke/sendTimeSmoke.js
// Offline smoke test for the send-time optimizer. No model needed; deterministic
// stats core is exercised directly. Exit code 0 = pass.
//
// Run: node tests/smoke/sendTimeSmoke.js

process.env.SEND_TIME_TZ = 'Asia/Karachi';

const assert = require('assert');
const st = require('../../lib/sendTime/sendTimeOptimizer');
const { argmax } = st._internal;

// build a timestamp that is a given local hour (PKT, UTC+5) today
function tsAtPktHour(hour) {
  const utcHour = (hour - 5 + 24) % 24;
  const d = new Date(); d.setUTCHours(utcHour, 0, 0, 0); return d.getTime();
}

(async () => {
  let passed = 0;
  const STORE = 'sendtime_smoke';
  const PHONE = '+920000000099';

  // argmax helper
  const am = argmax([1, 5, 2, 9, 3]);
  assert.strictEqual(am.index, 3); passed++;

  // insufficient history -> default with low confidence
  const early = st.bestTimeForContact({ storeId: STORE, phone: PHONE });
  assert.ok(early.confidence <= 0.3); passed++;
  assert.ok(early.basis.includes('default')); passed++;

  // feed engagement at 20:00 PKT repeatedly -> learns hour 20
  for (let i = 0; i < 6; i++) st.logEngagement({ storeId: STORE, phone: PHONE, ts: tsAtPktHour(20) });
  const learned = st.bestTimeForContact({ storeId: STORE, phone: PHONE });
  assert.strictEqual(learned.hour, 20, `expected 20, got ${learned.hour}`); passed++;
  assert.ok(learned.confidence > 0.3); passed++;
  assert.ok(learned.count >= 6); passed++;

  // nextSlot returns a future ISO at the learned hour
  const slot = st.nextSlot({ storeId: STORE, phone: PHONE });
  assert.ok(new Date(slot.whenISO).getTime() > Date.now()); passed++;
  assert.strictEqual(slot.hour, 20); passed++;

  // bestTime end-to-end (no model -> rationale null, no throw)
  const bt = await st.bestTime({ storeId: STORE, phone: PHONE });
  assert.strictEqual(bt.hour, 20); passed++;
  assert.ok('nextSlotISO' in bt); passed++;

  // scheduleBroadcast spreads across slots respecting maxPerSlot
  const phones = Array.from({ length: 45 }, (_, i) => `+9230000${1000 + i}`);
  const plan = st.scheduleBroadcast({ storeId: STORE, phones, maxPerSlot: 20 });
  assert.strictEqual(plan.count, 45); passed++;
  const buckets = {};
  for (const p of plan.plan) { const k = p.whenISO.slice(0, 13); buckets[k] = (buckets[k] || 0) + 1; }
  assert.ok(Object.values(buckets).every(c => c <= 20), 'no slot should exceed maxPerSlot'); passed++;

  // missing phone throws
  let threw = false; try { st.logEngagement({ storeId: STORE }); } catch { threw = true; }
  assert.ok(threw, 'logEngagement without phone should throw'); passed++;

  console.log(`\u2705 sendTime smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c sendTime smoke failed:', e); process.exit(1); });
