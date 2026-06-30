'use strict';
// #83 Product Catalog & Variants — self-diagnostic.
const config = require('./config');
const store = require('./store');

function check() {
  const ok = [], issues = [];
  ok.push('currency=' + config.currency);
  ok.push(config.uniqueSku ? 'unique SKU enforced' : 'duplicate SKU allowed');
  let db; try { db = store.load(); ok.push('store readable'); } catch (e) { issues.push('store unreadable: ' + e.message); }
  const products = db ? store.list(db) : [];
  const variants = products.reduce((n, p) => n + (p.variants ? p.variants.length : 0), 0);
  // Detect duplicate SKUs (data integrity).
  const skus = {};
  let dupes = 0;
  products.forEach(p => { [p.sku, ...(p.variants || []).map(v => v.sku)].forEach(s => { if (s) { skus[s] = (skus[s] || 0) + 1; if (skus[s] === 2) dupes++; } }); });
  if (dupes > 0) issues.push(dupes + ' duplicate SKU(s) found');
  else ok.push('no duplicate SKUs');
  return { dept: 'catalog', enabled: config.enabled, ok, issues, stats: { products: products.length, variants }, healthy: issues.length === 0 };
}
module.exports = { check };
