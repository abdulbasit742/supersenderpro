#!/usr/bin/env node
// scripts/sendtime-batch.js
// Overnight send-time analysis — runs on PC #2. Bins every store's interaction
// history into the hour x weekday grid and writes a static snapshot.
//
// Schedule on PC #2:
//   24 3 * * *  cd /path/to/supersenderpro && node scripts/sendtime-batch.js

const fs = require('fs');
const path = require('path');
const sendTime = require('../lib/sendTime');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'send-time', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = sendTime.buildAllSnapshot(startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'sendtime-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[sendtime] ok — stores=${snapshot.stores.length} ` +
      (p ? `events=${p.summary.totalEvents} best=${p.summary.bestWindow} ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[sendtime] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
