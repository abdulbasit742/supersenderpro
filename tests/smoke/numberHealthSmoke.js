// tests/smoke/numberHealthSmoke.js
// Offline smoke test for the number-health monitor. No model: advisory uses the
// template. Warmup cap interpolation, risk scoring, and the can-send gate are
// exercised directly. Exit code 0 = pass.
//
// Run: node tests/smoke/numberHealthSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> template advisory

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const nh = require('../../lib/numberHealth/numberHealth');
const { warmupCap, riskScore, ageDays, DEFAULT_CONFIG } = nh._internal;

function clear(storeId) {
  for (const s of ['', '.cfg']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'number_health', `${storeId}_numbers.json${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'nh_smoke';
  clear(STORE);
  const cfg = DEFAULT_CONFIG;
  const DAY = 86400000;

  // warmup cap interpolation
  assert.strictEqual(warmupCap(0, cfg.warmup), 50); passed++;
  assert.strictEqual(warmupCap(7, cfg.warmup), 250); passed++;
  assert.ok(warmupCap(10, cfg.warmup) > 250 && warmupCap(10, cfg.warmup) < 600); passed++; // interpolated
  assert.strictEqual(warmupCap(120, cfg.warmup), 10000); passed++; // clamps to last

  // register a brand-new number
  const reg = nh.register({ storeId: STORE, number: '+92300NEW' });
  assert.strictEqual(reg.ageDays, 0); passed++;

  // young account, tiny volume -> low-ish risk (but <3 days adds 10)
  let s = await nh.status({ storeId: STORE, number: '+92300NEW' });
  assert.ok(s.dailyCap === 50, `new number cap should be 50, got ${s.dailyCap}`); passed++;
  assert.ok(s.score >= 10); passed++; // <3 days penalty

  // blast past the cap today -> risk jumps, canSend blocks
  nh.event({ storeId: STORE, number: '+92300NEW', type: 'sent', count: 80 });
  s = await nh.status({ storeId: STORE, number: '+92300NEW' });
  assert.ok(s.sentToday === 80); passed++;
  assert.ok(s.score >= 40, `over-cap should spike risk, got ${s.score}`); passed++;
  const cs = nh.canSend({ storeId: STORE, number: '+92300NEW', count: 1 });
  assert.strictEqual(cs.allowed, false, 'over-cap number should not be allowed to send more'); passed++;

  // an older, well-behaved number: set createdAt 90 days ago, healthy rates
  nh.register({ storeId: STORE, number: '+92300OLD', createdAt: Date.now() - 90 * DAY });
  // simulate good activity today within cap
  nh.event({ storeId: STORE, number: '+92300OLD', type: 'sent', count: 500 });
  nh.event({ storeId: STORE, number: '+92300OLD', type: 'delivered', count: 480 });
  nh.event({ storeId: STORE, number: '+92300OLD', type: 'replied', count: 60 });
  const sOld = await nh.status({ storeId: STORE, number: '+92300OLD' });
  assert.ok(sOld.dailyCap >= 5000, 'aged number gets a high cap'); passed++;
  assert.ok(sOld.band === 'low' || sOld.band === 'moderate'); passed++;
  assert.strictEqual(nh.canSend({ storeId: STORE, number: '+92300OLD', count: 100 }).allowed, true); passed++;

  // high block rate spikes risk
  nh.register({ storeId: STORE, number: '+92300BAD', createdAt: Date.now() - 90 * DAY });
  nh.event({ storeId: STORE, number: '+92300BAD', type: 'sent', count: 1000 });
  nh.event({ storeId: STORE, number: '+92300BAD', type: 'blocked', count: 80 }); // 8% block rate
  const sBad = await nh.status({ storeId: STORE, number: '+92300BAD' });
  assert.ok(sBad.reasons.some(r => /block rate/i.test(r))); passed++;
  assert.ok(sBad.score > sOld.score); passed++;

  // advisory present (fallback) + list sorted by risk desc
  assert.ok(sBad.advisory && sBad.advisory.length); passed++;
  const list = nh.listNumbers({ storeId: STORE });
  assert.ok(list.length >= 3 && list[0].risk >= list[list.length - 1].risk); passed++;

  // invalid event type throws
  let threw = false; try { nh.event({ storeId: STORE, number: '+92300OLD', type: 'bogus' }); } catch { threw = true; }
  assert.ok(threw, 'invalid event type should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 numberHealth smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c numberHealth smoke failed:', e); process.exit(1); });
