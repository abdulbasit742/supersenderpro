'use strict';

/**
 * Ecommerce Hub — WhatsApp catalog image cards.
 * Builds rich image-card payloads (image URL + caption + buy link) for products
 * so your sender can post pictures instead of plain text. Returns a neutral
 * shape; your WhatsApp layer maps it to whatever the transport supports.
 * Read-only; pulls from the cached product store.
 */

const productStore = require('./productStore');

function caption(p) {
  const price = p.price != null ? (p.currency + ' ' + p.price) : 'price on request';
  let cap = '*' + p.title + '*\n' + price;
  if (p.stock === 0) cap += '\n(out of stock)';
  else if (p.stock != null) cap += '\n' + p.stock + ' in stock';
  cap += '\nID: ' + p.id + ' [' + p.platform + ']';
  if (p.url) cap += '\nBuy: ' + p.url;
  cap += '\n\nOrder: reply *!product ' + p.id + '*';
  return cap;
}

// cardsFor(filter) -> array of { type:'image', image, caption, productId, platform }
function cardsFor(opts) {
  opts = opts || {};
  let products = productStore.getProducts();
  if (opts.platform) products = products.filter(function (p) { return p.platform === opts.platform; });
  if (opts.inStockOnly) products = products.filter(function (p) { return p.stock == null || p.stock > 0; });
  const limit = Number(opts.limit || 10);
  return products.slice(0, limit).map(function (p) {
    return { type: 'image', image: p.image || null, caption: caption(p), productId: p.id, platform: p.platform, hasImage: !!p.image };
  });
}

function cardFor(productId) {
  const p = productStore.findProduct(productId);
  if (!p) return null;
  return { type: 'image', image: p.image || null, caption: caption(p), productId: p.id, platform: p.platform, hasImage: !!p.image };
}

module.exports = { cardsFor, cardFor, caption };
