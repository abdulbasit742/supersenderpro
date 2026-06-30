#!/usr/bin/env node
// scripts/geo-check.js — validates the Geo Analytics install + roll-up math
// (including city normalization + opportunity detection). Exits non-zero on fail.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const approx = (a, b, e = 0.01) => Math.abs(a - b) < e;

add('engine present', exists('lib/geoAnalytics/engine.js'));
add('orchestrator present', exists('lib/geoAnalytics/index.js'));
add('route present', exists('routes/geoRoutes.js'));
add('batch present', exists('scripts/geo-batch.js'));
add('dashboard present', exists('public/geo.html'));
add('docs present', exists('docs/GEO.md'));

try {
  const eng = require('../lib/geoAnalytics/engine');

  add('normalizes aliases', eng.normalizeCity('khi') === 'Karachi' && eng.normalizeCity(' LAHORE ') === 'Lahore');
  add('title-cases unknown city', eng.normalizeCity('sukkur') === 'Sukkur');
  add('blank city -> Unknown', eng.normalizeCity('') === 'Unknown');

  const customers = [
    { city: 'Karachi', totalSpent: 50000, totalOrders: 10, lastContact: new Date().toISOString() },
    { city: 'khi', totalSpent: 30000, totalOrders: 5, lastContact: new Date().toISOString() }, // merges into Karachi
    { city: 'Lahore', totalSpent: 2000, totalOrders: 1, lastContact: new Date().toISOString() },
    { city: 'Lahore', totalSpent: 0, totalOrders: 0 },
    { city: 'Lahore', totalSpent: 0, totalOrders: 0 },
    { city: 'Lahore', totalSpent: 0, totalOrders: 0 },
  ];
  const r = eng.analyze(customers, { now: Date.now() });

  add('aliases merged', r.regions.find((x) => x.city === 'Karachi').customers === 2);
  add('karachi ranked first', r.regions[0].city === 'Karachi');
  add('karachi revenue summed', approx(r.regions[0].revenue, 80000));
  add('revenue share sums ~100', approx(r.regions.reduce((s, x) => s + x.revenueSharePct, 0), 100, 0.5));
  // Lahore: 4 customers (high customer share) but tiny revenue -> opportunity.
  add('detects underpenetrated city', r.opportunities.some((o) => o.city === 'Lahore'));

  const geo = require('../lib/geoAnalytics');
  const snap = geo.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && Array.isArray(snap.regions));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'geo_check.json'), JSON.stringify(out, null, 2));
let md = `# Geo Analytics Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'geo_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
