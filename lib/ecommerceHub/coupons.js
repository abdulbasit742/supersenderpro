'use strict';

/**
 * Ecommerce Hub — discount codes (issue + validate + WhatsApp !coupon).
 * Codes are stored locally; this does NOT push them to the platform (read-only
 * guarantee preserved). Use them in your own checkout, or hand to the platform
 * manually. Supports percent or flat, optional expiry + max uses.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_COUPON_PATH || 'data/ecommerce-coupons.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, codes: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.codes) s.codes = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function norm(c) { return String(c || '').trim().toUpperCase(); }

function issue(opts) {
  opts = opts || {};
  const code = norm(opts.code || ('SAVE' + Math.floor(Math.random() * 9000 + 1000)));
  const rec = {
    code: code,
    type: opts.type === 'flat' ? 'flat' : 'percent',
    value: Number(opts.value || (opts.type === 'flat' ? 200 : 10)),
    currency: opts.currency || 'PKR',
    expiresAt: opts.expiresAt || null,
    maxUses: opts.maxUses != null ? Number(opts.maxUses) : null,
    uses: 0, createdAt: Date.now()
  };
  const s = read(); s.codes[code] = rec; write(s);
  return rec;
}

function describe(rec) {
  const off = rec.type === 'flat' ? (rec.currency + ' ' + rec.value + ' off') : (rec.value + '% off');
  let extra = '';
  if (rec.expiresAt) extra += ' (valid till ' + String(rec.expiresAt).slice(0, 10) + ')';
  return rec.code + ' \u2014 ' + off + extra;
}

function validate(code) {
  const rec = read().codes[norm(code)];
  if (!rec) return { ok: false, error: 'not_found' };
  if (rec.expiresAt && Date.now() > new Date(rec.expiresAt).getTime()) return { ok: false, error: 'expired' };
  if (rec.maxUses != null && rec.uses >= rec.maxUses) return { ok: false, error: 'max_uses_reached' };
  return { ok: true, coupon: rec };
}

function redeem(code) {
  const v = validate(code); if (!v.ok) return v;
  const s = read(); s.codes[norm(code)].uses += 1; write(s);
  return { ok: true, coupon: s.codes[norm(code)] };
}

// WhatsApp !coupon -> hand the buyer the current active code (latest issued).
function currentForBuyer() {
  const codes = read().codes;
  const active = Object.keys(codes).map(function (k) { return codes[k]; })
    .filter(function (r) { return (!r.expiresAt || Date.now() <= new Date(r.expiresAt).getTime()) && (r.maxUses == null || r.uses < r.maxUses); })
    .sort(function (a, b) { return b.createdAt - a.createdAt; });
  if (!active.length) return 'Abhi koi active discount nahi. Jald offers aayenge!';
  return '\ud83c\udf81 *Discount code:* ' + describe(active[0]) + '\nCheckout pe yeh code lagayein.';
}

function list() { const c = read().codes; return Object.keys(c).map(function (k) { return c[k]; }); }

module.exports = { issue, validate, redeem, describe, currentForBuyer, list };
