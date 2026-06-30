#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const attribution = require('../lib/attribution');
const OUT = path.join(__dirname, '..', 'public', 'attribution', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = attribution.buildAllSnapshot(startedAt); const payload = { ...snapshot, meta: { generatedBy: 'attribution-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[attribution] ok — stores=${snapshot.stores.length} ` + (p ? `conversions=${p.summary.conversions} revenue=${p.summary.totalRevenue} ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[attribution] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
