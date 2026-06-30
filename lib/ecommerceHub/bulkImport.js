'use strict';

/**
 * Ecommerce Hub — bulk product CSV import into the local product cache.
 * Parses a CSV string (platform,id,title,price,currency,stock,url) and merges
 * into productStore so manually-listed items show alongside platform catalogs.
 * Local cache only; never writes to any platform.
 */

const productStore = require('./productStore');

function parseCsv(text) {
  const lines = String(text || '').split(/\r?\n/).filter(function (l) { return l.trim() !== ''; });
  if (!lines.length) return [];
  const headers = splitRow(lines[0]).map(function (h) { return h.trim().toLowerCase(); });
  return lines.slice(1).map(function (line) {
    const cells = splitRow(line);
    const row = {};
    headers.forEach(function (h, i) { row[h] = cells[i] != null ? cells[i].trim() : ''; });
    return row;
  });
}
function splitRow(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { if (q && line[i + 1] === '"') { cur += '"'; i++; } else q = !q; }
    else if (ch === ',' && !q) { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur); return out;
}

function importCsv(text) {
  const rows = parseCsv(text);
  if (!rows.length) return { ok: false, error: 'empty_or_bad_csv' };
  const existing = productStore.getProducts();
  const byKey = {};
  existing.forEach(function (p) { byKey[p.platform + ':' + p.id] = p; });
  let added = 0, updated = 0;
  rows.forEach(function (r) {
    const platform = r.platform || 'manual';
    const id = r.id || r.sku;
    if (!id) return;
    const rec = { platform: platform, id: String(id), title: r.title || 'Untitled', price: r.price ? Number(r.price) : null, currency: r.currency || 'PKR', stock: r.stock ? Number(r.stock) : null, url: r.url || null, image: r.image || null };
    const k = platform + ':' + id;
    if (byKey[k]) updated++; else added++;
    byKey[k] = rec;
  });
  const merged = Object.keys(byKey).map(function (k) { return byKey[k]; });
  productStore.saveProducts(merged);
  return { ok: true, added: added, updated: updated, total: merged.length };
}

module.exports = { importCsv, parseCsv };
