'use strict';

/**
 * Ecommerce Hub — abandoned-cart recovery (all platforms).
 * trackCart(): record a started-but-unfinished cart with a checkout link.
 * sweep(): find carts older than ABANDONED_CART_MINUTES that aren't recovered,
 *   send the buyer ONE recovery nudge (with checkout link), mark nudged.
 * markRecovered(): call when an order with the same cart/phone lands.
 * Dry-run safe via orderNotify.send. Opt-out honored.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');
const optOut = require('./optOutStore');

function storePath() { const p = process.env.ECOMMERCE_HUB_CART_PATH || 'data/ecommerce-carts.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, carts: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.carts) s.carts = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function key(platform, cartId) { return String(platform) + ':' + String(cartId); }

function trackCart(c) {
  c = c || {};
  if (!c.platform || !c.cartId || !c.buyerPhone) return { ok: false, error: 'platform_cartId_buyerPhone_required' };
  const s = read();
  const k = key(c.platform, c.cartId);
  s.carts[k] = Object.assign({ at: Date.now(), nudged: false, recovered: false }, s.carts[k] || {}, c);
  write(s);
  if (c.buyerPhone) optOut.upsertContact(c.buyerPhone, { name: c.buyerName || null, platform: c.platform });
  return { ok: true, cart: s.carts[k] };
}

function markRecovered(platform, cartId, phone) {
  const s = read();
  if (cartId) { const k = key(platform, cartId); if (s.carts[k]) { s.carts[k].recovered = true; write(s); return true; } }
  if (phone) { const ph = normNum(phone); let hit = false; Object.keys(s.carts).forEach(function (k) { if (normNum(s.carts[k].buyerPhone) === ph && !s.carts[k].recovered) { s.carts[k].recovered = true; hit = true; } }); if (hit) write(s); return hit; }
  return false;
}

function recoveryMsg(c) {
  const lines = [
    'Assalam o Alaikum' + (c.buyerName ? ' ' + c.buyerName : '') + '!',
    'Aap ne apni cart mein ' + (c.itemsText ? c.itemsText : 'kuch items') + ' chhori thi.',
    c.total != null ? ('Total: ' + (c.currency || 'PKR') + ' ' + c.total) : null,
    c.checkoutUrl ? ('Order complete karein: ' + c.checkoutUrl) : 'Order complete karne ke liye reply karein.',
    '', 'Marketing band karne ke liye STOP likhein.'
  ].filter(Boolean);
  return lines.join('\n');
}

async function sweep() {
  const mins = Number(process.env.ABANDONED_CART_MINUTES || 60);
  const cutoff = Date.now() - mins * 60000;
  const s = read();
  const out = [];
  for (const k of Object.keys(s.carts)) {
    const c = s.carts[k];
    if (c.recovered || c.nudged) continue;
    if (c.at > cutoff) continue;
    if (optOut.isOptedOut(c.buyerPhone)) { c.nudged = true; continue; }
    const sent = await notify.send(c.buyerPhone, recoveryMsg(c));
    c.nudged = true; c.nudgedAt = Date.now();
    out.push({ cart: k, notified: sent });
  }
  write(s);
  return { ok: true, nudged: out.length, details: out };
}

module.exports = { trackCart, markRecovered, sweep, recoveryMsg };
