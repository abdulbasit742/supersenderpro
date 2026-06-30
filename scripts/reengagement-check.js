#!/usr/bin/env node
// scripts/reengagement-check.js — validates the Re-Engagement install + pipeline.
// Forces dry-run, uses an isolated temp data dir so it never touches real data
// and never sends anything. Exits non-zero only on a structural/functional fail.

const fs = require('fs');
const os = require('os');
const path = require('path');

// Isolate all state to a throwaway dir BEFORE requiring the modules.
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'reengage-'));
process.env.REENGAGE_DATA_DIR = path.join(TMP, 'reengagement');
process.env.REENGAGE_LIVE = 'false';

const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('engine present', exists('lib/reEngagement/engine.js'));
add('orchestrator present', exists('lib/reEngagement/index.js'));
add('templates present', exists('lib/reEngagement/templates.js'));
add('campaign store present', exists('lib/reEngagement/campaignStore.js'));
add('route present', exists('routes/reEngagementRoutes.js'));
add('batch script present', exists('scripts/reengage-batch.js'));
add('dashboard present', exists('public/reengagement.html'));
add('docs present', exists('docs/REENGAGEMENT.md'));

try {
  const engine = require('../lib/reEngagement/engine');
  const { renderMergeFields } = require('../lib/mergeFields');
  const { TEMPLATES, pickTemplate } = require('../lib/reEngagement/templates');

  // Template selection logic.
  add('first-order template for never-bought', pickTemplate({ frequency: 0 }) === 'winback_firstorder');
  add('highvalue template for high band buyer', pickTemplate({ band: 'high', frequency: 4, monetary: 20000 }) === 'winback_highvalue');
  add('subscription template wins on kind', pickTemplate({ kind: 'subscription', frequency: 3 }) === 'winback_subscription');

  // Merge rendering produces no leftover {{tokens}}.
  const rendered = renderMergeFields(TEMPLATES.winback_nudge.body, { vars: { name: 'Ayesha' } });
  add('merge fields render', rendered.includes('Ayesha') && !rendered.includes('{{'));

  // Config defaults are safe (dry-run).
  add('defaults to dry-run', engine.cfg().live === false);

  // Phone masking never leaks full numbers.
  add('phone masked', engine.mask('923001234567').includes('****'));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };

const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'reengagement_check.json'), JSON.stringify(out, null, 2));
let md = `# Re-Engagement Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'reengagement_check.md'), md);
console.log(md);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
process.exit(failed > 0 ? 1 : 0);
