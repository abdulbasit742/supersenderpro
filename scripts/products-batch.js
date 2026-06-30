#!/usr/bin/env node
// scripts/products-batch.js
// Overnight product/SKU performance — runs on PC #2. Walks every store's order
// history, ranks products, and writes a static snapshot the dashboard reads.
//
// Schedule on PC #2:
//   18 3 * * *  cd /path/to/supersenderpro && node scripts/products-batch.js

const fs = require('fs');
const path = require('path');
const products = require('../lib/productAnalytics');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'public', 'products', 'snapshot.json');

function run() {
  const startedAt = Date.now();
  const snapshot = products.buildAllSnapshot(startedAt);
  const payload = { ...snapshot, meta: { generatedBy: 'products-batch', durationMs: Date.now() - startedAt } };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  const p = snapshot.primary;
  console.log(
    `[products] ok — stores=${snapshot.stores.length} ` +
      (p ? `products=${p.summary.products} revenue=${p.summary.totalRevenue} pareto=${p.summary.paretoProductsFor80Pct} ` : '') +
      `(${payload.meta.durationMs}ms)`
  );
  return payload;
}

if (require.main === module) {
  try { run(); process.exit(0); }
  catch (e) { console.error('[products] FAILED:', e.message); process.exit(1); }
}

module.exports = { run };
