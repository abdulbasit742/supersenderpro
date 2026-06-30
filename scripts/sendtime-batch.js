#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const sendTime = require('../lib/sendTime');
const OUT = path.join(__dirname, '..', 'public', 'send-time', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = sendTime.buildAllSnapshot(startedAt); const payload = { ...snapshot, meta: { generatedBy: 'sendtime-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[sendtime] ok — stores=${snapshot.stores.length} ` + (p ? `events=${p.summary.totalEvents} best=${p.summary.bestWindow} ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[sendtime] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
