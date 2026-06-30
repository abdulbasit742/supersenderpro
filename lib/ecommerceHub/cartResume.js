'use strict';

/**
 * Ecommerce Hub — buyer cart save/resume over WhatsApp.
 * !save adds the last viewed/product to a personal cart; !mycart shows it;
 * !clearcart empties. Lightweight in-WhatsApp cart for COD-style ordering.
 * Persistent JSON keyed by phone.
 */

const fs = require('fs');
const path = require('path');
const productStore = require('./productStore');
function storePath() { const p = process.env.ECOMMERCE_HUB_MYCART_PATH || 'data/ecommerce-mycart.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, carts: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.carts) s.carts = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function addItem(phone, productId) { const k = normNum(phone); const p = productStore.findProduct(productId); if (!k || !p) return 'Product nahi mila. *!shop* dekhein.'; const s = read(); s.carts[k] = s.carts[k] || []; s.carts[k].push(p.id); write(s); return '\u2705 Cart mein add: ' + p.title + '. *!mycart* se dekhein.'; }
function reply(phone) { const k = normNum(phone); const ids = (read().carts[k] || []); if (!ids.length) return 'Aapki cart khali hai.'; let total = 0; const lines = ids.map(function (id) { const p = productStore.findProduct(id); if (p && p.price != null) total += p.price; return '\u2022 ' + (p ? p.title : id) + (p && p.price != null ? (' \u2014 ' + p.currency + ' ' + p.price) : ''); }); return '\ud83d\uded2 *Aapki cart*\n\n' + lines.join('\n') + '\n\nTotal: PKR ' + total + '\nOrder ke liye reply karein ya *!agent*.'; }
function clear(phone) { const k = normNum(phone); const s = read(); if (s.carts[k]) { delete s.carts[k]; write(s); } return 'Cart khali kar di.'; }
module.exports = { addItem, reply, clear };
