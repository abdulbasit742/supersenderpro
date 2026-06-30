'use strict';

/**
 * Ecommerce Hub — tracking record store (persistent).
 * Keeps a tracking record per order so the buyer can query it any time and we
 * can dedupe shipment notifications. Keyed by platform:orderId, plus a phone
 * index so a buyer's !track (without an order id) finds their latest shipment.
 */

const fs = require('fs');
const path = require('path');

function storePath() {
  const p = process.env.ECOMMERCE_HUB_TRACKING_PATH || 'data/ecommerce-tracking.json';
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}
function empty() { return { version: 1, records: {}, byPhone: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }

function read() {
  try {
    const s = JSON.parse(fs.readFileSync(storePath(), 'utf8'));
    if (!s.records) s.records = {};
    if (!s.byPhone) s.byPhone = {};
    return s;
  } catch (_e) { return empty(); }
}
function write(s) {
  try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; }
  catch (_e) { return false; }
}

function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function key(platform, orderId) { return String(platform) + ':' + String(orderId); }

function save(rec) {
  if (!rec || !rec.platform || !rec.orderId) return false;
  const s = read();
  const k = key(rec.platform, rec.orderId);
  s.records[k] = Object.assign({ updatedAt: Date.now() }, s.records[k] || {}, rec);
  const ph = normNum(rec.buyerPhone);
  if (ph) s.byPhone[ph] = k;
  return write(s);
}
function get(platform, orderId) { return read().records[key(platform, orderId)] || null; }
function findByOrderId(orderId) {
  const want = String(orderId || '').toLowerCase();
  const recs = read().records;
  const hit = Object.keys(recs).find(function (k) { return String(recs[k].orderId).toLowerCase() === want; });
  return hit ? recs[hit] : null;
}
function latestForPhone(phone) {
  const s = read();
  const k = s.byPhone[normNum(phone)];
  return k ? (s.records[k] || null) : null;
}
function list() { const r = read().records; return Object.keys(r).map(function (k) { return r[k]; }); }

module.exports = { save, get, findByOrderId, latestForPhone, list, normNum };
