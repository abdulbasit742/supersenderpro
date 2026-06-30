#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const basket = require('../lib/basketAnalysis');
const OUT = path.join(__dirname, '..', 'public', 'basket', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = basket.buildAllSnapshot(startedAt); const payload = { ...snapshot, meta: { generatedBy: 'basket-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[basket] ok — stores=${snapshot.stores.length} ` + (p ? `pairs=${p.summary.pairs} strong=${p.summary.strongPairs} ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[basket] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
