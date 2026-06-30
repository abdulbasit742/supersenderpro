'use strict';

/**
 * Ecommerce Hub — buyer-initiated order edit/cancel request (pre-dispatch).
 * Buyer requests a change (qty/address/cancel); we log it + ping admin (we do
 * NOT write to the platform, to keep the read-only guarantee). Admin actions it
 * on the platform manually. Persistent JSON. Dry-run safe.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_EDIT_PATH || 'data/ecommerce-orderedits.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, requests: [], updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!Array.isArray(s.requests)) s.requests = []; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }
function adminNumbers() { return String(process.env.ORDER_NOTIFY_ADMIN_NUMBERS || process.env.DARAZ_ADMIN_NUMBERS || '').split(',').map(normNum).filter(Boolean); }

async function request(rec) {
  const r = rec || {}; if (!r.orderId) return { ok: false, error: 'orderId_required' };
  const s = read();
  const req = { id: 'edit' + Date.now(), orderId: r.orderId, phone: normNum(r.phone), kind: r.kind || 'edit', detail: r.detail || null, status: 'pending', at: Date.now() };
  s.requests.push(req); write(s);
  for (const a of adminNumbers()) await notify.send(a, '\u270f\ufe0f *Order ' + r.kind + ' request*\nOrder: ' + r.orderId + '\n' + (r.detail || '') + '\nBuyer: ' + normNum(r.phone) + '\n(platform pe manually action karein)');
  return { ok: true, request: req, buyerMessage: 'Aapki ' + (r.kind === 'cancel' ? 'cancellation' : 'edit') + ' request mil gayi order ' + r.orderId + ' ke liye. Team confirm karegi.' };
}
function list(status) { return read().requests.filter(function (x) { return !status || x.status === status; }); }
function resolve(id) { const s = read(); const r = s.requests.find(function (x) { return x.id === id; }); if (r) { r.status = 'done'; write(s); return true; } return false; }

module.exports = { request, list, resolve };
