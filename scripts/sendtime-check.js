#!/usr/bin/env node
// scripts/sendtime-check.js — validates the Send-Time install + binning math
// (timezone bucketing + peak detection) against a fixture. Exits non-zero on fail.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

add('engine present', exists('lib/sendTime/engine.js'));
add('orchestrator present', exists('lib/sendTime/index.js'));
add('route present', exists('routes/sendTimeRoutes.js'));
add('batch present', exists('scripts/sendtime-batch.js'));
add('dashboard present', exists('public/send-time.html'));
add('docs present', exists('docs/SEND_TIME.md'));

try {
  const eng = require('../lib/sendTime/engine');

  add('hour label am/pm', eng.hourLabel(14) === '2 PM' && eng.hourLabel(0) === '12 AM' && eng.hourLabel(9) === '9 AM');

  // Build interactions all at the same local hour to force a clear peak.
  // Pick a UTC instant that is a known hour in Asia/Karachi (UTC+5):
  // 2026-06-15T05:00:00Z = 10:00 (10 AM) PKT, which is a Monday.
  const base = Date.parse('2026-06-15T05:00:00Z');
  const interactions = [];
  for (let i = 0; i < 20; i++) interactions.push({ ts: new Date(base + i * 7 * 86400000).toISOString(), type: 'inbound' });
  // A few scattered other-time events.
  interactions.push({ ts: '2026-06-16T20:00:00Z', type: 'reply' });
  interactions.push({ ts: '2026-06-17T22:00:00Z', type: 'order' });
  // Noise that should be ignored (not an engagement type).
  interactions.push({ ts: '2026-06-15T05:00:00Z', type: 'note' });

  const r = eng.analyze(interactions, { timeZone: 'Asia/Karachi' });
  add('counts only engagement events', r.totalEvents === 22); // 20 + reply + order, note excluded
  add('peak hour is 10 AM local', r.peakHour === 10);
  add('peak day is Monday', r.peakDay === 'Mon');
  add('top window populated', r.topWindows.length > 0 && r.topWindows[0].count === 20);
  add('grid is 7x24', r.grid.length === 7 && r.grid[0].length === 24);

  const sendTime = require('../lib/sendTime');
  const snap = sendTime.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && Array.isArray(snap.recommendations));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'sendtime_check.json'), JSON.stringify(out, null, 2));
let md = `# Send-Time Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'sendtime_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
