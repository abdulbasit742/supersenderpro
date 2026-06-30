#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const clv = require('../lib/clv');
const OUT = path.join(__dirname, '..', 'public', 'clv', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = clv.buildAllSnapshot(startedAt); const payload = { ...snapshot, meta: { generatedBy: 'clv-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[clv] ok — stores=${snapshot.stores.length} ` + (p ? `predicted=${p.summary.predictedCLVTotal} avg=${p.summary.avgPredictedCLV} ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[clv] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
