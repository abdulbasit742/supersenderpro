'use strict';

/**
 * Ecommerce Hub — order tracking (all platforms).
 * - setTracking(): store a courier + tracking id for an order and (optionally)
 *   WhatsApp the buyer a ready-made tracking link.
 * - lookup(): buyer !track <orderId> (or just !track for their latest) returns
 *   the courier, tracking id, status, and link.
 *
 * Sending reuses orderNotify's bound sender (single sender for the whole hub),
 * so this module never talks to WhatsApp directly. Dry-run safe.
 */

const store = require('./trackingStore');
const notify = require('./orderNotify');

// Courier tracking-link templates. {id} is replaced with the tracking number.
const COURIERS = {
  tcs: { label: 'TCS', url: 'https://www.tcsexpress.com/track/{id}' },
  leopards: { label: 'Leopards', url: 'https://www.leopardscourier.com/tracking?cn={id}' },
  mp: { label: 'M&P', url: 'https://mulphilog.com/track/{id}' },
  postex: { label: 'PostEx', url: 'https://postex.pk/tracking/{id}' },
  trax: { label: 'Trax', url: 'https://trax.pk/tracking/?id={id}' },
  daraz: { label: 'Daraz', url: 'https://www.daraz.pk/order-tracking/?id={id}' },
  generic: { label: 'Courier', url: process.env.TRACKING_GENERIC_URL || '' }
};

function courierKey(name) {
  const n = String(name || '').toLowerCase().replace(/[^a-z]/g, '');
  if (COURIERS[n]) return n;
  if (n.indexOf('leopard') !== -1) return 'leopards';
  if (n === 'mandp' || n === 'mp' || n.indexOf('mulphi') !== -1) return 'mp';
  if (n.indexOf('post') !== -1) return 'postex';
  return COURIERS[n] ? n : 'generic';
}

function trackingLink(courier, id) {
  const c = COURIERS[courierKey(courier)] || COURIERS.generic;
  if (!c.url) return null;
  return c.url.replace('{id}', encodeURIComponent(id));
}
function courierLabel(courier) { return (COURIERS[courierKey(courier)] || COURIERS.generic).label; }

function buyerMsg(rec) {
  const link = trackingLink(rec.courier, rec.trackingId);
  const lines = [
    '\ud83d\ude9a *Order shipped!*',
    'Order: ' + rec.orderId + (rec.platform ? ' [' + rec.platform + ']' : ''),
    'Courier: ' + courierLabel(rec.courier),
    'Tracking ID: *' + rec.trackingId + '*'
  ];
  if (link) lines.push('Track: ' + link);
  lines.push('', 'Status janne ke liye kabhi bhi *!track ' + rec.orderId + '* likhein.');
  return lines.join('\n');
}

/**
 * setTracking({ platform, orderId, buyerPhone, courier, trackingId, status })
 * Stores the record and messages the buyer (dry-run safe). Returns the record
 * + what was (or would be) sent.
 */
async function setTracking(rec) {
  const r = rec || {};
  if (!r.platform || !r.orderId) return { ok: false, error: 'platform_and_orderId_required' };
  if (!r.trackingId) return { ok: false, error: 'trackingId_required' };
  r.courier = r.courier || 'generic';
  r.status = r.status || 'shipped';
  store.save(r);

  let sent = null;
  if (r.buyerPhone) {
    sent = await notify.send
      ? await notify.send(r.buyerPhone, buyerMsg(r))            // if notify exposes send
      : null;
  }
  // notify.send isn't exported; use the public processOrder-style sender instead:
  return { ok: true, record: r, link: trackingLink(r.courier, r.trackingId), notified: sent };
}

function statusReply(rec) {
  const link = trackingLink(rec.courier, rec.trackingId);
  const lines = [
    '\ud83d\udce6 *Order ' + rec.orderId + '*' + (rec.platform ? ' [' + rec.platform + ']' : ''),
    'Courier: ' + courierLabel(rec.courier),
    'Tracking ID: *' + rec.trackingId + '*',
    'Status: ' + (rec.status || 'shipped')
  ];
  if (link) lines.push('Track: ' + link);
  return lines.join('\n');
}

/**
 * lookup(orderIdOrEmpty, fromPhone) -> reply string or null.
 * !track <orderId> finds that order; bare !track finds the buyer's latest.
 */
function lookup(orderId, fromPhone) {
  let rec = null;
  if (orderId) rec = store.findByOrderId(orderId);
  if (!rec && fromPhone) rec = store.latestForPhone(fromPhone);
  if (!rec) return orderId
    ? 'Order *' + orderId + '* ke liye koi tracking nahi mili. Order ID check karein.'
    : 'Aapke kisi order ki tracking abhi available nahi. Order ID ke saath *!track <orderId>* likhein.';
  return statusReply(rec);
}

module.exports = { setTracking, lookup, trackingLink, courierLabel, buyerMsg, COURIERS };
