#!/usr/bin/env node
// scripts/experiments-check.js — validates the A/B testing install + pipeline.
// Isolated temp data dir; never touches real data. Exits non-zero on failure.

const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'experiments-'));
process.env.EXPERIMENTS_DATA_DIR = path.join(TMP, 'experiments');

const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('store present', exists('lib/experiments/experimentStore.js'));
add('statistics present', exists('lib/experiments/statistics.js'));
add('orchestrator present', exists('lib/experiments/index.js'));
add('route present', exists('routes/experimentsRoutes.js'));
add('batch present', exists('scripts/experiments-batch.js'));
add('dashboard present', exists('public/experiments.html'));
add('docs present', exists('docs/EXPERIMENTS.md'));

try {
  const exp = require('../lib/experiments');
  const stats = require('../lib/experiments/statistics');

  // Create + assignment determinism.
  const e = exp.createExperiment('check_store', {
    name: 'Greeting test', metric: 'replied',
    variants: [{ label: 'Formal', template: 'Assalam o Alaikum' }, { label: 'Casual', template: 'Hi!' }],
  });
  add('experiment created with 2 variants', e.variants.length === 2);

  const a1 = exp.assign('check_store', e.id, '923001112222');
  const a2 = exp.assign('check_store', e.id, '923001112222');
  add('assignment is sticky', a1.variant === a2.variant && a2.sticky === true);

  // Hash assignment is deterministic across calls.
  add('hash deterministic', exp.hashUnit('x:y') === exp.hashUnit('x:y'));

  // Track + results.
  exp.track('check_store', e.id, '923001112222', 'replied');
  const r = exp.results('check_store', e.id);
  add('results compute per-variant', r.perVariant.length === 2);
  add('leader identified', !!r.leader);

  // Stats sanity: a clearly-better B should be significant at large N.
  const t = stats.twoProportionTest(50, 1000, 150, 1000);
  add('z-test flags real difference', t.ok && t.significant === true && t.pB > t.pA);
  // Tiny samples should NOT be significant.
  const t2 = stats.twoProportionTest(1, 5, 2, 5);
  add('z-test ignores noise on small N', t2.ok && t2.significant === false);
  // Sample-size hint is a positive integer.
  add('sample-size hint sane', stats.sampleSizePerVariant(0.1, 0.05) > 0);
} catch (err) {
  add('pipeline runs', false, err.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };

const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'experiments_check.json'), JSON.stringify(out, null, 2));
let md = `# A/B Testing Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'experiments_check.md'), md);
console.log(md);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
process.exit(failed > 0 ? 1 : 0);
