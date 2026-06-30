// tests/smoke/analyticsCopilotSmoke.js
// Offline smoke test for the analytics copilot. No model: question->metric uses
// keyword matching, answers are templated. A custom metric is registered to make
// the test self-contained (no dependence on other feature stores). Exit 0 = pass.
//
// Run: node tests/smoke/analyticsCopilotSmoke.js

const assert = require('assert');
const copilot = require('../../lib/analyticsCopilot/analyticsCopilot');
const { matchMetricKeyword } = copilot._internal;

(async () => {
  let passed = 0;

  // register a self-contained metric
  copilot.registerMetric({
    id: 'smoke_revenue', description: 'Total demo revenue', keywords: ['revenue', 'sales', 'kitni sales'],
    run: () => ({ value: 12345, unit: 'PKR' })
  });

  // keyword routing
  assert.strictEqual(matchMetricKeyword('what is our revenue this month'), 'smoke_revenue'); passed++;
  assert.strictEqual(matchMetricKeyword('kitni sales hui'), 'smoke_revenue'); passed++;

  // built-in metric keyword routing
  assert.strictEqual(matchMetricKeyword('how many hot leads do we have'), 'hot_leads_count'); passed++;

  // ask end-to-end (fallback phrasing, no model)
  const r = await copilot.ask({ storeId: 'analytics_smoke', question: 'how much revenue?' });
  assert.strictEqual(r.metricId, 'smoke_revenue'); passed++;
  assert.strictEqual(r.value, 12345); passed++;
  assert.ok(/12345/.test(r.answer), 'answer should contain the computed value'); passed++;
  assert.strictEqual(r.method, 'keyword'); passed++;

  // built-in metric computes (0 when store empty, but should not throw)
  const hot = await copilot.ask({ storeId: 'analytics_smoke', question: 'how many hot leads?' });
  assert.strictEqual(hot.metricId, 'hot_leads_count'); passed++;
  assert.ok(typeof hot.value === 'number'); passed++;

  // unknown question -> graceful no-match
  const none = await copilot.ask({ storeId: 'analytics_smoke', question: 'what is the meaning of life' });
  assert.strictEqual(none.metricId, null); passed++;
  assert.ok(Array.isArray(none.available)); passed++;

  // missing question throws
  let threw = false;
  try { await copilot.ask({}); } catch { threw = true; }
  assert.ok(threw, 'ask with no question should throw'); passed++;

  console.log(`\u2705 analyticsCopilot smoke: ${passed} checks passed`);
  process.exit(0);
})().catch((e) => { console.error('\u274c analyticsCopilot smoke failed:', e); process.exit(1); });
