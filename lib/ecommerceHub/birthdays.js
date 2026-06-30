'use strict';

/**
 * Ecommerce Hub — birthday wishes + coupon.
 * set(): store a buyer's birthday (MM-DD). runToday(): wish everyone whose
 * birthday is today and send a coupon. Persistent JSON. Dry-run safe.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');
const coupons = require('./coupons');

function storePath() { const p = process.env.ECOMMERCE_HUB_BDAY_PATH || 'data/ecommerce-birthdays.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, bdays: {}, sent: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.bdays) s.bdays = {}; if (!s.sent) s.sent = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function mmdd(d) { const x = d || new Date(); return String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); }

function set(phone, monthDay) { const k = normNum(phone); if (!k || !/^\d{2}-\d{2}$/.test(String(monthDay || ''))) return { ok: false, error: 'phone_and_MMDD_required' }; const s = read(); s.bdays[k] = monthDay; write(s); return { ok: true }; }
async function runToday() {
  const s = read(); const today = mmdd(); const year = new Date().getFullYear(); const out = [];
  for (const k of Object.keys(s.bdays)) {
    if (s.bdays[k] !== today) continue;
    if (s.sent[k] === year) continue;
    const c = coupons.issue({ type: 'percent', value: Number(process.env.BIRTHDAY_DISCOUNT_PCT || 15), maxUses: 1, expiresAt: new Date(Date.now() + 14 * 864e5).toISOString() });
    await notify.send(k, '\ud83c\udf82 *Happy Birthday!* Aapke liye tohfa: ' + coupons.describe(c) + '. Checkout pe code lagayein!');
    s.sent[k] = year; out.push(k);
  }
  write(s);
  return { ok: true, wished: out.length };
}

module.exports = { set, runToday };
