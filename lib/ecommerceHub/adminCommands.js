'use strict';

/**
 * Ecommerce Hub — WhatsApp ADMIN commands (write path).
 * Separate from waCommands.js (which is read-only for customers).
 * These let an authorised seller control the store FROM WhatsApp.
 *
 * Gating (all must pass before any write):
 *   1. ECOMMERCE_HUB_ADMIN_WRITE=true
 *   2. sender number is in DARAZ_ADMIN_NUMBERS (comma-separated)
 * In dry-run the write is simulated (safe to test without keys).
 *
 * Commands (admin only):
 *   !setstock <sellerSku> <qty>          -> update Daraz stock
 *   !setprice <sellerSku> <price>        -> update Daraz price
 *   !settrack <orderId> <courier> <id>   -> set tracking + WhatsApp the buyer
 *   !sync                                -> refresh catalog/clients cache
 *   !adminhelp                           -> list admin commands
 */

const registry = require('./registry');
const wa = require('./waCommands');
const tracking = require('./tracking');
const trackingStore = require('./trackingStore');
const notify = require('./orderNotify');

function adminEnabled() {
  return String(process.env.ECOMMERCE_HUB_ADMIN_WRITE || 'false').toLowerCase() === 'true';
}

function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function isAdmin(fromNumber) {
  const list = String(process.env.DARAZ_ADMIN_NUMBERS || '')
    .split(',').map(normNum).filter(Boolean);
  const me = normNum(fromNumber);
  return me.length > 0 && list.indexOf(me) !== -1;
}

function help() {
  return [
    '\ud83d\udd10 *Admin commands*',
    '!setstock <sku> <qty>  — update Daraz stock',
    '!setprice <sku> <price>  — update Daraz price',
    '!settrack <orderId> <courier> <trackingId>  — set tracking + buyer ko notify',
    '!sync  — refresh catalog + clients',
    '',
    'Customers ke liye: !shop, !product <id>, !orders, !track <orderId>'
  ].join('\n');
}

async function setStock(sku, qtyRaw) {
  const daraz = registry.get('daraz');
  if (!daraz || typeof daraz.updatePriceQuantity !== 'function') return 'Daraz write not available.';
  const qty = parseInt(qtyRaw, 10);
  if (!sku || isNaN(qty) || qty < 0) return 'Usage: !setstock <sku> <qty>';
  const r = await daraz.updatePriceQuantity(sku, { quantity: qty });
  if (r.dryRun) return '\u2705 (dry-run) ' + sku + ' stock → ' + qty + '. Live karne ke liye DARAZ_LIVE=true + DRY_RUN=false.';
  return '\u2705 Daraz stock updated: ' + sku + ' → ' + qty;
}

async function setPrice(sku, priceRaw) {
  const daraz = registry.get('daraz');
  if (!daraz || typeof daraz.updatePriceQuantity !== 'function') return 'Daraz write not available.';
  const price = Number(priceRaw);
  if (!sku || isNaN(price) || price <= 0) return 'Usage: !setprice <sku> <price>';
  const r = await daraz.updatePriceQuantity(sku, { price: price });
  if (r.dryRun) return '\u2705 (dry-run) ' + sku + ' price → ' + price + '. Live karne ke liye DARAZ_LIVE=true + DRY_RUN=false.';
  return '\u2705 Daraz price updated: ' + sku + ' → ' + price;
}

// !settrack <orderId> <courier> <trackingId>  (platform optional 4th arg, default daraz)
async function setTrack(parts) {
  const orderId = parts[1];
  const courier = parts[2];
  const trackingId = parts[3];
  const platform = parts[4] || 'daraz';
  if (!orderId || !courier || !trackingId) return 'Usage: !settrack <orderId> <courier> <trackingId> [platform]';

  // try to recover the buyer phone from any existing tracking/order record
  const existing = trackingStore.findByOrderId(orderId);
  const buyerPhone = existing && existing.buyerPhone ? existing.buyerPhone : null;

  const saved = await tracking.setTracking({ platform: platform, orderId: orderId, courier: courier, trackingId: trackingId, buyerPhone: buyerPhone, status: 'shipped' });
  if (!saved.ok) return 'Tracking set nahi hui: ' + (saved.error || 'unknown');

  let note = '';
  if (buyerPhone) {
    const sent = await notify.send(buyerPhone, tracking.buyerMsg({ platform: platform, orderId: orderId, courier: courier, trackingId: trackingId }));
    note = sent && sent.dryRun ? ' (buyer notify dry-run: ORDER_NOTIFY_ENABLED=true karein)' : ' Buyer ko notify kar diya.';
  } else {
    note = ' (buyer phone record mein nahi mila, sirf save kiya. Order pehle order-event se aana chahiye.)';
  }
  const link = saved.link ? ('\nTrack: ' + saved.link) : '';
  return '\u2705 Tracking set: order ' + orderId + ' → ' + tracking.courierLabel(courier) + ' ' + trackingId + '.' + note + link;
}

async function handle(text, fromNumber) {
  const t = String(text || '').trim();
  const lower = t.toLowerCase();
  const parts = t.split(/\s+/);

  const isWriteCmd = lower.indexOf('!setstock') === 0 || lower.indexOf('!setprice') === 0
    || lower.indexOf('!settrack') === 0 || lower === '!sync' || lower === '!adminhelp';
  if (!isWriteCmd) return null;

  if (!adminEnabled()) return 'Admin control disabled.';
  if (!isAdmin(fromNumber)) return '\u26d4 Not authorised. Yeh command sirf admin number se chalti hai.';

  if (lower === '!adminhelp') return help();
  if (lower === '!sync') { const r = await wa.refreshCache(); return '\ud83d\udd04 Synced: ' + r.products + ' products, ' + r.clients + ' clients.'; }
  if (lower.indexOf('!setstock') === 0) return setStock(parts[1], parts[2]);
  if (lower.indexOf('!setprice') === 0) return setPrice(parts[1], parts[2]);
  if (lower.indexOf('!settrack') === 0) return setTrack(parts);
  return null;
}

module.exports = { handle, isAdmin, help };
