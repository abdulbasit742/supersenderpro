#!/usr/bin/env node
// scripts/products-check.js — validates the Product Analytics install + the
// aggregation/classification math against a fixture. Exits non-zero on failure.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const approx = (a, b, e = 0.01) => Math.abs(a - b) < e;

add('engine present', exists('lib/productAnalytics/engine.js'));
add('orchestrator present', exists('lib/productAnalytics/index.js'));
add('route present', exists('routes/productsRoutes.js'));
add('batch present', exists('scripts/products-batch.js'));
add('dashboard present', exists('public/products.html'));
add('docs present', exists('docs/PRODUCTS.md'));

try {
  const eng = require('../lib/productAnalytics/engine');
  const now = new Date('2026-06-30T00:00:00Z').getTime();
  const recent = new Date('2026-06-20T00:00:00Z').toISOString();
  const old = new Date('2026-01-01T00:00:00Z').toISOString();

  const orders = [
    { product: 'Widget', amount: 8000, phone: 'A', ts: recent },
    { product: 'Widget', amount: 8000, phone: 'A', ts: recent }, // A repeats Widget
    { product: 'Widget', amount: 8000, phone: 'B', ts: recent },
    { product: 'Gizmo', amount: 500, phone: 'C', ts: old },       // old, tiny -> dormant
  ];
  const r = eng.analyze(orders, { now, dormantDays: 60 });

  add('two products found', r.summary.products === 2);
  add('widget ranked first', r.products[0].product === 'Widget');
  add('revenue summed', approx(r.products[0].revenue, 24000));
  add('units counted', r.products[0].units === 3);
  add('repeat-buy rate computed', approx(r.products[0].repeatBuyRatePct, 50)); // A repeated of {A,B}
  add('widget is a star', r.products[0].class === 'star');
  add('old tiny product dormant', r.products.find((p) => p.product === 'Gizmo').class === 'dormant');
  add('pareto computed', r.summary.paretoProductsFor80Pct >= 1);
  add('revenue share sums ~100', approx(r.products.reduce((s, p) => s + p.revenueSharePct, 0), 100, 0.5));

  const products = require('../lib/productAnalytics');
  const snap = products.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && Array.isArray(snap.products));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'products_check.json'), JSON.stringify(out, null, 2));
let md = `# Product Analytics Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'products_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
