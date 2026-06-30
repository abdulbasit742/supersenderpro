#!/usr/bin/env node
// scripts/lead-intel-batch.js
// Overnight batch lead scorer. Designed to run on PC #2 (Linux GPU box) while
// the Ollama model is warm, so each morning starts with a freshly ranked lead
// list. Re-scores everyone already on file for the given store (or all stores).
//
// Usage:
//   node scripts/lead-intel-batch.js                 # store "default_store"
//   node scripts/lead-intel-batch.js --store mystore  # a specific store
//   node scripts/lead-intel-batch.js --no-ai          # deterministic only (fast)
//
// Cron (PC #2), every night at 2am:
//   0 2 * * *  cd /path/to/supersenderpro && node scripts/lead-intel-batch.js >> data/lead_intel/batch.log 2>&1

const path = require('path');
const fs = require('fs');
const leadIntel = require('../lib/leadIntel/leadIntel');

function arg(name, def) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? (process.argv[i + 1] && !process.argv[i + 1].startsWith('--') ? process.argv[i + 1] : true) : def;
}

(async () => {
  const storeId = arg('--store', 'default_store');
  const enrichAI = !process.argv.includes('--no-ai');
  const start = Date.now();
  console.log(`[lead-intel-batch] start store=${storeId} enrichAI=${enrichAI} at ${new Date().toISOString()}`);

  const result = await leadIntel.batchScore({ storeId, enrichAI });

  const hot = result.scored.filter(l => l.band === 'hot').length;
  const warm = result.scored.filter(l => l.band === 'warm').length;
  const atRisk = result.scored.filter(l => l.atRisk).length;

  const reportDir = path.join(__dirname, '..', 'data', 'lead_intel');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });
  const report = {
    ranAt: new Date().toISOString(),
    storeId,
    durationMs: Date.now() - start,
    total: result.count, hot, warm, atRisk,
    top: result.scored.slice(0, 20).map(l => ({ phone: l.phone, score: l.score, band: l.band, nextBestAction: l.nextBestAction }))
  };
  fs.writeFileSync(path.join(reportDir, `${storeId}_last_batch.json`), JSON.stringify(report, null, 2));

  console.log(`[lead-intel-batch] done: ${result.count} leads | hot=${hot} warm=${warm} at-risk=${atRisk} | ${report.durationMs}ms`);
  process.exit(0);
})().catch((e) => { console.error('[lead-intel-batch] failed:', e); process.exit(1); });
