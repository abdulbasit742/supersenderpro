'use strict';

/**
 * Ecommerce Hub — customer segmentation (read-only).
 * Classifies buyers into segments from their order history:
 *   new     : exactly 1 order
 *   repeat  : 2..(VIP-1) orders
 *   vip     : >= SEGMENT_VIP_ORDERS orders (default 5)
 *   lapsed  : last order older than SEGMENT_LAPSED_DAYS (default 60)
 * Returns masked client rows tagged with a segment, plus counts. Useful for
 * targeted broadcasts (pass a segment's phones to broadcast).
 */

const registry = require('./registry');

function daysAgo(dateStr) {
  if (!dateStr) return null;
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return null;
  return Math.floor((Date.now() - t) / 864e5);
}

function classify(c) {
  const vipMin = Number(process.env.SEGMENT_VIP_ORDERS || 5);
  const lapsedDays = Number(process.env.SEGMENT_LAPSED_DAYS || 60);
  const orders = c.orders || 0;
  const since = daysAgo(c.lastOrderAt);
  if (since != null && since > lapsedDays) return 'lapsed';
  if (orders >= vipMin) return 'vip';
  if (orders >= 2) return 'repeat';
  if (orders === 1) return 'new';
  return 'unknown';
}

async function build() {
  const clients = await registry.allClients();
  const tagged = clients.map(function (c) { return Object.assign({ segment: classify(c) }, c); });
  const counts = {};
  tagged.forEach(function (c) { counts[c.segment] = (counts[c.segment] || 0) + 1; });
  return { ok: true, counts: counts, clients: tagged };
}

async function summaryReply() {
  const s = await build();
  const lines = Object.keys(s.counts).map(function (k) { return '\u2022 ' + k + ': ' + s.counts[k]; });
  return '\ud83d\udc65 *Customer segments*\n\n' + lines.join('\n');
}

module.exports = { build, classify, summaryReply };
