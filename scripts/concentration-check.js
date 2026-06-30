#!/usr/bin/env node
// scripts/concentration-check.js — validates the install + the Gini/HHI/top-N
// math against known fixtures (perfect equality, perfect monopoly). Exits non-zero on fail.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const approx = (a, b, e = 0.02) => Math.abs(a - b) < e;

add('engine present', exists('lib/concentration/engine.js'));
add('orchestrator present', exists('lib/concentration/index.js'));
add('route present', exists('routes/concentrationRoutes.js'));
add('batch present', exists('scripts/concentration-batch.js'));
add('dashboard present', exists('public/concentration.html'));
add('docs present', exists('docs/CONCENTRATION.md'));

try {
  const eng = require('../lib/concentration/engine');

  // Perfect equality: Gini ~ 0.
  add('gini ~0 for equal', approx(eng.gini([100, 100, 100, 100]), 0, 0.05));
  // Near-monopoly: Gini approaches 1.
  add('gini high for monopoly', eng.gini([1, 1, 1, 1000]) > 0.6);
  // Empty / zero safe.
  add('gini 0 for empty', eng.gini([]) === 0 && eng.gini([0, 0]) === 0);

  // Concentrated base: one whale dominates.
  const whale = [
    { phone: 'A', name: 'Whale', totalSpent: 80000 },
    { phone: 'B', name: 'B', totalSpent: 5000 },
    { phone: 'C', name: 'C', totalSpent: 5000 },
    { phone: 'D', name: 'D', totalSpent: 5000 },
    { phone: 'E', name: 'E', totalSpent: 5000 },
  ];
  const r = eng.analyze(whale);
  add('single-buyer exposure 80%', approx(r.summary.singleBuyerExposurePct, 80, 0.5));
  add('top5 share 100%', approx(r.summary.top5SharePct, 100, 0.5));
  add('flagged high risk', r.summary.risk === 'high');
  add('hhi concentrated', r.summary.hhi >= 0.25);
  add('lorenz starts at origin', r.lorenz[0].pctCustomers === 0 && r.lorenz[0].pctRevenue === 0);
  add('top customers ranked', r.topCustomers[0].name === 'Whale');

  // Even base: low risk.
  const even = Array.from({ length: 10 }, (_, i) => ({ phone: 'p' + i, name: 'C' + i, totalSpent: 1000 }));
  const r2 = eng.analyze(even);
  add('even base low risk', r2.summary.risk === 'low');

  const concentration = require('../lib/concentration');
  const snap = concentration.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && Array.isArray(snap.lorenz));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'concentration_check.json'), JSON.stringify(out, null, 2));
let md = `# Concentration Risk Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'concentration_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
