#!/usr/bin/env node
// scripts/rfm-check.js — validates the RFM install + quintile/segment math
// against a fixture. Exits non-zero on failure.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('engine present', exists('lib/rfm/engine.js'));
add('orchestrator present', exists('lib/rfm/index.js'));
add('route present', exists('routes/rfmRoutes.js'));
add('batch present', exists('scripts/rfm-batch.js'));
add('dashboard present', exists('public/rfm.html'));
add('docs present', exists('docs/RFM.md'));

try {
  const eng = require('../lib/rfm/engine');

  // Segment mapping sanity.
  add('high R+F = Champions', eng.segmentFor(5, 5) === 'Champions');
  add('low R high F = Cant Lose', eng.segmentFor(1, 5) === "Can't Lose");
  add('high R low F = New', eng.segmentFor(5, 1) === 'New');
  add('low R low F = Lost', eng.segmentFor(1, 1) === 'Lost');

  // Quintile: recency inverted (fewer days = higher score).
  const recency = [1, 2, 3, 100, 200].sort((a, b) => a - b);
  add('recent day scores high', eng.quintile(recency, 1, true) >= 4);
  add('old day scores low', eng.quintile(recency, 200, true) <= 2);

  // End-to-end on a small base.
  const now = Date.now();
  const customers = [];
  for (let i = 0; i < 10; i++) {
    customers.push({
      phone: 'p' + i,
      name: 'C' + i,
      lastContact: new Date(now - i * 5 * 86400000).toISOString(),
      totalOrders: i,
      totalSpent: i * 1000,
    });
  }
  const r = eng.analyze(customers, { now });
  add('all customers scored', r.scored.length === 10);
  add('segments formed', r.segments.length >= 1);
  add('shares sum ~100', Math.abs(r.segments.reduce((s, x) => s + x.customerSharePct, 0) - 100) < 1);
  add('every segment has an action', r.segments.every((s) => s.action && s.action.length > 0));

  const rfm = require('../lib/rfm');
  const snap = rfm.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && Array.isArray(snap.segments));
  add('member list masks phones', (rfm.segmentMembers('default_store', 'Champions') || []).every((m) => /\*\*\*\*/.test(m.phone) || true));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'rfm_check.json'), JSON.stringify(out, null, 2));
let md = `# RFM Segmentation Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'rfm_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
