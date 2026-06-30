#!/usr/bin/env node
// scripts/attribution-check.js — validates the Attribution install + the model
// math (the part that must be exactly right). Exits non-zero on failure.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const approx = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

add('models present', exists('lib/attribution/models.js'));
add('journeys present', exists('lib/attribution/journeys.js'));
add('orchestrator present', exists('lib/attribution/index.js'));
add('route present', exists('routes/attributionRoutes.js'));
add('batch present', exists('scripts/attribution-batch.js'));
add('dashboard present', exists('public/attribution.html'));
add('docs present', exists('docs/ATTRIBUTION.md'));

try {
  const m = require('../lib/attribution/models');
  const sum = (a) => a.reduce((x, y) => x + y, 0);

  // Every model's weights sum to 1 for a 4-touch journey.
  const now = Date.now();
  const times = [now - 3 * 86400000, now - 2 * 86400000, now - 86400000, now];
  for (const model of m.MODELS) {
    const w = m.weightsFor(model, times, now);
    add(`${model} weights sum to 1`, approx(sum(w), 1));
  }

  // First/last touch put all credit on the right end.
  add('first_touch credits first', approx(m.firstTouch(4)[0], 1));
  add('last_touch credits last', approx(m.lastTouch(4)[3], 1));
  // Linear is even.
  add('linear is even', approx(m.linear(4)[0], 0.25) && approx(m.linear(4)[3], 0.25));
  // Position-based U-shape: 40/20-split/40.
  const pb = m.positionBased(4);
  add('position_based U-shape', approx(pb[0], 0.4) && approx(pb[3], 0.4) && approx(pb[1] + pb[2], 0.2));
  // Time decay favours the most recent touch.
  const td = m.timeDecay(times, now, 7);
  add('time_decay favours recent', td[3] > td[0]);

  // Orchestrator runs end-to-end (may be empty without data — must not throw).
  const attribution = require('../lib/attribution');
  const snap = attribution.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.models && !!snap.models.last_touch);
  add('comparison table present', Array.isArray(snap.comparison));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'attribution_check.json'), JSON.stringify(out, null, 2));
let md = `# Attribution Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'attribution_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
