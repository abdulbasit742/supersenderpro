#!/usr/bin/env node
// scripts/cohorts-batch.js
// Overnight cohort/retention/LTV computation — runs on PC #2. Walks the full CRM
// order history for every store (the expensive part) and writes a static
// snapshot the dashboard reads, keeping the live app light.
//
// Schedule on PC #2:
//   20 3 * * *  cd /path/to/supersenderpro && node scripts/cohorts-batch.js

const fs = require('fs');
const path = require('path');
const cohorts = require('../lib/cohorts');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'cohorts', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = cohorts.buildAllSnapshot(startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'cohorts-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[cohorts] ok — stores=${snapshot.stores.length} ` +
      (p ? `cohorts=${p.summary.cohorts} customers=${p.summary.totalCustomers} avgM1=${p.summary.avgM1RetentionPct}% ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[cohorts] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
