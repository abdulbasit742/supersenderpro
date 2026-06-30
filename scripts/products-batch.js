#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const products = require('../lib/productAnalytics');
const OUT = path.join(__dirname, '..', 'public', 'products', 'snapshot.json');
function run() { const startedAt = Date.now(); const snapshot = products.buildAllSnapshot(startedAt); const payload = { ...snapshot, meta: { generatedBy: 'products-batch', durationMs: Date.now() - startedAt } }; fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(payload, null, 2)); const p = snapshot.primary; console.log(`[products] ok — stores=${snapshot.stores.length} ` + (p ? `products=${p.summary.products} pareto=${p.summary.paretoProductsFor80Pct} ` : '') + `(${payload.meta.durationMs}ms)`); return payload; }
if (require.main === module) { try { run(); process.exit(0); } catch (e) { console.error('[products] FAILED:', e.message); process.exit(1); } }
module.exports = { run };
