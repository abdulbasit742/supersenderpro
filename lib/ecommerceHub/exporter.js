'use strict';

/**
 * Ecommerce Hub — CSV exporter (read-only).
 * Builds CSV strings for products + clients (masked) across platforms, for
 * accounting, ad audiences, or backups. Never writes to any platform.
 */

const registry = require('./registry');

function csvCell(v) {
  if (v == null) return '';
  const s = String(v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCsv(headers, rows) {
  const head = headers.map(csvCell).join(',');
  const body = rows.map(function (r) { return headers.map(function (h) { return csvCell(r[h]); }).join(','); }).join('\n');
  return head + '\n' + body + '\n';
}

async function productsCsv() {
  const products = await registry.allProducts();
  return toCsv(['platform', 'id', 'title', 'price', 'currency', 'stock', 'url'], products);
}
async function clientsCsv() {
  const clients = await registry.allClients();
  // already masked by connectorBase.normalizeClient
  return toCsv(['platform', 'id', 'name', 'phoneMasked', 'emailMasked', 'orders', 'lastOrderAt'], clients);
}

module.exports = { productsCsv, clientsCsv, toCsv };
