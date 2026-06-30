'use strict';

/**
 * Ecommerce Hub — soft stock reservation/hold.
 * Reserve N units of a product for a buyer for HOLD_MINUTES so a WhatsApp order
 * in progress isn't oversold. release()/confirm() free or consume the hold.
 * sweep() expires stale holds. Local bookkeeping only (no platform write).
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_HOLD_PATH || 'data/ecommerce-holds.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, holds: [], updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!Array.isArray(s.holds)) s.holds = []; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function held(productId) {
  expire();
  return read().holds.filter(function (h) { return String(h.productId) === String(productId) && h.status === 'active'; }).reduce(function (n, h) { return n + h.qty; }, 0);
}

function reserve(productId, qty, phone) {
  if (!productId || !(qty > 0)) return { ok: false, error: 'productId_qty_required' };
  const s = read();
  const mins = Number(process.env.HOLD_MINUTES || 30);
  const h = { id: 'hold' + Date.now() + Math.floor(Math.random() * 1000), productId: String(productId), qty: Number(qty), phone: normNum(phone), status: 'active', expiresAt: Date.now() + mins * 60000 };
  s.holds.push(h); write(s);
  return { ok: true, hold: h };
}
function release(id) { const s = read(); const h = s.holds.find(function (x) { return x.id === id; }); if (h) { h.status = 'released'; write(s); return true; } return false; }
function confirm(id) { const s = read(); const h = s.holds.find(function (x) { return x.id === id; }); if (h) { h.status = 'confirmed'; write(s); return true; } return false; }
function expire() { const s = read(); let ch = false; const now = Date.now(); s.holds.forEach(function (h) { if (h.status === 'active' && h.expiresAt < now) { h.status = 'expired'; ch = true; } }); if (ch) write(s); }
function sweep() { expire(); return { ok: true }; }

module.exports = { reserve, release, confirm, held, sweep };
