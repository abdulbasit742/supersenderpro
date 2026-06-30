'use strict';

/**
 * Ecommerce Hub — buyer wishlist.
 * !wish <productId> saves a product for a buyer; !mywish lists them with current
 * price/stock; used by priceWatch to alert on drops. Persistent JSON, keyed by phone.
 */

const fs = require('fs');
const path = require('path');
const productStore = require('./productStore');

function storePath() { const p = process.env.ECOMMERCE_HUB_WISHLIST_PATH || 'data/ecommerce-wishlist.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, lists: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.lists) s.lists = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function add(phone, productId) {
  const k = normNum(phone); if (!k) return 'Number nahi mila.';
  const p = productStore.findProduct(productId);
  if (!p) return 'Product nahi mila. *!shop* se ID lein.';
  const s = read(); s.lists[k] = s.lists[k] || [];
  if (s.lists[k].indexOf(p.id) === -1) s.lists[k].push(p.id);
  write(s);
  return '\u2764\ufe0f Wishlist mein add: ' + p.title + '. *!mywish* se dekhein.';
}

function listReply(phone) {
  const k = normNum(phone); const ids = (read().lists[k] || []);
  if (!ids.length) return 'Aapki wishlist khali hai. *!wish <productId>* se add karein.';
  const lines = ids.map(function (id) { const p = productStore.findProduct(id); if (!p) return '\u2022 ' + id; return '\u2022 ' + p.title + ' \u2014 ' + (p.price != null ? (p.currency + ' ' + p.price) : 'n/a') + (p.stock === 0 ? ' (out)' : ''); });
  return '\u2764\ufe0f *Aapki wishlist*\n\n' + lines.join('\n');
}

function watchersFor(productId) {
  const s = read(); const out = [];
  Object.keys(s.lists).forEach(function (k) { if (s.lists[k].indexOf(String(productId)) !== -1) out.push(k); });
  return out;
}
function allWishedIds() { const s = read(); const set = {}; Object.keys(s.lists).forEach(function (k) { s.lists[k].forEach(function (id) { set[id] = true; }); }); return Object.keys(set); }

module.exports = { add, listReply, watchersFor, allWishedIds };
