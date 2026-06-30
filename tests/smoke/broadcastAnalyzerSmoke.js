// tests/smoke/broadcastAnalyzerSmoke.js
// Offline smoke test for the broadcast analyzer. No model: verdict uses the
// template fallback; funnel math + grading + issue detection are exercised
// directly. Exit code 0 = pass.
//
// Run: node tests/smoke/broadcastAnalyzerSmoke.js

process.env.OLLAMA_HOST = 'http://127.0.0.1:0'; // unreachable -> fallback verdict

const assert = require('assert');
const ba = require('../../lib/broadcastAnalyzer/broadcastAnalyzer');
const { computeFunnel, grade, detectIssues } = ba._internal;

(async () => {
  let passed = 0;
  const STORE = 'bcast_smoke';

  // funnel math
  const f = computeFunnel({ sent: 1000, delivered: 950, read: 600, replied: 80, converted: 20, optOuts: 10 });
  assert.strictEqual(f.deliveredRate, 0.95); passed++;
  assert.strictEqual(f.readRate, +(600 / 950).toFixed(4)); passed++;
  assert.strictEqual(f.optOutRate, 0.01); passed++;

  // a strong campaign grades high
  const gGood = grade(f);
  assert.ok(gGood.score >= 55, `expected decent grade, got ${gGood.score}`); passed++;

  // a weak campaign grades low + flags issues
  const weak = computeFunnel({ sent: 1000, delivered: 700, read: 150, replied: 2, converted: 0, optOuts: 50 });
  const gWeak = grade(weak);
  assert.ok(gWeak.score < gGood.score); passed++;
  const issues = detectIssues(weak);
  assert.ok(issues.some(i => i.key === 'low_delivery')); passed++;
  assert.ok(issues.some(i => i.key === 'high_optout')); passed++;
  assert.ok(issues.some(i => i.key === 'low_read')); passed++;

  // weak_cta: high read, low reply
  const ctaCase = computeFunnel({ sent: 500, delivered: 500, read: 400, replied: 5, converted: 1, optOuts: 1 });
  assert.ok(detectIssues(ctaCase).some(i => i.key === 'weak_cta')); passed++;

  // analyze end-to-end (fallback verdict) + history
  const r = await ba.analyze({ storeId: STORE, name: 'Eid Sale', metrics: { sent: 1000, delivered: 950, read: 600, replied: 80, converted: 20, optOuts: 10 } });
  assert.ok(r.grade.score >= 0 && r.grade.score <= 100); passed++;
  assert.strictEqual(r.source, 'fallback'); passed++;
  assert.ok(/NEXT:/.test(r.verdict), 'verdict should include a NEXT recommendation'); passed++;

  // record a second campaign, then compare
  await ba.analyze({ storeId: STORE, name: 'Flash Friday', metrics: { sent: 800, delivered: 600, read: 150, replied: 3, converted: 0, optOuts: 40 } });
  const cmp = ba.compare({ storeId: STORE });
  assert.strictEqual(cmp.campaigns, 2); passed++;
  assert.strictEqual(cmp.best.name, 'Eid Sale', 'the stronger campaign should be best'); passed++;
  assert.ok(cmp.avgGrade >= 0); passed++;

  // history returns recent first
  const hist = ba.history({ storeId: STORE });
  assert.ok(hist.length >= 2 && hist[0].name === 'Flash Friday'); passed++;

  // missing metrics throws
  let threw = false; try { await ba.analyze({ storeId: STORE, metrics: {} }); } catch { threw = true; }
  assert.ok(threw, 'analyze with empty metrics should throw'); passed++;

  console.log(`\u2705 broadcastAnalyzer smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c broadcastAnalyzer smoke failed:', e); process.exit(1); });
