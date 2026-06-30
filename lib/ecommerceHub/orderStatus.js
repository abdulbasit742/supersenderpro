'use strict';

/**
 * Ecommerce Hub — order status updates (all platforms).
 * Sends the buyer a Roman-Urdu message for each lifecycle step. Dedupe so the
 * same status is never sent twice. Dry-run safe via orderNotify.send.
 *
 * Steps: confirmed | packed | shipped | out_for_delivery | delivered | cancelled
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_STATUS_PATH || 'data/ecommerce-status.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, sent: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.sent) s.sent = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function key(platform, orderId, status) { return String(platform) + ':' + String(orderId) + ':' + String(status); }

const MESSAGES = {
  confirmed: 'confirm ho gaya hai \u2705. Shukriya!',
  packed: 'pack ho chuka hai \ud83d\udce6.',
  shipped: 'ship ho gaya hai \ud83d\ude9a. Tracking jald milegi.',
  out_for_delivery: 'aaj delivery ke liye nikal chuka hai \ud83d\udef5. براہ کرم available rahein.',
  delivered: 'deliver ho gaya hai \ud83c\udf89. Umeed hai pasand aaya!',
  cancelled: 'cancel kar diya gaya hai. Koi sawal ho toh reply karein.'
};

function normStatus(s) {
  const x = String(s || '').toLowerCase().replace(/[\s-]+/g, '_');
  if (x.indexOf('out') === 0 || x.indexOf('ofd') !== -1) return 'out_for_delivery';
  if (MESSAGES[x]) return x;
  if (x.indexOf('deliver') !== -1) return 'delivered';
  if (x.indexOf('ship') !== -1 || x.indexOf('fulfil') !== -1) return 'shipped';
  if (x.indexOf('pack') !== -1) return 'packed';
  if (x.indexOf('confirm') !== -1) return 'confirmed';
  if (x.indexOf('cancel') !== -1) return 'cancelled';
  return null;
}

function statusMsg(orderId, status) {
  return 'Aapke order *' + orderId + '* ki update: ' + (MESSAGES[status] || ('status: ' + status));
}

async function update(rec) {
  const r = rec || {};
  const status = normStatus(r.status);
  if (!r.platform || !r.orderId || !status) return { ok: false, error: 'platform_orderId_valid_status_required' };
  const s = read();
  const k = key(r.platform, r.orderId, status);
  if (s.sent[k]) return { ok: true, skipped: 'already_sent' };
  let sent = null;
  if (r.buyerPhone) sent = await notify.send(r.buyerPhone, statusMsg(r.orderId, status));
  s.sent[k] = Date.now(); write(s);
  return { ok: true, platform: r.platform, orderId: r.orderId, status: status, notified: sent };
}

module.exports = { update, statusMsg, normStatus, MESSAGES };
