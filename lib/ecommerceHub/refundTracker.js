'use strict';

/**
 * Ecommerce Hub — refund tracker.
 * open()/update() a refund record for an order (amount, method, status), notify
 * buyer on status change. Persistent JSON. Dry-run safe.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');
function storePath() { const p = process.env.ECOMMERCE_HUB_REFUND_PATH || 'data/ecommerce-refunds.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, refunds: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.refunds) s.refunds = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
async function open(rec) { const r = rec || {}; if (!r.orderId) return { ok: false, error: 'orderId_required' }; const s = read(); s.refunds[r.orderId] = { orderId: r.orderId, phone: normNum(r.buyerPhone), amount: Number(r.amount || 0), currency: r.currency || 'PKR', method: r.method || 'original', status: 'initiated', at: Date.now() }; write(s); if (s.refunds[r.orderId].phone) await notify.send(s.refunds[r.orderId].phone, 'Aapke order ' + r.orderId + ' ka refund (' + (r.currency || 'PKR') + ' ' + (r.amount || 0) + ') process ho raha hai.'); return { ok: true, refund: s.refunds[r.orderId] }; }
async function update(orderId, status) { const s = read(); const rf = s.refunds[orderId]; if (!rf) return { ok: false, error: 'not_found' }; rf.status = status; rf.updatedAt = Date.now(); write(s); const map = { processing: 'process ho raha hai', completed: 'mukammal ho gaya \u2705', failed: 'fail hua, team rabta karegi' }; if (rf.phone) await notify.send(rf.phone, 'Refund update (order ' + orderId + '): ' + (map[status] || status)); return { ok: true, refund: rf }; }
function list() { const r = read().refunds; return Object.keys(r).map(function (k) { return r[k]; }); }
module.exports = { open, update, list };
