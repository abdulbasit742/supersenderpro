#!/usr/bin/env node
// scripts/clv-check.js — validates the CLV install + the projection math
// (frequency, AOV, survival decay) against a fixture. Exits non-zero on fail.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('engine present', exists('lib/clv/engine.js'));
add('orchestrator present', exists('lib/clv/index.js'));
add('route present', exists('routes/clvRoutes.js'));
add('batch present', exists('scripts/clv-batch.js'));
add('dashboard present', exists('public/clv.html'));
add('docs present', exists('docs/CLV.md'));

try {
  const eng = require('../lib/clv/engine');
  const now = new Date('2026-06-30T00:00:00Z').getTime();
  const DAY = 86400000;

  // Active buyer: 6 orders over ~6 months, last order yesterday.
  const active = { phone: 'A', firstContact: new Date(now - 180 * DAY).toISOString(), lastContact: new Date(now - 1 * DAY).toISOString(), totalOrders: 6, totalSpent: 12000 };
  // Same history but went quiet 10 months ago -> survival should crush CLV.
  const lapsed = { phone: 'B', firstContact: new Date(now - 180 * DAY).toISOString(), lastContact: new Date(now - 300 * DAY).toISOString(), totalOrders: 6, totalSpent: 12000 };

  const sa = eng.scoreCustomer(active, now, { horizonMonths: 12, expectedLifespanMonths: 18 });
  const sb = eng.scoreCustomer(lapsed, now, { horizonMonths: 12, expectedLifespanMonths: 18 });

  add('aov computed', Math.abs(sa.aov - 2000) < 0.01); // 12000/6
  add('active survival high', sa.survival > 0.9);
  add('lapsed survival low', sb.survival < 0.6);
  add('active CLV > lapsed CLV', sa.predictedCLV > sb.predictedCLV);
  add('predicted CLV positive for active', sa.predictedCLV > 0);
  add('totalValue includes history', Math.abs(sa.totalValue - (sa.historicalValue + sa.predictedCLV)) < 0.01);

  // Zero-order customer -> zero CLV, never NaN.
  const dead = eng.scoreCustomer({ phone: 'C', firstContact: new Date(now - 90 * DAY).toISOString(), lastContact: new Date(now - 90 * DAY).toISOString(), totalOrders: 0, totalSpent: 0 }, now, {});
  add('zero-order CLV is 0 (no NaN)', dead.predictedCLV === 0 && !Number.isNaN(dead.predictedCLV));

  const r = eng.analyze([active, lapsed], { now });
  add('portfolio total sums', Math.abs(r.summary.predictedCLVTotal - (sa.predictedCLV + sb.predictedCLV)) < 0.5);
  add('ranked desc', r.customers[0].predictedCLV >= r.customers[1].predictedCLV);
  add('distribution buckets present', Array.isArray(r.distribution) && r.distribution.length === 6);

  const clv = require('../lib/clv');
  const snap = clv.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && Array.isArray(snap.topCustomers));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'clv_check.json'), JSON.stringify(out, null, 2));
let md = `# Predictive CLV Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'clv_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
