'use strict';

/**
 * Ecommerce Hub — back-in-stock notifications.
 * subscribe(): buyer asks to be told when an out-of-stock product returns.
 * sweep(): compare current stock vs last seen; for products that went 0 -> >0,
 * notify subscribers and clear them. Persistent JSON. Dry-run safe.
 */

const fs = require('fs');
const path = require('path');
const registry = require('./registry');
const productStore = require('./productStore');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_BIS_PATH || 'data/ecommerce-backinstock.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, subs: {}, lastStock: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.subs) s.subs = {}; if (!s.lastStock) s.lastStock = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function subscribe(phone, productId) {
  const k = normNum(phone); if (!k) return 'Number nahi mila.';
  const p = productStore.findProduct(productId);
  if (!p) return 'Product nahi mila.';
  const s = read(); s.subs[p.id] = s.subs[p.id] || [];
  if (s.subs[p.id].indexOf(k) === -1) s.subs[p.id].push(k);
  write(s);
  return '\ud83d\udd14 ' + p.title + ' wapas stock mein aate hi aapko bata denge.';
}

async function sweep() {
  const products = await registry.allProducts();
  const s = read();
  const restocked = [];
  for (const p of products) {
    const prev = s.lastStock[p.platform + ':' + p.id];
    const now = p.stock == null ? null : Number(p.stock);
    if (prev != null && prev <= 0 && now != null && now > 0) {
      const subs = s.subs[p.id] || [];
      for (const sub of subs) await notify.send(sub, '\u2705 *Wapas stock mein!*\n' + p.title + ' \u2014 ' + (p.price != null ? (p.currency + ' ' + p.price) : '') + (p.url ? ('\nBuy: ' + p.url) : '') + '\nReply *!product ' + p.id + '*');
      if (subs.length) restocked.push({ product: p.id, notified: subs.length });
      s.subs[p.id] = [];
    }
    if (now != null) s.lastStock[p.platform + ':' + p.id] = now;
  }
  write(s);
  return { ok: true, restocked: restocked.length, details: restocked };
}

module.exports = { subscribe, sweep };
