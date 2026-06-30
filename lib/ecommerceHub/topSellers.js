'use strict';

/**
 * Ecommerce Hub — top sellers (proxy, read-only).
 * Without per-line sales we proxy "sellers" by low-stock priced items (likely
 * moving) + wishlist demand. Useful for a quick !bestsellers view.
 */

const productStore = require('./productStore');
let wishlist = null; try { wishlist = require('./wishlist'); } catch (_e) {}

function build(limit) {
  const all = productStore.getProducts().filter(function (p) { return p.price != null; });
  const wished = wishlist ? wishlist.allWishedIds() : [];
  const scored = all.map(function (p) {
    let s = 0;
    if (p.stock != null && p.stock <= 10) s += 2;        // low stock = moving
    if (wished.indexOf(String(p.id)) !== -1) s += 3;     // demand signal
    return { p: p, s: s };
  }).sort(function (a, b) { return b.s - a.s; });
  return scored.slice(0, Number(limit || 8)).map(function (x) { return x.p; });
}
function reply() {
  const r = build(8);
  if (!r.length) return 'Abhi data kam hai.';
  const lines = r.map(function (p) { return '\u2022 ' + p.title + ' \u2014 ' + (p.currency + ' ' + p.price); });
  return '\ud83d\udd25 *Best sellers:*\n\n' + lines.join('\n');
}

module.exports = { build, reply };
