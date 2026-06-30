'use strict';
// #80 Abandoned Cart Recovery — track carts + detect abandonment.
const crypto = require('crypto');
const config = require('./config');
const store = require('./store');

function now() { return Date.now(); }

// Upsert a cart on activity. status: open until paid/abandoned.
function track(db, { tenantId, cartId, contactId, value, items }) {
  if (!cartId || !contactId) throw new Error('cartId and contactId required');
  const k = store.key(tenantId, cartId);
  const existing = db.carts[k];
  if (existing && (existing.status === 'recovered' || existing.status === 'paid')) return { ok: true, cart: existing, noop: true };
  const cart = existing || { id: cartId, tenantId: tenantId || 'default', contactId, createdAt: new Date().toISOString(), nudges: [], status: 'open' };
  cart.contactId = contactId;
  cart.value = Number(value) || cart.value || 0;
  if (items) cart.items = items;
  cart.lastActivityAt = new Date().toISOString();
  cart.status = 'open';
  db.carts[k] = cart;
  return { ok: true, cart };
}

// Mark a cart paid (recovered if it had nudges).
function markPaid(db, { tenantId, cartId }) {
  const c = store.get(db, tenantId, cartId);
  if (!c) return { ok: false, error: 'not_found' };
  c.status = (c.nudges && c.nudges.length) ? 'recovered' : 'paid';
  c.paidAt = new Date().toISOString();
  return { ok: true, cart: c };
}

// Scan open carts and flip stale ones to 'abandoned'.
function detectAbandoned(db) {
  const cutoff = now() - config.abandonAfterMinutes * 60 * 1000;
  const flipped = [];
  for (const c of Object.values(db.carts)) {
    if (c.status !== 'open') continue;
    if ((Number(c.value) || 0) < config.minCartValue) continue;
    const last = Date.parse(c.lastActivityAt || c.createdAt);
    if (last <= cutoff) {
      c.status = 'abandoned';
      c.abandonedAt = new Date().toISOString();
      flipped.push(c);
    }
  }
  return flipped;
}
module.exports = { track, markPaid, detectAbandoned };
