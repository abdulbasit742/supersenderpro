'use strict';
// Core recovery engine. Deterministic, side-effect-light, dry-run by default.
const { config } = require('./config');
const { withDb, load } = require('./store');
const { maskContact } = require('./privacy');

function uid(prefix) { return prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
function now() { return Date.now(); }
function minsToMs(m) { return m * 60 * 1000; }

// --- optional cross-department wiring (degrades to no-op if absent) ---
function tryRequire(p) { try { return require(p); } catch (_) { return null; } }
function issueIncentiveCoupon(tenantId, cartId) {
  if (config.incentiveCouponHint) return config.incentiveCouponHint;
  const coupons = tryRequire('../coupons');
  try {
    if (coupons && typeof coupons.mint === 'function') {
      const c = coupons.mint({ tenantId, reason: 'cart-recovery', cartId, percentOff: 10, singleUse: true });
      return (c && (c.code || c.id)) || '';
    }
  } catch (_) {}
  return '';
}
function notify(tenantId, event, payload) {
  const alerts = tryRequire('../alertCenter');
  try { if (alerts && typeof alerts.emit === 'function') alerts.emit({ tenantId, event, payload }); } catch (_) {}
}

function requireTenant(tenantId) {
  if (!tenantId) throw new Error('cartRecovery: tenantId is required');
  return tenantId;
}

// Upsert a cart snapshot. Called by checkout/storefront whenever a cart changes.
function upsertCart({ tenantId, cartId, contact, items, total, status }) {
  requireTenant(tenantId);
  if (!cartId) throw new Error('cartRecovery: cartId is required');
  return withDb(db => {
    const key = tenantId + ':' + cartId;
    const prev = db.carts[key] || { tenantId, cartId, createdAt: now(), nudgesSent: 0, history: [] };
    const cart = Object.assign(prev, {
      tenantId, cartId,
      contact: contact || prev.contact || null,
      items: Array.isArray(items) ? items : (prev.items || []),
      total: total != null ? total : (prev.total || 0),
      status: status || prev.status || 'active',
      updatedAt: now(),
    });
    db.carts[key] = cart;
    return cart;
  });
}

// Mark a cart converted (an order was placed). Stops all future nudges.
function markConverted({ tenantId, cartId, orderId }) {
  requireTenant(tenantId);
  return withDb(db => {
    const key = tenantId + ':' + cartId;
    const cart = db.carts[key];
    if (!cart) return null;
    cart.status = 'converted';
    cart.orderId = orderId || null;
    cart.convertedAt = now();
    cart.updatedAt = now();
    notify(tenantId, 'cart.recovered', { cartId, orderId, total: cart.total });
    return cart;
  });
}

function isQuietHour(d = new Date()) {
  const h = d.getHours();
  const { quietStartHour: s, quietEndHour: e } = config;
  if (s === e) return false;
  if (s < e) return h >= s && h < e;
  return h >= s || h < e; // window wraps midnight
}

function buildMessage(cart, stepIdx, isFinal, coupon) {
  const name = (cart.contact && (cart.contact.name || cart.contact.firstName)) || 'there';
  const itemCount = (cart.items || []).reduce((n, it) => n + (Number(it.qty) || 1), 0);
  const lines = [];
  lines.push(`Hi ${name}! Aap ka cart abhi tak pending hai \u2014 ${itemCount} item${itemCount === 1 ? '' : 's'} (${config.currency} ${cart.total || 0}).`);
  if (isFinal && coupon) {
    lines.push(`Last chance: code \u201C${coupon}\u201D laga ke abhi checkout complete karein.`);
  } else if (stepIdx === 0) {
    lines.push('Checkout sirf 1 click door hai. Continue karein?');
  } else {
    lines.push('Hum ne aap ke items hold kar rakhe hain. Order complete karna chahein to bata dein.');
  }
  return lines.join('\n');
}

// The tick: scan carts, mark abandonment, draft due nudges. Idempotent per step.
// Returns a summary. Does NOT send unless config.liveSend (still routed through a notifier).
function tick({ tenantId, at } = {}) {
  const ts = at || now();
  return withDb(db => {
    const summary = { scanned: 0, abandoned: 0, drafted: 0, expired: 0, live: config.liveSend, drafts: [] };
    for (const key of Object.keys(db.carts)) {
      const cart = db.carts[key];
      if (tenantId && cart.tenantId !== tenantId) continue;
      summary.scanned++;
      if (cart.status === 'converted' || cart.status === 'lost') continue;

      const idleMs = ts - (cart.updatedAt || cart.createdAt);
      // expire
      if (idleMs >= minsToMs(config.expireAfterMinutes)) {
        cart.status = 'lost'; cart.updatedAt = ts; summary.expired++; continue;
      }
      // abandonment gate
      if (cart.status === 'active' && idleMs >= minsToMs(config.abandonAfterMinutes)) {
        cart.status = 'abandoned';
        cart.abandonedAt = ts;
        summary.abandoned++;
        notify(cart.tenantId, 'cart.abandoned', { cartId: cart.cartId, total: cart.total });
      }
      if (cart.status !== 'abandoned') continue;

      const sent = cart.nudgesSent || 0;
      if (sent >= config.maxNudges || sent >= config.nudgeStepsMinutes.length) continue;
      const stepDelay = config.nudgeStepsMinutes[sent];
      const dueAt = (cart.abandonedAt || ts) + minsToMs(stepDelay);
      if (ts < dueAt) continue; // not due yet
      if (isQuietHour(new Date(ts))) continue; // hold for quiet hours

      const isFinal = (sent + 1 >= config.maxNudges) || (sent + 1 >= config.nudgeStepsMinutes.length);
      let coupon = '';
      if (isFinal && config.incentiveOnFinalNudge) coupon = issueIncentiveCoupon(cart.tenantId, cart.cartId);
      const body = buildMessage(cart, sent, isFinal, coupon);
      const nudge = {
        id: uid('nudge'),
        tenantId: cart.tenantId,
        cartId: cart.cartId,
        step: sent + 1,
        body,
        coupon: coupon || null,
        to: cart.contact ? (cart.contact.phone || cart.contact.email || null) : null,
        status: config.liveSend ? 'queued' : 'draft',
        createdAt: ts,
      };
      db.nudges.push(nudge);
      cart.nudgesSent = sent + 1;
      cart.lastNudgeAt = ts;
      cart.updatedAt = ts;
      summary.drafted++;
      summary.drafts.push({ cartId: cart.cartId, step: nudge.step, status: nudge.status });
      if (config.liveSend) notify(cart.tenantId, 'cart.nudge.queued', { cartId: cart.cartId, step: nudge.step });
    }
    return summary;
  });
}

function listCarts({ tenantId, status } = {}) {
  const db = load();
  return Object.values(db.carts)
    .filter(c => (!tenantId || c.tenantId === tenantId) && (!status || c.status === status))
    .map(c => Object.assign({}, c, { contact: maskContact(c.contact) }));
}

function listNudges({ tenantId, status } = {}) {
  const db = load();
  return db.nudges.filter(n => (!tenantId || n.tenantId === tenantId) && (!status || n.status === status));
}

function stats({ tenantId } = {}) {
  const db = load();
  const carts = Object.values(db.carts).filter(c => !tenantId || c.tenantId === tenantId);
  const by = { active: 0, abandoned: 0, converted: 0, lost: 0 };
  let recoveredValue = 0, abandonedValue = 0;
  for (const c of carts) {
    by[c.status] = (by[c.status] || 0) + 1;
    if (c.status === 'converted') recoveredValue += Number(c.total) || 0;
    if (c.status === 'abandoned' || c.status === 'lost') abandonedValue += Number(c.total) || 0;
  }
  const draftedNudges = db.nudges.filter(n => !tenantId || n.tenantId === tenantId).length;
  return { totals: by, recoveredValue, abandonedValue, draftedNudges, currency: config.currency };
}

module.exports = {
  upsertCart, markConverted, tick, listCarts, listNudges, stats,
  _internal: { isQuietHour, buildMessage },
};
