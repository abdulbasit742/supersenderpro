'use strict';

/**
 * Ecommerce Hub — flash sale / promo countdown scheduler.
 * Define a sale window (start/end) + headline; active() tells if a sale is on,
 * and banner() returns a countdown line for the shop/WhatsApp. Persistent JSON.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_FLASH_PATH || 'data/ecommerce-flash.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, sale: null, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { return JSON.parse(fs.readFileSync(storePath(), 'utf8')); } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }

function set(opts) {
  const o = opts || {};
  const start = o.start ? new Date(o.start).getTime() : Date.now();
  const end = o.end ? new Date(o.end).getTime() : (start + 24 * 3600000);
  if (isNaN(start) || isNaN(end) || end <= start) return { ok: false, error: 'invalid_window' };
  const s = read(); s.sale = { headline: o.headline || 'Flash Sale', discountPct: o.discountPct != null ? Number(o.discountPct) : null, start: start, end: end }; write(s);
  return { ok: true, sale: s.sale };
}
function active() { const s = read().sale; if (!s) return false; const now = Date.now(); return now >= s.start && now <= s.end; }
function banner() {
  const s = read().sale; if (!s) return null;
  const now = Date.now();
  if (now < s.start) return '\u23f3 ' + s.headline + ' jald shuru hoga!';
  if (now > s.end) return null;
  const msLeft = s.end - now; const h = Math.floor(msLeft / 3600000); const m = Math.floor((msLeft % 3600000) / 60000);
  return '\ud83d\udd25 *' + s.headline + '*' + (s.discountPct ? (' \u2014 ' + s.discountPct + '% off') : '') + '\nKhatam hone mein: ' + h + 'h ' + m + 'm. *!shop* abhi!';
}

module.exports = { set, active, banner };
