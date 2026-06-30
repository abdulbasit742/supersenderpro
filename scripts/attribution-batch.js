#!/usr/bin/env node
// scripts/attribution-batch.js
// Overnight multi-touch attribution — runs on PC #2. Reconstructs journeys and
// runs all 5 models for every store, writing a static snapshot the dashboard
// reads (zero load on the live app). Journey reconstruction over the full CRM
// log is exactly the kind of work that belongs in the overnight window.
//
// Schedule on PC #2:
//   15 3 * * *  cd /path/to/supersenderpro && node scripts/attribution-batch.js

const fs = require('fs');
const path = require('path');
const attribution = require('../lib/attribution');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'attribution', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = attribution.buildAllSnapshot(startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'attribution-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[attribution] ok — stores=${snapshot.stores.length} ` +
      (p ? `conversions=${p.summary.conversions} revenue=${p.summary.totalRevenue} multiTouch=${p.summary.multiTouchSharePct}% ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[attribution] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
