#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const forecasting = require('../lib/forecasting');
const OUT = path.join(__dirname, '..', 'public', 'forecast', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = forecasting.buildAllSnapshot(30, startedAt); const payload = { ...snapshot, meta: { generatedBy: 'forecast-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[forecast] ok — stores=${snapshot.stores.length} ` + (p ? `next30=${p.summary.next30Revenue} accuracy=${p.summary.backtestAccuracyPct}% ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[forecast] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
