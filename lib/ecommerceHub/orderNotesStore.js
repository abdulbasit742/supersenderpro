'use strict';

/**
 * Ecommerce Hub — internal per-order notes (staff only).
 * Attach free-text notes to an order for fulfillment context. Persistent JSON.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_ORDERNOTES_PATH || 'data/ecommerce-ordernotes.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, notes: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.notes) s.notes = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }

function add(orderId, note) { if (!orderId || !note) return false; const s = read(); s.notes[orderId] = s.notes[orderId] || []; s.notes[orderId].push({ note: String(note), at: Date.now() }); return write(s); }
function get(orderId) { return read().notes[orderId] || []; }

module.exports = { add, get };
