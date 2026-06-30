'use strict';
/**
 * customer360.js — CRM Feature #1: the unified customer profile.
 *
 * Marketing (#1-#5) and Payments (#1-#5) both needed "who is this customer, really?" — their spend,
 * their orders, their messages, their loyalty tier, their subscription. That data is scattered across
 * the app. Customer 360 stitches it into ONE resolved profile per contact, with computed stats that
 * segments can target directly (totalSpent, orderCount, lastOrderDaysAgo, loyaltyTier, …).
 *
 * Storage-agnostic by design: you inject how to load each source (contacts, orders, messages,
 * loyalty, subscriptions). This module merges + computes; it doesn't own a database. That keeps it
 * working today (JSON files) and after the Postgres migration unchanged.
 */

const loaders = {
  contact: null,        // (key) => { name, phone, email, city, tags?, createdAt? }
  orders: null,         // (key) => [{ id, total, status, createdAt }]
  messages: null,       // (key) => [{ direction, text, at }]
  loyalty: null,        // (key) => { points, lifetimePoints, tier } | null
  subscriptions: null   // (key) => [{ planId, status, currentPeriodEnd }]
};
function configure(opts = {}) {
  for (const k of Object.keys(loaders)) if (typeof opts[k] === 'function') loaders[k] = opts[k];
  return { wired: Object.keys(loaders).filter(k => loaders[k]) };
}

function keyOf(contact) {
  return String((contact && (contact.phone || contact.email || contact.id)) || contact || '').trim();
}
const daysAgo = (d) => {
  if (!d) return undefined;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? undefined : Math.floor((Date.now() - t) / 86400000);
};
const safe = (fn, fallback) => { try { return fn(); } catch { return fallback; } };

/**
 * Build the full 360 profile for one customer.
 * @param {Object|string} contact contact object or phone/email/id
 */
function getProfile(contact) {
  const key = keyOf(contact);
  if (!key) throw new Error('contact needs phone/email/id');

  const base = (loaders.contact && safe(() => loaders.contact(key), null)) || (typeof contact === 'object' ? contact : { id: key });
  const orders = (loaders.orders && safe(() => loaders.orders(key), [])) || [];
  const messages = (loaders.messages && safe(() => loaders.messages(key), [])) || [];
  const loyalty = (loaders.loyalty && safe(() => loaders.loyalty(key), null)) || null;
  const subscriptions = (loaders.subscriptions && safe(() => loaders.subscriptions(key), [])) || [];

  // computed order stats
  const paidOrders = orders.filter(o => ['paid', 'completed', 'fulfilled'].includes(String(o.status || '').toLowerCase()));
  const totalSpent = Math.round(paidOrders.reduce((s, o) => s + Number(o.total || 0), 0) * 100) / 100;
  const orderDates = orders.map(o => new Date(o.createdAt || 0).getTime()).filter(Boolean).sort((a, b) => a - b);
  const firstOrderAt = orderDates.length ? new Date(orderDates[0]).toISOString() : null;
  const lastOrderAt = orderDates.length ? new Date(orderDates[orderDates.length - 1]).toISOString() : null;

  // unified, time-sorted timeline across sources
  const timeline = [
    ...orders.map(o => ({ type: 'order', at: o.createdAt, ref: o.id, detail: { total: o.total, status: o.status } })),
    ...messages.map(m => ({ type: 'message', at: m.at, detail: { direction: m.direction, text: m.text } }))
  ].filter(e => e.at).sort((a, b) => new Date(b.at) - new Date(a.at));

  const computed = {
    orderCount: orders.length,
    paidOrderCount: paidOrders.length,
    totalSpent,
    avgOrderValue: paidOrders.length ? Math.round((totalSpent / paidOrders.length) * 100) / 100 : 0,
    firstOrderAt,
    lastOrderAt,
    lastOrderDaysAgo: daysAgo(lastOrderAt),
    createdDaysAgo: daysAgo(base.createdAt),
    messageCount: messages.length,
    hasOrdered: orders.length > 0,
    loyaltyPoints: loyalty ? loyalty.points : 0,
    loyaltyLifetime: loyalty ? loyalty.lifetimePoints : 0,
    loyaltyTier: loyalty ? loyalty.tier : null,
    activeSubscriptions: subscriptions.filter(s => s.status === 'active' || s.status === 'trialing').length
  };

  return {
    key,
    identity: {
      name: base.name || null,
      phone: base.phone || (typeof contact === 'string' ? contact : null),
      email: base.email || null,
      city: base.city || (base.location && base.location.city) || null,
      tags: base.tags || [],
      createdAt: base.createdAt || null
    },
    stats: computed,
    subscriptions,
    loyalty,
    timeline,
    generatedAt: new Date().toISOString()
  };
}

/**
 * Flatten a profile into a single contact object suitable for the segment engine
 * (Marketing #1). All computed stats become top-level fields so segment rules can target them.
 */
function toSegmentContact(contact) {
  const p = getProfile(contact);
  return {
    ...p.identity,
    ...p.stats,
    key: p.key
  };
}

module.exports = { configure, getProfile, toSegmentContact };
