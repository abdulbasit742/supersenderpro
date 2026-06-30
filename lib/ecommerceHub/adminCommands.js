'use strict';

/**
 * Ecommerce Hub — WhatsApp ADMIN commands (write + ops path).
 * Separate from waCommands.js (customer-facing, read-only).
 *
 * Gating (all must pass before any admin action):
 *   1. ECOMMERCE_HUB_ADMIN_WRITE=true
 *   2. sender number is in DARAZ_ADMIN_NUMBERS (comma-separated)
 * In dry-run, sends/writes are simulated (safe to test without keys).
 *
 * Commands (admin only):
 *   !setstock <sellerSku> <qty>          -> update Daraz stock
 *   !setprice <sellerSku> <price>        -> update Daraz price
 *   !settrack <orderId> <courier> <id>   -> set tracking + WhatsApp the buyer
 *   !lowstock                            -> low-stock alert scan now
 *   !digest                              -> daily sales digest now
 *   !broadcast <message>                 -> message all past buyers (opt-out safe)
 *   !coupon <percent> [CODE]             -> issue a discount code
 *   !remind                              -> send reorder reminders
 *   !sync                                -> refresh catalog/clients cache
 *   !adminhelp                           -> list admin commands
 */

const registry = require('./registry');
const wa = require('./waCommands');
const tracking = require('./tracking');
const trackingStore = require('./trackingStore');
const notify = require('./orderNotify');
const alerts = require('./alerts');
const coupons = require('./coupons');
const broadcast = require('./broadcast');
const reorder = require('./reorder');

function adminEnabled() { return String(process.env.ECOMMERCE_HUB_ADMIN_WRITE || 'false').toLowerCase() === 'true'; }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function isAdmin(fromNumber) {
  const list = String(process.env.DARAZ_ADMIN_NUMBERS || '').split(',').map(normNum).filter(Boolean);
  const me = normNum(fromNumber);
  return me.length > 0 && list.indexOf(me) !== -1;
}

function help() {
  return [
    '\ud83d\udd10 *Admin commands*',
    '!setstock <sku> <qty>  — Daraz stock update',
    '!setprice <sku> <price>  — Daraz price update',
    '!settrack <orderId> <courier> <trackingId>  — tracking + buyer notify',
    '!lowstock  — low-stock alert scan',
    '!digest  — daily sales digest',
    '!broadcast <message>  — past buyers ko message (opt-out safe)',
    '!coupon <percent> [CODE]  — discount code banayein',
    '!remind  — reorder reminders bhejein',
    '!sync  — catalog + clients refresh',
    '',
    'Customers: !shop, !product <id>, !orders, !track <orderId>, !coupon'
  ].join('\n');
}

async function setStock(sku, qtyRaw) {
  const daraz = registry.get('daraz');
  if (!daraz || typeof daraz.updatePriceQuantity !== 'function') return 'Daraz write not available.';
  const qty = parseInt(qtyRaw, 10);
  if (!sku || isNaN(qty) || qty < 0) return 'Usage: !setstock <sku> <qty>';
  const r = await daraz.updatePriceQuantity(sku, { quantity: qty });
  if (r.dryRun) return '\u2705 (dry-run) ' + sku + ' stock → ' + qty + '. Live: DARAZ_LIVE=true + DRY_RUN=false.';
  return '\u2705 Daraz stock updated: ' + sku + ' → ' + qty;
}

async function setPrice(sku, priceRaw) {
  const daraz = registry.get('daraz');
  if (!daraz || typeof daraz.updatePriceQuantity !== 'function') return 'Daraz write not available.';
  const price = Number(priceRaw);
  if (!sku || isNaN(price) || price <= 0) return 'Usage: !setprice <sku> <price>';
  const r = await daraz.updatePriceQuantity(sku, { price: price });
  if (r.dryRun) return '\u2705 (dry-run) ' + sku + ' price → ' + price + '. Live: DARAZ_LIVE=true + DRY_RUN=false.';
  return '\u2705 Daraz price updated: ' + sku + ' → ' + price;
}

async function setTrack(parts) {
  const orderId = parts[1], courier = parts[2], trackingId = parts[3], platform = parts[4] || 'daraz';
  if (!orderId || !courier || !trackingId) return 'Usage: !settrack <orderId> <courier> <trackingId> [platform]';
  const existing = trackingStore.findByOrderId(orderId);
  const buyerPhone = existing && existing.buyerPhone ? existing.buyerPhone : null;
  const saved = await tracking.setTracking({ platform: platform, orderId: orderId, courier: courier, trackingId: trackingId, buyerPhone: buyerPhone, status: 'shipped' });
  if (!saved.ok) return 'Tracking set nahi hui: ' + (saved.error || 'unknown');
  let note = '';
  if (buyerPhone) { const sent = await notify.send(buyerPhone, tracking.buyerMsg({ platform: platform, orderId: orderId, courier: courier, trackingId: trackingId })); note = sent && sent.dryRun ? ' (buyer notify dry-run)' : ' Buyer notified.'; }
  else { note = ' (buyer phone record mein nahi, sirf save kiya).'; }
  const link = saved.link ? ('\nTrack: ' + saved.link) : '';
  return '\u2705 Tracking set: ' + orderId + ' → ' + tracking.courierLabel(courier) + ' ' + trackingId + '.' + note + link;
}

async function doBroadcast(t) {
  const msg = t.replace(/^!broadcast\s*/i, '').trim();
  if (!msg) return 'Usage: !broadcast <message>';
  const r = await broadcast.send(msg, {});
  return '\ud83d\udce3 Broadcast: ' + r.sent + ' bheje, ' + r.skippedOptOut + ' opt-out skip' + (r.sent && r.details[0] && r.details[0].notified && r.details[0].notified.dryRun ? ' (dry-run).' : '.');
}

function doCoupon(parts) {
  const pct = Number(parts[1]);
  if (isNaN(pct) || pct <= 0) return 'Usage: !coupon <percent> [CODE]';
  const rec = coupons.issue({ type: 'percent', value: pct, code: parts[2] || null });
  return '\ud83c\udf81 Coupon banaya: ' + coupons.describe(rec) + '. Customers !coupon likh ke le sakte hain.';
}

async function handle(text, fromNumber) {
  const t = String(text || '').trim();
  const lower = t.toLowerCase();
  const parts = t.split(/\s+/);

  const isAdminCmd = ['!setstock','!setprice','!settrack','!lowstock','!digest','!broadcast','!coupon','!remind','!sync','!adminhelp']
    .some(function (c) { return lower === c || lower.indexOf(c + ' ') === 0; });
  if (!isAdminCmd) return null;

  if (!adminEnabled()) return 'Admin control disabled.';
  if (!isAdmin(fromNumber)) return '\u26d4 Not authorised. Yeh command sirf admin number se chalti hai.';

  if (lower === '!adminhelp') return help();
  if (lower === '!sync') { const r = await wa.refreshCache(); return '\ud83d\udd04 Synced: ' + r.products + ' products, ' + r.clients + ' clients.'; }
  if (lower.indexOf('!setstock') === 0) return setStock(parts[1], parts[2]);
  if (lower.indexOf('!setprice') === 0) return setPrice(parts[1], parts[2]);
  if (lower.indexOf('!settrack') === 0) return setTrack(parts);
  if (lower === '!lowstock') { const r = await alerts.lowStockScan(); return '\u26a0\ufe0f Low-stock scan: ' + r.low + ' items flagged.'; }
  if (lower === '!digest') { const r = await alerts.dailyDigest(); return '\ud83d\udcca Digest bheja: ' + r.totalOrders + ' orders, ' + r.pendingCod + ' COD pending.'; }
  if (lower.indexOf('!broadcast') === 0) return doBroadcast(t);
  if (lower.indexOf('!coupon') === 0) return doCoupon(parts);
  if (lower === '!remind') { const r = await reorder.remind(); return '\ud83d\udd14 Reorder reminders: ' + r.reminded + ' bheje.'; }
  return null;
}

module.exports = { handle, isAdmin, help };
