'use strict';

/**
 * Ecommerce Hub — low-stock alerts + daily sales digest (admin).
 * lowStockScan(): pull products across all live adapters, alert admin for any
 *   stock <= LOW_STOCK_THRESHOLD. dailyDigest(): summarize orders seen today.
 * Dry-run safe via orderNotify.send.
 */

const registry = require('./registry');
const notify = require('./orderNotify');
const cod = require('./codStore');

function adminNumbers() {
  return String(process.env.ORDER_NOTIFY_ADMIN_NUMBERS || process.env.DARAZ_ADMIN_NUMBERS || '')
    .split(',').map(cod.normNum).filter(Boolean);
}

async function sendAdmins(text) {
  const out = [];
  for (const a of adminNumbers()) out.push(await notify.send(a, text));
  return out;
}

async function lowStockScan() {
  const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 5);
  const products = await registry.allProducts();
  const low = products.filter(function (p) { return p.stock != null && p.stock <= threshold; });
  if (!low.length) return { ok: true, low: 0, notified: [] };
  const lines = low.slice(0, 30).map(function (p) {
    return '\u2022 [' + p.platform + '] ' + p.id + ' \u2014 ' + p.title + ' \u2014 ' + (p.stock === 0 ? 'OUT' : p.stock + ' left');
  });
  const msg = '\u26a0\ufe0f *Low stock* (\u2264' + threshold + ')\n\n' + lines.join('\n');
  const notified = await sendAdmins(msg);
  return { ok: true, low: low.length, notified: notified };
}

async function dailyDigest() {
  // Uses orders cached as clients across platforms + pending COD count.
  const clients = await registry.allClients();
  const totalOrders = clients.reduce(function (n, c) { return n + (c.orders || 0); }, 0);
  const pendingCod = cod.listPending().length;
  const byPlatform = {};
  clients.forEach(function (c) { byPlatform[c.platform] = (byPlatform[c.platform] || 0) + (c.orders || 0); });
  const lines = Object.keys(byPlatform).map(function (p) { return '\u2022 ' + p + ': ' + byPlatform[p] + ' orders'; });
  const msg = [
    '\ud83d\udcca *Daily digest*',
    'Total orders (recent): ' + totalOrders,
    'Pending COD confirmations: ' + pendingCod,
    '', 'By platform:', lines.join('\n')
  ].join('\n');
  const notified = await sendAdmins(msg);
  return { ok: true, totalOrders: totalOrders, pendingCod: pendingCod, notified: notified };
}

module.exports = { lowStockScan, dailyDigest };
