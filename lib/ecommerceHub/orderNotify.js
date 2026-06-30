'use strict';

/**
 * Ecommerce Hub — Order notifications + COD double-confirm (all platforms).
 *
 * Platform-agnostic: takes a NORMALIZED order event (from any platform webhook
 * or poll) and:
 *   1. Notifies the admin/seller on WhatsApp that a new order landed.
 *   2. If it's a COD order, messages the BUYER to double-confirm (reply
 *      haan/confirm = keep, nahi/cancel = cancel) — this cuts RTO.
 *
 * Sending goes through a bound sender (same pattern as the rest of the app);
 * this module never talks to WhatsApp directly. Dry-run safe: if no sender is
 * bound or ORDER_NOTIFY_ENABLED!=true, it returns the would-be messages.
 *
 * Buyer replies are matched in handleBuyerReply() via codStore (keyed by phone).
 */

const cod = require('./codStore');

let _sender = null; // async (toPhone, text) => {}
function bindSender(fn) { _sender = fn; }

function enabled() { return String(process.env.ORDER_NOTIFY_ENABLED || 'false').toLowerCase() === 'true'; }
function codEnabled() { return String(process.env.COD_CONFIRM_ENABLED || 'true').toLowerCase() === 'true'; }
function adminNumbers() {
  return String(process.env.ORDER_NOTIFY_ADMIN_NUMBERS || process.env.DARAZ_ADMIN_NUMBERS || '')
    .split(',').map(cod.normNum).filter(Boolean);
}

async function send(to, text) {
  if (!enabled() || typeof _sender !== 'function') {
    return { sent: false, dryRun: true, to: cod.normNum(to), text: text };
  }
  await _sender(to, text);
  return { sent: true, to: cod.normNum(to), text: text };
}

function money(o) {
  if (o.total == null) return '';
  return ' — ' + (o.currency || 'PKR') + ' ' + o.total;
}

function isCOD(o) {
  const m = String(o.paymentMethod || o.payment || '').toLowerCase();
  return o.cod === true || m.indexOf('cod') !== -1 || m.indexOf('cash') !== -1;
}

function adminMsg(o) {
  const lines = [
    '\ud83d\udce6 *New order* [' + o.platform + ']',
    'Order: ' + o.orderId + money(o),
    o.buyerName ? ('Buyer: ' + o.buyerName) : null,
    o.itemsText ? ('Items: ' + o.itemsText) : null,
    isCOD(o) ? 'Payment: COD (buyer confirm bheja gaya)' : ('Payment: ' + (o.paymentMethod || 'prepaid'))
  ].filter(Boolean);
  return lines.join('\n');
}

function buyerCodMsg(o) {
  return [
    'Assalam o Alaikum' + (o.buyerName ? ' ' + o.buyerName : '') + '!',
    'Aapka order *' + o.orderId + '*' + money(o) + ' (Cash on Delivery) mila hai.',
    'Confirm karne ke liye *HAAN* likhein, cancel ke liye *NAHI*.'
  ].join('\n');
}

/**
 * processOrder(order) — order is the normalized shape:
 *   { platform, orderId, buyerName, buyerPhone, total, currency,
 *     paymentMethod|cod, itemsText, createdAt }
 * Dedupes via codStore.seen. Returns what was (or would be) sent.
 */
async function processOrder(order) {
  const o = order || {};
  if (!o.platform || !o.orderId) return { ok: false, error: 'platform_and_orderId_required' };
  if (cod.isSeen(o.platform, o.orderId)) return { ok: true, skipped: 'already_seen' };
  cod.markSeen(o.platform, o.orderId);

  const results = { ok: true, platform: o.platform, orderId: o.orderId, admin: [], buyer: null };

  // 1) notify admins
  const admins = adminNumbers();
  for (const a of admins) {
    results.admin.push(await send(a, adminMsg(o)));
  }

  // 2) COD double-confirm to buyer
  if (codEnabled() && isCOD(o) && o.buyerPhone) {
    cod.setPending(o.buyerPhone, { platform: o.platform, orderId: o.orderId, total: o.total, currency: o.currency });
    results.buyer = await send(o.buyerPhone, buyerCodMsg(o));
  }
  return results;
}

function yes(t) { return /^(haan|han|haa|yes|y|confirm|ok|okay|theek|sahi)\b/i.test(t); }
function no(t) { return /^(nahi|nai|na|no|n|cancel|mat)\b/i.test(t); }

/**
 * handleBuyerReply(text, fromPhone) — if this buyer has a pending COD, interpret
 * their reply. Returns a reply string, or null if no pending COD for them.
 */
async function handleBuyerReply(text, fromPhone) {
  const pending = cod.getPending(fromPhone);
  if (!pending) return null;
  const t = String(text || '').trim();

  if (yes(t)) {
    cod.clearPending(fromPhone);
    return '\u2705 Shukriya! Aapka order *' + pending.orderId + '* confirm ho gaya. Jald deliver hoga.';
  }
  if (no(t)) {
    cod.clearPending(fromPhone);
    return '\u274c Theek hai, order *' + pending.orderId + '* cancel kar diya gaya. Dobara order karein toh hum yahin hain.';
  }
  return 'Order *' + pending.orderId + '* confirm karne ke liye *HAAN*, cancel ke liye *NAHI* likhein.';
}

module.exports = { bindSender, processOrder, handleBuyerReply, adminMsg, buyerCodMsg, isCOD, enabled };
