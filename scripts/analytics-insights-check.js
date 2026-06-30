#!/usr/bin/env node
// scripts/analytics-insights-check.js — validates the Analytics & Insights install
// and runs the pipeline against current data. Exits non-zero only on a structural
// or functional failure. Never prints customer data or secrets.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('engine index present', exists('lib/analyticsInsights/index.js'));
add('data sources present', exists('lib/analyticsInsights/dataSources.js'));
add('analytics engine present', exists('lib/analyticsInsights/analyticsEngine.js'));
add('churn model present', exists('lib/analyticsInsights/churnModel.js'));
add('route module present', exists('routes/analyticsInsightsRoutes.js'));
add('batch script present', exists('scripts/analytics-batch.js'));
add('dashboard page present', exists('public/founder-analytics.html'));
add('docs present', exists('docs/ANALYTICS_INSIGHTS.md'));

try {
  const analytics = require('../lib/analyticsInsights');
  const snapshot = analytics.buildAllSnapshot();
  add('snapshot builds', !!snapshot && !!snapshot.headline);
  add('has per-store data', Array.isArray(snapshot.perStore));

  const engine = require('../lib/analyticsInsights/analyticsEngine');
  const conv = engine.conversionMetrics(
    [
      { lastContact: new Date().toISOString(), totalOrders: 2 },
      { lastContact: new Date().toISOString(), totalOrders: 0 },
    ],
    { users: {}, planPrices: {} }
  );
  add('conversion funnel computes', conv.funnel.length === 4 && conv.leadToCustomerPct === 50);

  const churn = require('../lib/analyticsInsights/churnModel');
  const demo = churn.buildScores([
    { phone: '1', totalOrders: 0, totalSpent: 0, lastContact: new Date(Date.now() - 120 * 86400000).toISOString(), status: 'active' },
    { phone: '2', totalOrders: 5, totalSpent: 40000, lastContact: new Date().toISOString(), status: 'active' },
  ]);
  add('churn model scores all', demo.customersScored === 2);
  add('dormant customer flagged high', demo.topRisk.find((s) => s.phone === '1').band === 'high');
  add('loyal customer flagged low', demo.topRisk.find((s) => s.phone === '2').band === 'low');
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };

const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'analytics_insights_check.json'), JSON.stringify(out, null, 2));
let md = `# Analytics & Insights Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => {
  md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`;
});
fs.writeFileSync(path.join(dir, 'analytics_insights_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
