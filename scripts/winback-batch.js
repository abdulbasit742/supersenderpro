#!/usr/bin/env node
// scripts/winback-batch.js
// Weekly dormant win-back sweep. Runs on PC #2 (model warm): find quiet
// customers, segment them, craft per-segment messages, and queue a plan. Like
// the other batches it PLANS only — your queue worker sends each step at its
// whenISO and calls /api/winback/sent (and /won when they reply, /suppress on
// repeated silence).
//
// Usage:
//   node scripts/winback-batch.js                      # default_store, 21d dormant
//   node scripts/winback-batch.js --store mystore --days 30
//
// Cron (PC #2), weekly Monday 4am:
//   0 4 * * 1  cd /path/to/supersenderpro && node scripts/winback-batch.js >> data/winback/batch.log 2>&1

const path = require('path');
const fs = require('fs');
const wb = require('../lib/winback/winback');

function val(name, def) { const i = process.argv.indexOf(name); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def; }

(async () => {
  const storeId = val('--store', 'default_store');
  const dormantDays = parseInt(val('--days', process.env.WINBACK_DORMANT_DAYS || '21'), 10);
  const start = Date.now();
  console.log(`[winback-batch] start store=${storeId} dormantDays=${dormantDays} at ${new Date().toISOString()}`);

  const result = await wb.launch({ storeId, dormantDays });

  const reportDir = path.join(__dirname, '..', 'data', 'winback');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    ranAt: new Date().toISOString(), storeId, durationMs: Date.now() - start,
    dormant: result.dormant, queued: result.queued, segments: result.segments,
    sample: result.plan.slice(0, 10).map(p => ({ phone: p.phone, segment: p.segment, whenISO: p.whenISO }))
  };
  fs.writeFileSync(path.join(reportDir, `${storeId}_last_batch.json`), JSON.stringify(report, null, 2));

  console.log(`[winback-batch] done: dormant=${result.dormant} queued=${result.queued} segments=${JSON.stringify(result.segments)} | ${report.durationMs}ms`);
  console.log('[winback-batch] enqueue the plan to your sender; mark /sent, /won, /suppress as outcomes arrive.');
  process.exit(0);
})().catch((e) => { console.error('[winback-batch] failed:', e); process.exit(1); });
