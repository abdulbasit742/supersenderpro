#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const cohorts = require('../lib/cohorts');
const OUT = path.join(__dirname, '..', 'public', 'cohorts', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = cohorts.buildAllSnapshot(startedAt); const payload = { ...snapshot, meta: { generatedBy: 'cohorts-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[cohorts] ok — stores=${snapshot.stores.length} ` + (p ? `cohorts=${p.summary.cohorts} avgM1=${p.summary.avgM1RetentionPct}% ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[cohorts] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
