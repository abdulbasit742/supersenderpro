'use strict';

/**
 * Ecommerce Hub — delivery slot booking.
 * Offer named slots (e.g. morning/evening) for a date; buyer books one for an
 * order. Capacity per slot via DELIVERY_SLOT_CAP. Persistent JSON.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_SLOTS_PATH || 'data/ecommerce-slots.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, bookings: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.bookings) s.bookings = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }

function slots() { try { const s = JSON.parse(process.env.DELIVERY_SLOTS || ''); if (Array.isArray(s)) return s; } catch (_e) {} return ['morning (9-12)', 'afternoon (12-4)', 'evening (4-8)']; }
function key(date, slot) { return String(date) + '|' + String(slot); }

function available(date) {
  const cap = Number(process.env.DELIVERY_SLOT_CAP || 20);
  const s = read();
  return slots().map(function (sl) { const used = (s.bookings[key(date, sl)] || []).length; return { slot: sl, used: used, cap: cap, full: used >= cap }; });
}
function book(rec) {
  const r = rec || {}; if (!r.date || !r.slot || !r.orderId) return { ok: false, error: 'date_slot_orderId_required' };
  const cap = Number(process.env.DELIVERY_SLOT_CAP || 20);
  const s = read(); const k = key(r.date, r.slot);
  s.bookings[k] = s.bookings[k] || [];
  if (s.bookings[k].length >= cap) return { ok: false, error: 'slot_full' };
  s.bookings[k].push({ orderId: r.orderId, phone: r.phone || null, at: Date.now() });
  write(s);
  return { ok: true, booked: { date: r.date, slot: r.slot, orderId: r.orderId } };
}

module.exports = { slots, available, book };
