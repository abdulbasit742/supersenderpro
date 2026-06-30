'use strict';

/**
 * Ecommerce Hub — personalized-ish recommendations (read-only).
 * Without per-user history we recommend by popularity proxy (in-stock + priced)
 * and optional same-platform affinity to a seed product. !recommend.
 */

const productStore = require('./productStore');

function top(limit, platform) {
  let all = productStore.getProducts().filter(function (p) { return p.stock == null || p.stock > 0; });
  if (platform) all = all.filter(function (p) { return p.platform === platform; });
  // proxy score: priced + has stock + has image
  return all.map(function (p) { let s = 0; if (p.price != null) s += 1; if (p.stock) s += Math.min(3, Math.log10((p.stock || 1) + 1)); if (p.image) s += 0.5; return { p: p, s: s }; })
    .sort(function (a, b) { return b.s - a.s; }).slice(0, Number(limit || 5)).map(function (x) { return x.p; });
}
function reply() {
  const r = top(5);
  if (!r.length) return 'Abhi koi recommendation nahi.';
  const lines = r.map(function (p) { return '\u2022 ' + p.title + ' \u2014 ' + (p.price != null ? (p.currency + ' ' + p.price) : 'n/a') + ' (!product ' + p.id + ')'; });
  return '\u2728 *Aapke liye tajweez:*\n\n' + lines.join('\n');
}

module.exports = { top, reply };
