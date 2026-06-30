'use strict';

/**
 * Ecommerce Hub — unified inventory view across all platforms (read-only).
 * Groups products by a normalized title/sku key so you can see the same item's
 * stock across Daraz/Shopify/Woo/etc. in one row, and spot mismatches.
 */

const registry = require('./registry');

function normKey(p) { return String(p.id || p.title || '').toLowerCase().replace(/\s+/g, ''); }

async function build() {
  const products = await registry.allProducts();
  const groups = {};
  products.forEach(function (p) {
    const k = normKey(p);
    groups[k] = groups[k] || { key: k, title: p.title, platforms: {}, totalStock: 0 };
    groups[k].platforms[p.platform] = { id: p.id, stock: p.stock, price: p.price };
    if (p.stock != null) groups[k].totalStock += Number(p.stock);
  });
  const rows = Object.keys(groups).map(function (k) { return groups[k]; });
  const mismatches = rows.filter(function (r) { return Object.keys(r.platforms).length > 1; });
  return { ok: true, items: rows.length, multiPlatform: mismatches.length, rows: rows };
}

module.exports = { build };
