#!/usr/bin/env node
// scripts/engagement-check.js — validates the install + reply-pairing/latency
// math against a fixture with a known reply + a known order. Exits non-zero on fail.

const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

const checks = [];
const add = (n, ok, d = '') => checks.push({ name: n, ok: !!ok, detail: d });
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));
const approx = (a, b, e = 0.1) => Math.abs(a - b) < e;

add('engine present', exists('lib/engagement/engine.js'));
add('orchestrator present', exists('lib/engagement/index.js'));
add('route present', exists('routes/engagementRoutes.js'));
add('batch present', exists('scripts/engagement-batch.js'));
add('dashboard present', exists('public/engagement.html'));
add('docs present', exists('docs/ENGAGEMENT.md'));

try {
  const eng = require('../lib/engagement/engine');
  const t0 = Date.parse('2026-06-01T10:00:00Z');
  const H = 3600000;

  // Customer 1: outbound, reply 2h later, order 1 day later.
  const c1 = [
    { ts: new Date(t0).toISOString(), type: 'message_out' },
    { ts: new Date(t0 + 2 * H).toISOString(), type: 'inbound' },
    { ts: new Date(t0 + 24 * H).toISOString(), type: 'order' },
  ];
  // Customer 2: outbound, no reply at all.
  const c2 = [{ ts: new Date(t0).toISOString(), type: 'broadcast' }];

  const r = eng.analyze([c1, c2], { replyWindowHours: 48, orderWindowDays: 7 });
  add('counts outbound', r.summary.outboundMessages === 2);
  add('counts reply', r.summary.replies === 1);
  add('reply rate 50%', approx(r.summary.replyRatePct, 50));
  add('median latency 2h', approx(r.summary.medianReplyLatencyHours, 2));
  add('message->order 50%', approx(r.summary.messageToOrderPct, 50));
  add('latency histogram present', Array.isArray(r.latencyHistogram) && r.latencyHistogram.length === 5);
  add('2h lands in 1-4h bucket', r.latencyHistogram.find((b) => b.label === '1\u20134h').count === 1);

  // No reply outside window: outbound then reply 100h later -> not counted.
  const late = [
    { ts: new Date(t0).toISOString(), type: 'message_out' },
    { ts: new Date(t0 + 100 * H).toISOString(), type: 'inbound' },
  ];
  const r2 = eng.analyze([late], { replyWindowHours: 48, orderWindowDays: 7 });
  add('late reply not counted', r2.summary.replies === 0);

  const engagement = require('../lib/engagement');
  const snap = engagement.buildSnapshot('default_store');
  add('snapshot builds', !!snap && !!snap.summary && Array.isArray(snap.latencyHistogram));
} catch (e) {
  add('pipeline runs', false, e.message);
}

const passed = checks.filter((c) => c.ok).length;
const failed = checks.filter((c) => !c.ok).length;
const out = { generatedAt: new Date().toISOString(), passed, failed, total: checks.length, checks };
const dir = path.join(ROOT, 'artifacts');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, 'engagement_check.json'), JSON.stringify(out, null, 2));
let md = `# Messaging Engagement Check\n\nGenerated: ${out.generatedAt}\n\n**${passed}/${checks.length} passed**\n\n| Check | Result | Detail |\n|---|---|---|\n`;
checks.forEach((c) => { md += `| ${c.name} | ${c.ok ? '\u2705' : '\u274c'} | ${String(c.detail).slice(0, 60)} |\n`; });
fs.writeFileSync(path.join(dir, 'engagement_check.md'), md);
console.log(md);
process.exit(failed > 0 ? 1 : 0);
