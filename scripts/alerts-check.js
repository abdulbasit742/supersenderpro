#!/usr/bin/env node
// scripts/alerts-check.js — validates the Anomaly Alerts install + detector math
// against synthetic series with a KNOWN spike/drop. Isolated data dir; safe.

const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'alerts-'));
process.env.ALERTS_DATA_DIR = path.join(TMP, 'alerts');

const ROOT = path.join(__dirname, '..');
const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('detector present', exists('lib/anomalies/detector.js'));
add('rules present', exists('lib/anomalies/rules.js'));
add('store present', exists('lib/anomalies/alertStore.js'));
add('orchestrator present', exists('lib/anomalies/index.js'));
add('route present', exists('routes/alertsRoutes.js'));
add('batch present', exists('scripts/alerts-batch.js'));
add('dashboard present', exists('public/alerts.html'));
add('docs present', exists('docs/ALERTS.md'));

try {
  const det = require('../lib/anomalies/detector');
  const { toAlert } = require('../lib/anomalies/rules');
  const store = require('../lib/anomalies/alertStore');

  // Build 30 stable days ~100, then a huge spike to 500.
  const start = new Date('2026-01-01T00:00:00Z').getTime();
  const series = [];
  for (let i = 0; i < 30; i++) series.push({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value: 100 + (i % 3) });
  series.push({ date: new Date(start + 30 * 86400000).toISOString().slice(0, 10), value: 500 });
  const s = det.scoreLatest(series);
  add('detects spike', s && s.direction === 'spike' && Math.abs(s.z) > 3);

  // A drop to 20 should flag as a drop.
  const series2 = series.slice(0, 30).concat([{ date: '2026-02-01', value: 20 }]);
  const s2 = det.scoreLatest(series2);
  add('detects drop', s2 && s2.direction === 'drop' && Math.abs(s2.z) > 3);

  // Stable series should NOT alert.
  const stable = [];
  for (let i = 0; i < 31; i++) stable.push({ date: new Date(start + i * 86400000).toISOString().slice(0, 10), value: 100 });
  const s3 = det.scoreLatest(stable);
  add('ignores stable series', s3 && Math.abs(s3.z) < 3);

  // Rule layer: revenue drop is bad (warning/critical), revenue spike is positive.
  const drop = toAlert('revenue', { ...s2, threshold: 3 });
  add('revenue drop is bad', drop && drop.good === false);
  const spike = toAlert('revenue', { ...s, threshold: 3 });
  add('revenue spike is positive', spike && spike.good === true && spike.severity === 'positive');

  // Dedupe: adding the same alert twice yields it only once as "fresh".
  store.addNew('check_store', [drop]);
  const second = store.addNew('check_store', [drop]);
  add('dedupe works', second.length === 0);

  // Orchestrator doesn't throw on empty data.
  const anomalies = require('../lib/anomalies');
  const r = anomalies.scan('default_store');
  add('scan runs', r && typeof r.scanned === 'number');
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'alerts_check.json'), JSON.stringify(out, null, 2));
let md = `# Anomaly Alerts Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'alerts_check.md'), md);
console.log(md);
try { fs.rmSync(TMP, { recursive: true, force: true }); } catch {}
process.exit(failed > 0 ? 1 : 0);
