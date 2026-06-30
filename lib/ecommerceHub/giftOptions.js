'use strict';

/**
 * Ecommerce Hub — gift message + gift wrap option.
 * Attach a gift message + wrap flag to an order; produces a gift note for the
 * packing slip and (optionally) a fee line. Persistent JSON keyed by order.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_GIFT_PATH || 'data/ecommerce-gift.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, gifts: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.gifts) s.gifts = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }

function set(orderId, opts) {
  if (!orderId) return { ok: false, error: 'orderId_required' };
  const s = read();
  s.gifts[orderId] = { orderId: orderId, wrap: !!(opts && opts.wrap), message: (opts && opts.message) || null, wrapFee: Number(process.env.GIFT_WRAP_FEE || 150), at: Date.now() };
  write(s);
  return { ok: true, gift: s.gifts[orderId] };
}
function get(orderId) { return read().gifts[orderId] || null; }
function note(orderId) {
  const g = get(orderId); if (!g) return null;
  let n = '\ud83c\udf81 Gift order.';
  if (g.wrap) n += ' Gift-wrap requested.';
  if (g.message) n += '\nNote: "' + g.message + '"';
  return n;
}

module.exports = { set, get, note };
