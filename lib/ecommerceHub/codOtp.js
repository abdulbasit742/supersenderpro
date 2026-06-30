'use strict';

/**
 * Ecommerce Hub — OTP-based COD verification (stronger than haan/nahi).
 * For high-risk COD orders: issue a 4-digit OTP to the buyer; they reply with
 * it to confirm. Reduces fake orders / RTO. Persistent JSON. Dry-run safe.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_OTP_PATH || 'data/ecommerce-otp.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, otp: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.otp) s.otp = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

async function issue(rec) {
  const r = rec || {}; const k = normNum(r.buyerPhone); if (!k) return { ok: false, error: 'buyerPhone_required' };
  const code = String(Math.floor(1000 + Math.random() * 9000));
  const s = read(); s.otp[k] = { code: code, orderId: r.orderId || null, at: Date.now(), verified: false }; write(s);
  const sent = await notify.send(r.buyerPhone, 'Aapke COD order ' + (r.orderId ? ('*' + r.orderId + '* ') : '') + 'ko confirm karne ke liye yeh code wapas bhejein: *' + code + '*');
  return { ok: true, notified: sent };
}

// returns reply string or null if this buyer has no pending OTP
async function handleReply(text, fromPhone) {
  const k = normNum(fromPhone); const s = read(); const rec = s.otp[k];
  if (!rec || rec.verified) return null;
  const m = String(text || '').trim().match(/\b(\d{4})\b/);
  if (!m) return null; // not an OTP-looking message; let other handlers try
  if (m[1] === rec.code) { rec.verified = true; rec.verifiedAt = Date.now(); write(s); return '\u2705 Order ' + (rec.orderId ? ('*' + rec.orderId + '* ') : '') + 'confirm ho gaya. Shukriya!'; }
  return '\u274c Code gholat hai. Dobara wahi 4-digit code bhejein jo humne aapko bheja.';
}

function isVerified(phone) { const r = read().otp[normNum(phone)]; return !!(r && r.verified); }

module.exports = { issue, handleReply, isVerified };
