'use strict';

/**
 * Ecommerce Hub — simple upsell / cross-sell bundles.
 * Suggests complementary products (same platform, price-adjacent) for a given
 * product, or a general "frequently grabbed together" list. Pure read from cache.
 * !bundle <productId> on WhatsApp.
 */

const productStore = require('./productStore');

function suggestFor(productId, limit) {
  const p = productStore.findProduct(productId);
  const all = productStore.getProducts();
  if (!p) return { ok: false, error: 'not_found' };
  const lim = Number(limit || 3);
  const others = all.filter(function (x) { return x.id !== p.id && x.stock !== 0; });
  // rank by same-platform + closest price
  const ranked = others.map(function (x) {
    let score = 0;
    if (x.platform === p.platform) score += 2;
    if (p.price != null && x.price != null) score += Math.max(0, 3 - Math.abs(x.price - p.price) / Math.max(1, p.price));
    return { x: x, score: score };
  }).sort(function (a, b) { return b.score - a.score; }).slice(0, lim).map(function (r) { return r.x; });
  return { ok: true, base: p, suggestions: ranked };
}

function reply(productId) {
  const r = suggestFor(productId, 3);
  if (!r.ok) return 'Product nahi mila. *!shop* se ID lein.';
  if (!r.suggestions.length) return 'Abhi koi suggestion nahi.';
  const lines = r.suggestions.map(function (x) { return '\u2022 ' + x.title + ' \u2014 ' + (x.price != null ? (x.currency + ' ' + x.price) : 'n/a') + ' (!product ' + x.id + ')'; });
  return '\ud83e\udde9 *' + r.base.title + ' ke saath ye bhi:*\n\n' + lines.join('\n');
}

module.exports = { suggestFor, reply };
