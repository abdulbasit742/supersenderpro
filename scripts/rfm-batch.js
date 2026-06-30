#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const rfm = require('../lib/rfm');
const OUT = path.join(__dirname, '..', 'public', 'rfm', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = rfm.buildAllSnapshot(startedAt); const payload = { ...snapshot, meta: { generatedBy: 'rfm-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[rfm] ok — stores=${snapshot.stores.length} ` + (p ? `customers=${p.summary.customers} segments=${p.summary.segments} ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[rfm] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
