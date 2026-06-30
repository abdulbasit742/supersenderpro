'use strict';

/**
 * Ecommerce Hub — sales report (read-only) from local order signals.
 * Aggregates tracking records + pending COD + client order counts into a simple
 * report: orders by platform, COD vs prepaid pending, top buyers. Date-agnostic
 * snapshot (full live history would need platform order APIs per range).
 */

const trackingStore = require('./trackingStore');
const cod = require('./codStore');
const registry = require('./registry');

async function build() {
  const tracking = trackingStore.list();
  const pendingCod = cod.listPending();
  const clients = await registry.allClients();

  const byPlatform = {};
  tracking.forEach(function (t) { byPlatform[t.platform] = byPlatform[t.platform] || { shipped: 0 }; byPlatform[t.platform].shipped++; });
  const totalOrders = clients.reduce(function (n, c) { return n + (c.orders || 0); }, 0);
  const topBuyers = clients.slice().sort(function (a, b) { return (b.orders || 0) - (a.orders || 0); }).slice(0, 10)
    .map(function (c) { return { platform: c.platform, name: c.name, contact: c.phoneMasked || c.emailMasked, orders: c.orders || 0 }; });

  return { ok: true, totalRecentOrders: totalOrders, shippedTracked: tracking.length, pendingCod: pendingCod.length, byPlatform: byPlatform, topBuyers: topBuyers };
}

module.exports = { build };
