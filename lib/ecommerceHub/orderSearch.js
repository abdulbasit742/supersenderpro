'use strict';

/**
 * Ecommerce Hub — unified order lookup (read-only).
 * Searches the tracking store + pending COD by order id or buyer phone and
 * returns a combined view (tracking + COD status). For admin !order and buyers.
 */

const trackingStore = require('./trackingStore');
const cod = require('./codStore');

function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function lookup(query) {
  const q = String(query || '').trim();
  if (!q) return { ok: false, error: 'query_required' };

  // order id path
  let track = trackingStore.findByOrderId(q);
  // phone path
  if (!track && normNum(q).length >= 6) track = trackingStore.latestForPhone(q);

  const pending = cod.listPending().filter(function (p) {
    return String(p.orderId).toLowerCase() === q.toLowerCase() || normNum(p.phone) === normNum(q);
  });

  if (!track && !pending.length) return { ok: true, found: false };
  return { ok: true, found: true, tracking: track || null, pendingCod: pending };
}

function reply(query) {
  const r = lookup(query);
  if (!r.ok) return 'Search ke liye order ID ya phone likhein.';
  if (!r.found) return 'Koi order nahi mila "' + query + '" ke liye.';
  const lines = ['\ud83d\udd0d *Order lookup: ' + query + '*'];
  if (r.tracking) {
    lines.push('Order: ' + r.tracking.orderId + ' [' + r.tracking.platform + ']');
    lines.push('Courier: ' + (r.tracking.courier || '-') + ' | Tracking: ' + (r.tracking.trackingId || '-'));
    lines.push('Status: ' + (r.tracking.status || 'shipped'));
  }
  if (r.pendingCod && r.pendingCod.length) lines.push('COD: confirmation pending (' + r.pendingCod.length + ')');
  return lines.join('\n');
}

module.exports = { lookup, reply };
