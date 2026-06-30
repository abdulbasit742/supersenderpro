// tests/smoke/faqTrainerSmoke.js
// Offline smoke test for the FAQ trainer. No model: drafting returns un-drafted
// (answer blank) candidates; clustering + harvest + approve/reject gating are
// exercised directly. Seeds a fake support-agent conversation file. Exit 0 = pass.
//
// Run: node tests/smoke/faqTrainerSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> no AI drafting

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const trainer = require('../../lib/faqTrainer/faqTrainer');
const { cluster, similarity, harvestQuestions } = trainer._internal;

(async () => {
  let passed = 0;
  const STORE = 'faq_smoke';

  // similarity + clustering
  assert.ok(similarity('how long is delivery', 'how long does delivery take') > 0.4); passed++;
  const clusters = cluster([
    'how long is delivery', 'how long does delivery take', 'when will it be delivered',
    'do you accept cod', 'do you accept cash on delivery'
  ], { threshold: 0.4, minSize: 2 });
  assert.ok(clusters.length >= 1, 'should form at least one cluster'); passed++;
  assert.ok(clusters[0].size >= 2); passed++;

  // seed a fake support-agent conversation file to harvest from
  const supportDir = path.join(__dirname, '..', '..', 'data', 'support_agent');
  fs.mkdirSync(supportDir, { recursive: true });
  const convoFile = path.join(supportDir, `${STORE}_conversations.json`);
  const now = Date.now();
  fs.writeFileSync(convoFile, JSON.stringify({
    '+9230011': { escalatedAt: now, history: [
      { role: 'user', content: 'how long does delivery take?', ts: now },
      { role: 'agent', content: '...', ts: now },
      { role: 'user', content: 'when will it be delivered to Lahore?', ts: now }
    ] },
    '+9230022': { history: [ { role: 'user', content: 'how long is delivery time?', ts: now } ] }
  }, null, 2));

  const harvested = harvestQuestions(STORE, { sinceDays: 30 });
  assert.ok(harvested.length >= 3, `expected >=3 questions, got ${harvested.length}`); passed++;

  // mine -> candidates (drafted=false offline, but clustered + queued)
  const mined = await trainer.mine({ storeId: STORE, minClusterSize: 2 });
  assert.ok(mined.mined >= 3); passed++;
  assert.ok(mined.candidates >= 1, 'should produce at least one candidate'); passed++;

  const pending = trainer.listCandidates({ storeId: STORE, status: 'pending' });
  assert.ok(pending.length >= 1); passed++;

  // approve gating: cannot approve without an answer (offline draft has blank a)
  const cand = pending[0];
  const blocked = await trainer.approve({ storeId: STORE, id: cand.id });
  assert.strictEqual(blocked.approved, false, 'approve should be blocked without an answer'); passed++;

  // approve with a supplied answer succeeds
  const ok = await trainer.approve({ storeId: STORE, id: cand.id, q: cand.q || 'Delivery time?', a: 'Usually 2-3 working days.' });
  assert.strictEqual(ok.approved, true); passed++;

  // reject another (if present) works / no-throw
  if (pending[1]) { const r = trainer.reject({ storeId: STORE, id: pending[1].id }); assert.strictEqual(r.rejected, true); passed++; }
  else { passed++; }

  // cleanup seeded convo
  try { fs.unlinkSync(convoFile); } catch {}

  console.log(`\u2705 faqTrainer smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c faqTrainer smoke failed:', e); process.exit(1); });
