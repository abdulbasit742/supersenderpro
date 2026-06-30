'use strict';

/**
 * Ecommerce Hub — customer lifetime value (read-only estimate).
 * Uses cached client order counts + an average order value (AOV) assumption
 * (CLV_AOV env, default derived from catalog) to rank buyers by estimated value.
 */

const registry = require('./registry');

async function build() {
  const clients = await registry.allClients();
  const products = await registry.allProducts();
  let aov = Number(process.env.CLV_AOV || 0);
  if (!aov) { const priced = products.filter(function (p) { return p.price != null; }); aov = priced.length ? Math.round(priced.reduce(function (n, p) { return n + p.price; }, 0) / priced.length) : 1500; }
  const ranked = clients.map(function (c) { return { platform: c.platform, name: c.name, contact: c.phoneMasked || c.emailMasked, orders: c.orders || 0, estValue: Math.round((c.orders || 0) * aov) }; })
    .sort(function (a, b) { return b.estValue - a.estValue; });
  return { ok: true, aov: aov, topCustomers: ranked.slice(0, 20), totalEstValue: ranked.reduce(function (n, c) { return n + c.estValue; }, 0) };
}

module.exports = { build };
