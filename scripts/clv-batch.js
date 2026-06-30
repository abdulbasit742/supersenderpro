#!/usr/bin/env node
// scripts/clv-batch.js
// Overnight predictive-CLV computation — runs on PC #2. Scores every store's
// customers and writes a static snapshot the dashboard reads.
//
// Schedule on PC #2:
//   21 3 * * *  cd /path/to/supersenderpro && node scripts/clv-batch.js

const fs = require('fs');
const path = require('path');
const clv = require('../lib/clv');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'clv', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = clv.buildAllSnapshot(startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'clv-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[clv] ok — stores=${snapshot.stores.length} ` +
      (p ? `customers=${p.summary.customers} predicted=${p.summary.predictedCLVTotal} avg=${p.summary.avgPredictedCLV} ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[clv] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
