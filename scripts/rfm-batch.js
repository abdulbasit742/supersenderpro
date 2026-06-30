#!/usr/bin/env node
// scripts/rfm-batch.js
// Overnight RFM segmentation — runs on PC #2. Scores every store's customers and
// writes a static snapshot the dashboard reads.
//
// Schedule on PC #2:
//   23 3 * * *  cd /path/to/supersenderpro && node scripts/rfm-batch.js

const fs = require('fs');
const path = require('path');
const rfm = require('../lib/rfm');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'rfm', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = rfm.buildAllSnapshot(startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'rfm-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[rfm] ok — stores=${snapshot.stores.length} ` +
      (p ? `customers=${p.summary.customers} segments=${p.summary.segments} ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[rfm] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
