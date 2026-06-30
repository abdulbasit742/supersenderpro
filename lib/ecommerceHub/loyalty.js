'use strict';

/**
 * Ecommerce Hub — loyalty points (all platforms).
 * Award points when an order lands/delivers (1 point per LOYALTY_POINTS_PER_PKR
 * spent, configurable). Buyer checks !points; !redeem converts points to a
 * discount coupon (via coupons module) at LOYALTY_REDEEM_RATE. Persistent JSON.
 * Read-only to platforms; coupons are local (same guarantee as coupons.js).
 */

const fs = require('fs');
const path = require('path');
const coupons = require('./coupons');

function storePath() { const p = process.env.ECOMMERCE_HUB_LOYALTY_PATH || 'data/ecommerce-loyalty.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, balances: {}, ledger: [], updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.balances) s.balances = {}; if (!s.ledger) s.ledger = []; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function pointsForSpend(amount) {
  const perPkr = Number(process.env.LOYALTY_POINTS_PER_PKR || 0.01); // 1 pt per 100 PKR by default
  return Math.max(0, Math.floor(Number(amount || 0) * perPkr));
}

function award(phone, amount, meta) {
  const k = normNum(phone); if (!k) return { ok: false, error: 'phone_required' };
  const pts = pointsForSpend(amount);
  if (pts <= 0) return { ok: true, awarded: 0, balance: balance(phone) };
  const s = read();
  s.balances[k] = (s.balances[k] || 0) + pts;
  s.ledger.push({ phone: k, delta: pts, reason: (meta && meta.reason) || 'order', orderId: (meta && meta.orderId) || null, at: Date.now() });
  write(s);
  return { ok: true, awarded: pts, balance: s.balances[k] };
}

function balance(phone) { const k = normNum(phone); return k ? (read().balances[k] || 0) : 0; }

function balanceReply(phone) {
  const b = balance(phone);
  const rate = Number(process.env.LOYALTY_REDEEM_RATE || 1); // 1 point = 1 PKR off by default
  return '\u2b50 *Aapke points: ' + b + '*\n' + (b > 0 ? ('Redeem value: ~' + Math.floor(b * rate) + ' PKR. *!redeem* likhein coupon ke liye.') : 'Order karein aur points kamaayein!');
}

// Convert all points into a flat-discount coupon. Zeroes the balance.
function redeem(phone) {
  const k = normNum(phone); if (!k) return { ok: false, error: 'phone_required' };
  const b = balance(phone);
  const min = Number(process.env.LOYALTY_MIN_REDEEM || 100);
  if (b < min) return { ok: false, error: 'min_not_reached', message: 'Redeem ke liye kam az kam ' + min + ' points chahiye. Aapke paas ' + b + ' hain.' };
  const rate = Number(process.env.LOYALTY_REDEEM_RATE || 1);
  const value = Math.floor(b * rate);
  const code = 'PTS' + k.slice(-4) + Math.floor(Math.random() * 900 + 100);
  const coupon = coupons.issue({ type: 'flat', value: value, code: code, maxUses: 1, expiresAt: new Date(Date.now() + 30 * 864e5).toISOString() });
  const s = read(); s.balances[k] = 0; s.ledger.push({ phone: k, delta: -b, reason: 'redeem', code: code, at: Date.now() }); write(s);
  return { ok: true, coupon: coupon, message: '\ud83c\udf81 ' + b + ' points redeem! Coupon: *' + coupon.code + '* (' + coupons.describe(coupon) + '). Checkout pe lagayein.' };
}

module.exports = { award, balance, balanceReply, redeem, pointsForSpend };
