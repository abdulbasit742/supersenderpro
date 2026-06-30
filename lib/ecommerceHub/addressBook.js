'use strict';

/**
 * Ecommerce Hub — buyer address book.
 * Save/list multiple addresses per buyer phone so reorders skip re-typing.
 * Persistent JSON.
 */

const fs = require('fs');
const path = require('path');
function storePath() { const p = process.env.ECOMMERCE_HUB_ADDR_PATH || 'data/ecommerce-addresses.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, book: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.book) s.book = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function add(phone, address, label) { const k = normNum(phone); if (!k || !address) return { ok: false, error: 'phone_address_required' }; const s = read(); s.book[k] = s.book[k] || []; s.book[k].push({ label: label || ('addr' + (s.book[k].length + 1)), address: String(address), city: null, at: Date.now() }); write(s); return { ok: true, count: s.book[k].length }; }
function list(phone) { return read().book[normNum(phone)] || []; }
function reply(phone) { const a = list(phone); if (!a.length) return 'Koi saved address nahi. Apna address bhejein, hum save kar lenge.'; return '\ud83d\udccd *Saved addresses:*\n' + a.map(function (x, i) { return (i + 1) + '. ' + x.address; }).join('\n'); }
module.exports = { add, list, reply };
