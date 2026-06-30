// tests/smoke/leadQualifySmoke.js
// Offline smoke test for lead qualification. No model: questions are asked
// verbatim. Focus: per-answer scoring, the flow (start->answer->complete), band
// thresholds, and the hot-route flag. Exit code 0 = pass.
//
// Run: node tests/smoke/leadQualifySmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> verbatim questions

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const q = require('../../lib/leadQualify/leadQualify');
const { scoreAnswer, band } = q._internal;

function clear(storeId) {
  for (const s of ['_sessions.json', '_config.json']) { try { fs.unlinkSync(path.join(__dirname, '..', '..', 'data', 'lead_qualify', `${storeId}${s}`)); } catch {} }
}

(async () => {
  let passed = 0;
  const STORE = 'qualify_smoke';
  clear(STORE);

  // per-answer scoring: strong vs weak signals
  assert.ok(scoreAnswer('timeline', 'today, urgent') > scoreAnswer('timeline', 'just exploring')); passed++;
  assert.ok(scoreAnswer('budget', 'around 5000') > scoreAnswer('budget', 'not sure')); passed++;
  assert.ok(scoreAnswer('authority', 'for my business, bulk') > scoreAnswer('authority', 'for myself')); passed++;
  assert.ok(scoreAnswer('need', 'I need 50 units for my shop urgently') > scoreAnswer('need', 'hi')); passed++;

  // band thresholds
  assert.strictEqual(band(80), 'hot'); assert.strictEqual(band(50), 'warm'); assert.strictEqual(band(25), 'cool'); assert.strictEqual(band(5), 'cold'); passed++;

  // full HOT flow: strong answers on all 4 -> hot + route
  const s0 = await q.start({ storeId: STORE, phone: '+92300' });
  assert.strictEqual(s0.step, 0); assert.strictEqual(s0.key, 'need'); passed++;
  await q.answer({ storeId: STORE, phone: '+92300', text: 'I need 50 units for my shop' });
  await q.answer({ storeId: STORE, phone: '+92300', text: 'budget around 80000' });
  await q.answer({ storeId: STORE, phone: '+92300', text: 'today, urgent' });
  const done = await q.answer({ storeId: STORE, phone: '+92300', text: 'for my business, wholesale' });
  assert.strictEqual(done.done, true); passed++;
  assert.ok(done.score >= 70, `expected hot score, got ${done.score}`); passed++;
  assert.strictEqual(done.band, 'hot'); passed++;
  assert.strictEqual(done.hot, true); passed++;
  assert.ok(/connecting you/i.test(done.message)); passed++;

  // full COLD flow: weak answers -> not hot
  await q.start({ storeId: STORE, phone: '+92301' });
  await q.answer({ storeId: STORE, phone: '+92301', text: 'hi' });
  await q.answer({ storeId: STORE, phone: '+92301', text: 'not sure' });
  await q.answer({ storeId: STORE, phone: '+92301', text: 'just exploring' });
  const cold = await q.answer({ storeId: STORE, phone: '+92301', text: 'for myself' });
  assert.strictEqual(cold.done, true); passed++;
  assert.strictEqual(cold.hot, false); passed++;
  assert.ok(cold.score < 70); passed++;

  // session retrievable + answers captured
  const sess = q.getSession({ storeId: STORE, phone: '+92300' });
  assert.ok(sess && sess.answers.need && sess.answers.budget && sess.band === 'hot'); passed++;

  // list sorted by score desc, filter by band
  const hotList = q.listSessions({ storeId: STORE, band: 'hot' });
  assert.ok(hotList.length >= 1 && hotList[0].phone === '+92300'); passed++;

  // answer with no active session fails cleanly
  assert.strictEqual((await q.answer({ storeId: STORE, phone: '+99999', text: 'x' })).ok, false); passed++;

  // missing phone throws
  let threw = false; try { await q.start({ storeId: STORE }); } catch { threw = true; }
  assert.ok(threw, 'start without phone should throw'); passed++;

  clear(STORE);
  console.log(`\u2705 leadQualify smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c leadQualify smoke failed:', e); process.exit(1); });
