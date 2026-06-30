'use strict';

/**
 * Ecommerce Hub — analytics summary (read-only, across platforms).
 * Aggregates live/sample products + clients into a quick business snapshot:
 * total products, out-of-stock, catalog value, total recent orders, orders by
 * platform, pending COD count, and top products by price. Used by !stats and
 * a REST endpoint. Pure read; nothing is written to any platform.
 */

const registry = require('./registry');
const cod = require('./codStore');

async function snapshot() {
  const products = await registry.allProducts();
  const clients = await registry.allClients();

  const outOfStock = products.filter(function (p) { return p.stock === 0; }).length;
  const catalogValue = products.reduce(function (n, p) { return n + (p.price || 0) * (p.stock != null ? p.stock : 0); }, 0);
  const totalOrders = clients.reduce(function (n, c) { return n + (c.orders || 0); }, 0);

  const byPlatform = {};
  products.forEach(function (p) { byPlatform[p.platform] = byPlatform[p.platform] || { products: 0, orders: 0 }; byPlatform[p.platform].products++; });
  clients.forEach(function (c) { byPlatform[c.platform] = byPlatform[c.platform] || { products: 0, orders: 0 }; byPlatform[c.platform].orders += (c.orders || 0); });

  const topProducts = products.slice().filter(function (p) { return p.price != null; })
    .sort(function (a, b) { return b.price - a.price; }).slice(0, 5)
    .map(function (p) { return { platform: p.platform, id: p.id, title: p.title, price: p.price, currency: p.currency }; });

  return {
    products: products.length,
    outOfStock: outOfStock,
    catalogValue: Math.round(catalogValue),
    totalOrders: totalOrders,
    pendingCod: cod.listPending().length,
    byPlatform: byPlatform,
    topProducts: topProducts
  };
}

async function statsReply() {
  const s = await snapshot();
  const plat = Object.keys(s.byPlatform).map(function (k) {
    const v = s.byPlatform[k]; return '\u2022 ' + k + ': ' + v.products + ' products, ' + v.orders + ' orders';
  });
  const top = s.topProducts.map(function (p) { return '\u2022 [' + p.platform + '] ' + p.title + ' \u2014 ' + p.currency + ' ' + p.price; });
  return [
    '\ud83d\udcc8 *Business snapshot*',
    'Products: ' + s.products + ' (out of stock: ' + s.outOfStock + ')',
    'Catalog value: PKR ' + s.catalogValue,
    'Recent orders: ' + s.totalOrders,
    'Pending COD: ' + s.pendingCod,
    '', 'By platform:', plat.join('\n'),
    '', 'Top products:', top.join('\n')
  ].join('\n');
}

module.exports = { snapshot, statsReply };
