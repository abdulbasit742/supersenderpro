#!/usr/bin/env node
// scripts/analytics-batch.js
// Overnight analytics batch — built to run on PC #2 (the Linux batch box).
// Computes the full founder analytics snapshot (revenue, conversion, channel
// performance, churn prediction) for every store and writes:
//   - public/analytics/insights.json       served statically, read by the dashboard
//   - data/analytics/history/<date>.json    daily history for trend tracking
//
// Because the dashboard reads a pre-computed static file, the heavy lifting stays
// off the live app entirely — exactly what PC #2's overnight window is for.
//
// Run manually:          node scripts/analytics-batch.js
// Schedule on PC #2:     0 3 * * *  cd /path/to/supersenderpro && node scripts/analytics-batch.js
// In-process (optional): require('node-cron').schedule('0 3 * * *', require('./scripts/analytics-batch').run)

const fs = require('fs');
const os = require('os');
const path = require('path');
const analytics = require('../lib/analyticsInsights');

const ROOT = path.join(__dirname, '..');
const PUBLIC_OUT = path.join(ROOT, 'public', 'analytics', 'insights.json');
const HISTORY_DIR = path.join(ROOT, 'data', 'analytics', 'history');

function writeFileSafe(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(obj, null, 2));
}

function run() {
  const startedAt = Date.now();
  const snapshot = analytics.buildAllSnapshot(startedAt);
  const payload = {
    ...snapshot,
    meta: {
      generatedBy: 'analytics-batch',
      host: process.env.HOSTNAME || os.hostname(),
      durationMs: Date.now() - startedAt,
    },
  };

  writeFileSafe(PUBLIC_OUT, payload);
  const day = new Date(startedAt).toISOString().slice(0, 10);
  writeFileSafe(path.join(HISTORY_DIR, `${day}.json`), payload);

  console.log(
    `[analytics-batch] ${day} ok — stores=${snapshot.stores.length} ` +
      `revenue=${snapshot.headline.revenue} mrr=${snapshot.headline.mrr} ` +
      `atRisk=${snapshot.headline.revenueAtRisk} (${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try {
    run();
    process.exit(0);
  } catch (e) {
    console.error('[analytics-batch] FAILED:', e.message);
    process.exit(1);
  }
}

module.exports = { run };
