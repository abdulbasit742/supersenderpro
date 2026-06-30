'use strict';

/**
 * Ecommerce Hub — pre-order / waitlist for not-yet-available products.
 * join(): buyer joins a product's waitlist; notifyAll(): message the list when
 * the product is marked available. Persistent JSON. Dry-run safe.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_WAITLIST_PATH || 'data/ecommerce-waitlist.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, lists: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.lists) s.lists = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function join(productId, phone) {
  const k = normNum(phone); if (!productId || !k) return { ok: false, error: 'productId_phone_required' };
  const s = read(); s.lists[productId] = s.lists[productId] || [];
  if (s.lists[productId].indexOf(k) === -1) s.lists[productId].push(k);
  write(s);
  return { ok: true, message: 'Aap waitlist mein add ho gaye. Available hote hi bata denge.' };
}
async function notifyAll(productId, title) {
  const s = read(); const subs = s.lists[productId] || [];
  for (const sub of subs) await notify.send(sub, '\ud83c\udf89 ' + (title || ('Product ' + productId)) + ' ab available hai! *!product ' + productId + '*');
  s.lists[productId] = []; write(s);
  return { ok: true, notified: subs.length };
}
function list(productId) { return read().lists[productId] || []; }

module.exports = { join, notifyAll, list };
