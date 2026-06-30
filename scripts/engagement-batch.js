#!/usr/bin/env node
// scripts/engagement-batch.js
// Overnight messaging-engagement computation — runs on PC #2. Writes a static
// snapshot the dashboard reads.
//
// Schedule on PC #2:
//   27 3 * * *  cd /path/to/supersenderpro && node scripts/engagement-batch.js

const fs = require('fs');
const path = require('path');
const engagement = require('../lib/engagement');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'engagement', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = engagement.buildAllSnapshot(startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'engagement-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[engagement] ok — stores=${snapshot.stores.length} ` +
      (p ? `replyRate=${p.summary.replyRatePct}% medianLatency=${p.summary.medianReplyLatencyHours}h ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[engagement] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
