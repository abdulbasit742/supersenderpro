#!/usr/bin/env node
// scripts/basket-batch.js
// Overnight market-basket analysis — runs on PC #2. Builds baskets + computes
// affinity for every store and writes a static snapshot the dashboard reads.
//
// Schedule on PC #2:
//   19 3 * * *  cd /path/to/supersenderpro && node scripts/basket-batch.js

const fs = require('fs');
const path = require('path');
const basket = require('../lib/basketAnalysis');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'basket', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = basket.buildAllSnapshot(startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'basket-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[basket] ok — stores=${snapshot.stores.length} ` +
      (p ? `baskets=${p.summary.baskets} pairs=${p.summary.pairs} strong=${p.summary.strongPairs} ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[basket] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
