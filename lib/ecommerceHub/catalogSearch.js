'use strict';

/**
 * Ecommerce Hub — catalog search (read-only).
 * Fuzzy-ish keyword search across cached products (title + id). !find <query>.
 */

const productStore = require('./productStore');

function search(query, limit) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/);
  const all = productStore.getProducts();
  const scored = all.map(function (p) {
    const hay = (String(p.title || '') + ' ' + String(p.id || '')).toLowerCase();
    let score = 0;
    terms.forEach(function (t) { if (hay.indexOf(t) !== -1) score++; });
    return { p: p, score: score };
  }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; });
  return scored.slice(0, Number(limit || 8)).map(function (x) { return x.p; });
}
function reply(query) {
  const res = search(query, 8);
  if (!res.length) return 'Kuch nahi mila "' + query + '" ke liye. *!shop* se browse karein.';
  const lines = res.map(function (p) { return '\u2022 [' + p.platform + '] ' + p.id + ' \u2014 ' + p.title + ' \u2014 ' + (p.price != null ? (p.currency + ' ' + p.price) : 'n/a'); });
  return '\ud83d\udd0d *Search: ' + query + '*\n\n' + lines.join('\n') + '\n\n*!product <id>* for details.';
}

module.exports = { search, reply };
