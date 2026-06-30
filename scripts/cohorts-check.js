#!/usr/bin/env node
// scripts/cohorts-check.js — validates the Cohort install + the retention/LTV
// math against a hand-built fixture. Exits non-zero on failure.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const approx = (a, b, eps = 0.01) => Math.abs(a - b) < eps;

add('engine present', exists('lib/cohorts/cohortEngine.js'));
add('orchestrator present', exists('lib/cohorts/index.js'));
add('route present', exists('routes/cohortsRoutes.js'));
add('batch present', exists('scripts/cohorts-batch.js'));
add('dashboard present', exists('public/cohorts.html'));
add('docs present', exists('docs/COHORTS.md'));

try {
  const { buildCohorts, monthDiff } = require('../lib/cohorts/cohortEngine');

  add('monthDiff across years', monthDiff('2025-11', '2026-02') === 3);

  // Fixture: a 2-customer Jan cohort. Both order in Jan; one repeats in Feb.
  const orders = [
    { phone: 'A', ts: '2026-01-05T00:00:00Z', amount: 1000 },
    { phone: 'B', ts: '2026-01-20T00:00:00Z', amount: 2000 },
    { phone: 'A', ts: '2026-02-10T00:00:00Z', amount: 1500 },
  ];
  const now = new Date('2026-03-15T00:00:00Z').getTime();
  const { cohorts } = buildCohorts(orders, now);

  add('one cohort formed', cohorts.length === 1);
  const c = cohorts[0];
  add('cohort is Jan 2026', c.cohort === '2026-01');
  add('cohort size 2', c.size === 2);
  add('month 0 retention 100%', approx(c.retention[0].pct, 100));
  add('month 1 retention 50%', approx(c.retention[1].pct, 50)); // only A repeated
  add('month 2 retention 0%', approx(c.retention[2].pct, 0));
  // LTV: total Rs 4500 across 2 members = Rs 2250/member cumulatively by M1.
  add('LTV per member by M1', approx(c.ltv[1].perMember, 2250));
  add('m1RetentionPct surfaced', approx(c.m1RetentionPct, 50));

  // Orchestrator runs without throwing even on empty data.
  const cohortsLib = require('../lib/cohorts');
  const snap = cohortsLib.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && Array.isArray(snap.cohorts));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'cohorts_check.json'), JSON.stringify(out, null, 2));
let md = `# Cohort Retention Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'cohorts_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
