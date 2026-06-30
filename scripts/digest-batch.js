#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const digest = require('../lib/insightsDigest');
const exporter = require('../lib/insightsDigest/reportExporter');
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'digest', 'digest.json');
const REPORT_DIR = path.join(ROOT, 'public', 'digest', 'reports');
function run() { const startedAt = Date.now(); const all = digest.buildAllDigest(startedAt); const payload = { ...all, meta: { generatedBy: 'digest-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); fs.mkdirSync(REPORT_DIR, { recursive: true }); for (const d of all.perStore) fs.writeFileSync(path.join(REPORT_DIR, `${d.storeId}.html`), exporter.toHTML(d)); const p = all.primary; console.log(`[digest] ok — stores=${all.stores.length} ` + (p ? `modules=${p.modulesAvailable}/${p.modulesTotal} actions=${p.actions.length} ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[digest] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
