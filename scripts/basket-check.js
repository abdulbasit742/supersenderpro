#!/usr/bin/env node
// scripts/basket-check.js — validates the Basket install + affinity math
// (support/confidence/lift) against a fixture with a planted strong pair.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const approx = (a, b, e = 0.01) => Math.abs(a - b) < e;

add('engine present', exists('lib/basketAnalysis/engine.js'));
add('orchestrator present', exists('lib/basketAnalysis/index.js'));
add('route present', exists('routes/basketRoutes.js'));
add('batch present', exists('scripts/basket-batch.js'));
add('dashboard present', exists('public/basket.html'));
add('docs present', exists('docs/BASKET.md'));

try {
  const eng = require('../lib/basketAnalysis/engine');

  // Fixture: Bread & Butter almost always bought together; Jam occasionally.
  const baskets = [
    ['Bread', 'Butter'],
    ['Bread', 'Butter'],
    ['Bread', 'Butter', 'Jam'],
    ['Bread', 'Butter'],
    ['Milk'],
    ['Bread', 'Jam'],
  ];
  const r = eng.analyze(baskets, { minSupportCount: 2 });

  const bb = r.pairs.find((p) => (p.a === 'Bread' && p.b === 'Butter') || (p.a === 'Butter' && p.b === 'Bread'));
  add('finds Bread+Butter pair', !!bb);
  add('bread+butter counted 4x', bb && bb.bothCount === 4);
  // Bread in 5 baskets, Butter in 4, both in 4. conf(Butter->Bread)=4/4=1.
  add('high confidence direction', bb && approx(bb.bestConfidence, 1));
  add('lift > 1 (real affinity)', bb && bb.lift > 1);
  add('strong pair counted', r.summary.strongPairs >= 1);

  // Recommendation: buying Butter should recommend Bread.
  add('recommends complement', (r.recommendations['Butter'] || []).some((x) => x.product === 'Bread'));
  // Milk (solo) should have no recommendations.
  add('solo item has no affinity', !(r.recommendations['Milk'] && r.recommendations['Milk'].length));

  const basket = require('../lib/basketAnalysis');
  const snap = basket.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && Array.isArray(snap.topPairs));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'basket_check.json'), JSON.stringify(out, null, 2));
let md = `# Basket Affinity Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'basket_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
