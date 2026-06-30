#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const concentration = require('../lib/concentration');
const OUT = path.join(__dirname, '..', 'public', 'concentration', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = concentration.buildAllSnapshot(startedAt); const payload = { ...snapshot, meta: { generatedBy: 'concentration-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[concentration] ok — stores=${snapshot.stores.length} ` + (p ? `top5=${p.summary.top5SharePct}% risk=${p.summary.risk} ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[concentration] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
