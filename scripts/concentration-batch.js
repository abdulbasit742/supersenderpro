#!/usr/bin/env node
// scripts/concentration-batch.js
// Overnight concentration-risk computation — runs on PC #2. Writes a static
// snapshot the dashboard reads.
//
// Schedule on PC #2:
//   26 3 * * *  cd /path/to/supersenderpro && node scripts/concentration-batch.js

const fs = require('fs');
const path = require('path');
const concentration = require('../lib/concentration');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'concentration', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = concentration.buildAllSnapshot(startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'concentration-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[concentration] ok — stores=${snapshot.stores.length} ` +
      (p ? `top5=${p.summary.top5SharePct}% gini=${p.summary.gini} risk=${p.summary.risk} ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[concentration] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
