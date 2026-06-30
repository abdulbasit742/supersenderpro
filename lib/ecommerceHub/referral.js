'use strict';

/**
 * Ecommerce Hub — referral program.
 * codeFor(): get/create a buyer's referral code; !refer shows it. apply():
 * when a new order cites a referral code, reward the referrer (loyalty points)
 * and optionally the referee (coupon). Persistent JSON. Read-only to platforms.
 */

const fs = require('fs');
const path = require('path');
const loyalty = require('./loyalty');
const coupons = require('./coupons');

function storePath() { const p = process.env.ECOMMERCE_HUB_REFERRAL_PATH || 'data/ecommerce-referral.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, codes: {}, byCode: {}, used: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.codes) s.codes = {}; if (!s.byCode) s.byCode = {}; if (!s.used) s.used = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function codeFor(phone) {
  const k = normNum(phone); if (!k) return null;
  const s = read();
  if (s.codes[k]) return s.codes[k];
  const code = 'REF' + k.slice(-4) + Math.floor(Math.random() * 900 + 100);
  s.codes[k] = code; s.byCode[code] = k; write(s);
  return code;
}

function reply(phone) {
  const code = codeFor(phone);
  if (!code) return 'Number nahi mila.';
  return '\ud83c\udf81 *Aapka referral code: ' + code + '*\nDost ko bhejein. Unke pehle order pe aapko points milenge, aur unhein discount.';
}

// apply(refereePhone, code, orderValue) -> rewards
function apply(refereePhone, code, orderValue) {
  const s = read();
  const c = String(code || '').toUpperCase();
  const refPhone = s.byCode[c];
  if (!refPhone) return { ok: false, error: 'invalid_code' };
  const rk = normNum(refereePhone);
  if (rk && rk === refPhone) return { ok: false, error: 'self_referral' };
  if (s.used[rk]) return { ok: false, error: 'referee_already_used' };
  s.used[rk] = c; write(s);
  // reward referrer with loyalty points based on order value
  const reward = loyalty.award(refPhone, orderValue || 0, { reason: 'referral' });
  // reward referee with a small coupon
  const refereeCoupon = coupons.issue({ type: 'flat', value: Number(process.env.REFERRAL_REFEREE_PKR || 200), maxUses: 1, expiresAt: new Date(Date.now() + 30 * 864e5).toISOString() });
  return { ok: true, referrer: refPhone, referrerReward: reward, refereeCoupon: refereeCoupon };
}

module.exports = { codeFor, reply, apply };
