#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const geo = require('../lib/geoAnalytics');
const OUT = path.join(__dirname, '..', 'public', 'geo', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = geo.buildAllSnapshot(startedAt); const payload = { ...snapshot, meta: { generatedBy: 'geo-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[geo] ok — stores=${snapshot.stores.length} ` + (p ? `cities=${p.summary.cities} top=${p.summary.topCity} ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[geo] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
