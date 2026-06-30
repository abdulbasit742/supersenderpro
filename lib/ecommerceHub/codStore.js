'use strict';

/**
 * Ecommerce Hub — COD + order-event state (persistent).
 * Tracks: (a) which orders we've already notified (dedupe), and
 * (b) pending COD confirmations keyed by buyer phone, so a buyer's
 * WhatsApp reply (haan/nahi) can be matched back to their order.
 * Stored as JSON; no raw PII beyond phone needed to route the reply.
 */

const fs = require('fs');
const path = require('path');

function storePath() {
  const p = process.env.ECOMMERCE_HUB_COD_PATH || 'data/ecommerce-cod.json';
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}
function empty() { return { version: 1, seen: {}, pending: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }

function read() {
  try {
    const s = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
    if (!s.seen) s.seen = {};
    if (!s.pending) s.pending = {};
    return s;
  } catch (_e) { return empty(); }
}
function write(s) {
  try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; }
  catch (_e) { return false; }
}

function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function seenKey(platform, orderId) { return String(platform) + ':' + String(orderId); }

function isSeen(platform, orderId) { return !!read().seen[seenKey(platform, orderId)]; }
function markSeen(platform, orderId) { const s = read(); s.seen[seenKey(platform, orderId)] = Date.now(); write(s); }

// Pending COD keyed by buyer phone (last 1 wins; simple + good enough for confirm flow).
function setPending(phone, rec) {
  const k = normNum(phone);
  if (!k) return false;
  const s = read();
  s.pending[k] = Object.assign({ at: Date.now() }, rec);
  return write(s);
}
function getPending(phone) { const k = normNum(phone); return k ? (read().pending[k] || null) : null; }
function clearPending(phone) { const k = normNum(phone); const s = read(); if (s.pending[k]) { delete s.pending[k]; write(s); } }
function listPending() {
  const p = read().pending;
  return Object.keys(p).map(function (k) { return Object.assign({ phone: k }, p[k]); });
}

module.exports = { isSeen, markSeen, setPending, getPending, clearPending, listPending, normNum };
