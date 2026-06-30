'use strict';

/**
 * Ecommerce Hub — recurring/subscription orders.
 * create(): set a buyer + product on a repeat cadence (days). due(): list/send
 * reminders for subscriptions whose nextAt has passed (buyer confirms reorder).
 * Persistent JSON. Dry-run safe via orderNotify.send.
 */

const fs = require('fs');
const path = require('path');
const notify = require('./orderNotify');

function storePath() { const p = process.env.ECOMMERCE_HUB_SUBS_PATH || 'data/ecommerce-subs.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, subs: [], updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!Array.isArray(s.subs)) s.subs = []; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

function create(rec) {
  const r = rec || {}; const k = normNum(r.phone); if (!k || !r.productId) return { ok: false, error: 'phone_productId_required' };
  const days = Number(r.everyDays || 30);
  const s = read();
  const sub = { id: 'sub' + Date.now(), phone: k, productId: String(r.productId), everyDays: days, nextAt: Date.now() + days * 864e5, status: 'active', createdAt: Date.now() };
  s.subs.push(sub); write(s);
  return { ok: true, subscription: sub };
}

async function due() {
  const s = read(); const now = Date.now(); const out = [];
  for (const sub of s.subs) {
    if (sub.status !== 'active' || sub.nextAt > now) continue;
    await notify.send(sub.phone, '\ud83d\udd01 Aapke regular order ka waqt aa gaya! Dobara order ke liye *!product ' + sub.productId + '* ya *haan* likhein.');
    sub.nextAt = now + sub.everyDays * 864e5; sub.lastRemindedAt = now;
    out.push({ id: sub.id, phone: sub.phone });
  }
  write(s);
  return { ok: true, reminded: out.length, details: out };
}
function cancel(id) { const s = read(); const sub = s.subs.find(function (x) { return x.id === id; }); if (sub) { sub.status = 'cancelled'; write(s); return true; } return false; }
function list() { return read().subs; }

module.exports = { create, due, cancel, list };
