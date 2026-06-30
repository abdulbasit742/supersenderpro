'use strict';

/**
 * Ecommerce Hub — returns / RMA flow over WhatsApp.
 * open(): buyer requests a return for an order with a reason -> RMA id + admin
 * ping. updateStatus(): admin moves it (approved/rejected/received/refunded).
 * Persistent JSON. Dry-run safe via orderNotify.send.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_RETURNS_PATH || 'data/ecommerce-returns.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, rmas: {}, seq: 1000, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.rmas) s.rmas = {}; if (!s.seq) s.seq = 1000; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function adminNumbers() { return String(process.env.ORDER_NOTIFY_ADMIN_NUMBERS || process.env.DARAZ_ADMIN_NUMBERS || '').split(',').map(normNum).filter(Boolean); }

async function open(rec) {
  const r = rec || {}; if (!r.orderId || !r.buyerPhone) return { ok: false, error: 'orderId_buyerPhone_required' };
  const s = read(); const id = 'RMA-' + (++s.seq);
  s.rmas[id] = { id: id, orderId: r.orderId, phone: normNum(r.buyerPhone), reason: r.reason || null, status: 'open', at: Date.now() };
  write(s);
  for (const a of adminNumbers()) await notify.send(a, '\u21a9\ufe0f *Return request* ' + id + '\nOrder: ' + r.orderId + '\nReason: ' + (r.reason || '-') + '\nBuyer: ' + normNum(r.buyerPhone));
  return { ok: true, rma: s.rmas[id], buyerMessage: 'Aapki return request ' + id + ' mil gayi. Hamari team review karke aapko batayegi.' };
}

async function updateStatus(id, status) {
  const s = read(); const rma = s.rmas[id]; if (!rma) return { ok: false, error: 'not_found' };
  rma.status = status; rma.updatedAt = Date.now(); write(s);
  const map = { approved: 'approve ho gayi \u2705', rejected: 'reject ho gayi', received: 'item receive ho gaya', refunded: 'refund ho gaya \ud83c\udf89' };
  if (rma.phone) await notify.send(rma.phone, 'Aapki return ' + id + ' ' + (map[status] || ('status: ' + status)) + '.');
  return { ok: true, rma: rma };
}
function list() { const r = read().rmas; return Object.keys(r).map(function (k) { return r[k]; }); }

module.exports = { open, updateStatus, list };
