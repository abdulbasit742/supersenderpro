// tests/smoke/dailyBriefingSmoke.js
// Offline smoke test for the daily briefing. No model -> templated digest is
// used. Seeds a couple of suite stores so the KPI gather is exercised. Exit 0.
//
// Run: node tests/smoke/dailyBriefingSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> fallback digest

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const briefing = require('../../lib/ownerBriefing/dailyBriefing');
const { gather, templateDigest } = briefing._internal;

function seed(rel, data) {
  const p = path.join(__dirname, '..', '..', 'data', rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
  return p;
}

(async () => {
  let passed = 0;
  const STORE = 'briefing_smoke';
  const now = Date.now();

  // seed lead intel: 2 hot, 1 at-risk, with next actions
  seed(`lead_intel/${STORE}_scores.json`, {
    '+1': { band: 'hot', score: 88, atRisk: false, nextBestAction: 'Send pricing + close' },
    '+2': { band: 'hot', score: 75, atRisk: false, nextBestAction: 'Share demo video' },
    '+3': { band: 'warm', score: 50, atRisk: false, nextBestAction: 'Follow up tomorrow' },
    '+4': { band: 'cold', score: 20, atRisk: true }
  });
  // seed orders: 1 confirmed, 1 draft (recent)
  seed(`orders_draft/${STORE}_drafts.json`, {
    '+1': { status: 'confirmed', confirmedAt: now, ts: now },
    '+2': { status: 'draft', ts: now }
  });
  // seed voice + media jobs
  seed('voice_notes/_jobs.json', [{ storeId: STORE, ts: now }, { storeId: STORE, ts: now }]);
  seed('generated_media/_jobs.json', [{ storeId: STORE, ts: now }]);
  // seed faq candidates: 2 pending
  seed(`faq_trainer/${STORE}_candidates.json`, [{ status: 'pending' }, { status: 'pending' }, { status: 'approved' }]);
  // seed conversations: 1 escalated recently
  seed(`support_agent/${STORE}_conversations.json`, {
    '+9': { escalatedAt: now, history: [{ role: 'user', content: 'help', ts: now }] }
  });

  // gather KPIs
  const k = gather(STORE, { sinceMs: now - 24 * 3600 * 1000 });
  assert.strictEqual(k.hotLeads, 2); passed++;
  assert.strictEqual(k.atRisk, 1); passed++;
  assert.strictEqual(k.ordersConfirmed, 1); passed++;
  assert.strictEqual(k.ordersDraft, 1); passed++;
  assert.strictEqual(k.voiceNotes, 2); passed++;
  assert.strictEqual(k.mediaGenerated, 1); passed++;
  assert.strictEqual(k.faqPending, 2); passed++;
  assert.strictEqual(k.escalations, 1); passed++;
  assert.strictEqual(k.topActions.length, 3); passed++;

  // templated digest contains the headline numbers
  const d = templateDigest(k, 'Tue 30 Jun');
  assert.ok(/Hot leads: 2/.test(d)); passed++;
  assert.ok(/Daily Briefing/.test(d)); passed++;

  // generate end-to-end (fallback, no model) -> source fallback, text present
  const rec = await briefing.generate({ storeId: STORE });
  assert.strictEqual(rec.source, 'fallback'); passed++;
  assert.ok(rec.text && rec.text.length); passed++;
  assert.strictEqual(rec.kpis.hotLeads, 2); passed++;

  // latest returns what we just saved
  const last = briefing.latest({ storeId: STORE });
  assert.ok(last && last.date === rec.date); passed++;

  console.log(`\u2705 dailyBriefing smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c dailyBriefing smoke failed:', e); process.exit(1); });
