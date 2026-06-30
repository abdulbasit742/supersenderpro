#!/usr/bin/env node
// scripts/digest-check.js — validates the Insights Digest install + that the
// fault-tolerant roll-up works even when downstream modules have no data.
// Exits non-zero only on a real structural/functional failure.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('adapters present', exists('lib/insightsDigest/adapters.js'));
add('orchestrator present', exists('lib/insightsDigest/index.js'));
add('report exporter present', exists('lib/insightsDigest/reportExporter.js'));
add('route present', exists('routes/digestRoutes.js'));
add('batch present', exists('scripts/digest-batch.js'));
add('dashboard present', exists('public/insights-digest.html'));
add('docs present', exists('docs/INSIGHTS_DIGEST.md'));

try {
  const digest = require('../lib/insightsDigest');
  const exporter = require('../lib/insightsDigest/reportExporter');

  const d = digest.buildDigest('default_store');
  add('digest builds', !!d && !!d.sections && typeof d.modulesAvailable === 'number');
  add('has narrative', typeof d.narrative === 'string' && d.narrative.length > 0);
  add('has action list', Array.isArray(d.actions) && d.actions.length > 0);
  add('all 8 sections present', Object.keys(d.sections).length === 8);
  // Every section must be either available or gracefully unavailable (never throw).
  add('sections fault-tolerant', Object.values(d.sections).every((s) => typeof s.available === 'boolean'));

  // Exporters produce non-empty output regardless of data presence.
  const html = exporter.toHTML(d);
  add('html report renders', html.includes('Founder Insights Report'));
  const csv = exporter.toCSV(d);
  add('csv report renders', csv.split('\n')[0] === 'section,metric,value');

  // CSV escaping: a value with a comma must be quoted.
  const fake = { storeId: 's', generatedAt: new Date().toISOString(), modulesAvailable: 1, modulesTotal: 8,
    sections: { analytics: { available: true, revenue: 1000, mrr: 0, customers: 1, leadToCustomerPct: 50 },
      forecast: { available: false }, churn: { available: false }, reEngagement: { available: false },
      experiments: { available: false }, attribution: { available: true, conversions: 1, multiTouchSharePct: 0, topOpener: 'a,b', topCloser: 'c' },
      cohorts: { available: false }, alerts: { available: false } }, narrative: 'x', actions: [{ priority: 'low', text: 'ok' }] };
  add('csv quotes commas', exporter.toCSV(fake).includes('"a,b"'));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'digest_check.json'), JSON.stringify(out, null, 2));
let md = `# Insights Digest Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'digest_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
