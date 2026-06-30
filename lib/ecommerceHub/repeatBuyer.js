'use strict';

/**
 * Ecommerce Hub — repeat-buyer detector (read-only).
 * From cached clients, flag buyers with >= REPEAT_MIN orders so you can VIP-tag
 * or target them. Quick list for marketing.
 */

const registry = require('./registry');
async function build() {
  const clients = await registry.allClients();
  const min = Number(process.env.REPEAT_MIN || 2);
  const repeat = clients.filter(function (c) { return (c.orders || 0) >= min; })
    .sort(function (a, b) { return (b.orders || 0) - (a.orders || 0); })
    .map(function (c) { return { platform: c.platform, name: c.name, contact: c.phoneMasked || c.emailMasked, orders: c.orders }; });
  return { ok: true, min: min, repeatBuyers: repeat.length, list: repeat.slice(0, 50) };
}
module.exports = { build };
