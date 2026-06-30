#!/usr/bin/env node
// scripts/forecast-batch.js
// Overnight revenue/demand forecast — runs on PC #2. Builds the daily series for
// every store, fits the model, backtests it, and writes a static snapshot the
// dashboard reads. Keeps the (cheap, but recurring) modelling off the live app.
//
// Schedule on PC #2:
//   25 3 * * *  cd /path/to/supersenderpro && node scripts/forecast-batch.js

const fs = require('fs');
const path = require('path');
const forecasting = require('../lib/forecasting');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'forecast', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = forecasting.buildAllSnapshot(30, startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'forecast-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[forecast] ok — stores=${snapshot.stores.length} ` +
      (p ? `next30=${p.summary.next30Revenue} (\u00b1 to ${p.summary.next30RevenueHigh}) accuracy=${p.summary.backtestAccuracyPct}% ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[forecast] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
