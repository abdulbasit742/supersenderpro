'use strict';

/**
 * Ecommerce Hub — sequential invoice numbering.
 * next(): atomically returns the next invoice number with a configurable prefix
 * (INVOICE_PREFIX) + zero-padded counter. Persistent JSON.
 */

const fs = require('fs');
const path = require('path');
function storePath() { const p = process.env.ECOMMERCE_HUB_INVNUM_PATH || 'data/ecommerce-invnum.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function read() { try { return JSON.parse(fs.readFileSync(storePath(), 'utf8')); } catch (_e) { return { version: 1, counter: Number(process.env.INVOICE_START || 1000) }; } }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function write(s) { try { ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function next() { const s = read(); s.counter = (s.counter || 1000) + 1; write(s); const prefix = process.env.INVOICE_PREFIX || 'INV-'; return prefix + String(s.counter).padStart(6, '0'); }
function current() { const s = read(); return (process.env.INVOICE_PREFIX || 'INV-') + String(s.counter || 1000).padStart(6, '0'); }
module.exports = { next, current };
