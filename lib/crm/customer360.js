'use strict';
/**
 * customer360.js — CRM Feature #1: the unified customer profile.
 *
 * The system has customer data scattered everywhere: orders, inbox messages, loyalty points,
 * subscriptions, marketing segments. Nothing stitched them into ONE view, so automation was blind.
 * Customer 360 is that single source of truth: give it a customer key (phone/email/id) and it merges
 * every signal into one profile, and computes the derived fields segments + scoring care about.
 *
 * Storage-agnostic by design: you inject loaders for each data source, so this couples to nothing
 * and works with the JSON stores today and Postgres after the migration.
 *
 *   configure({ loadContact, loadOrders, loadMessages, loadLoyalty, loadSubscriptions })
 *
 * Each loader is (customerKey) => data (sync or async). All optional — missing ones are skipped.
 */

const sources = {
  loadContact: null,        // (key) => { name, phone, email, city, tags, optedIn, createdAt, ... }
  loadOrders: null,         // (key) => [{ id, total, status, createdAt }]
  loadMessages: null,       // (key) => [{ direction, text, at }]
  loadLoyalty: null,        // (key) => { points, lifetimePoints, tier }
  loadSubscriptions: null   // (key) => [{ planId, status, currentPeriodEnd }]
};
function configure(opts = {}) {
  for (const k of Object.keys(sources)) if (typeof opts[k] === 'function') sources[k] = opts[k];
  return { configured: Object.keys(sources).filter(k => sources[k]) };
}

async function call(fn, key, fallback) {
  if (!fn) return fallback;
  try { return await fn(key); } catch { return fallback; }
}

const toTime = (d) => { const t = new Date(d).getTime(); return Number.isNaN(t) ? 0 : t; };
const daysAgo = (d) => { const t = toTime(d); return t ? Math.floor((Date.now() - t) / 86400000) : null; };

/**
 * Lifecycle stage from order history — the spine of retention automation.
 *   lead       : no orders
 *   new        : first order within 30 days
 *   active     : ordered within 60 days
 *   at_risk    : last order 60–120 days ago
 *   churned    : last order > 120 days ago
 */
function lifecycleStage({ orderCount, lastOrderDaysAgo, firstOrderDaysAgo }) {
  if (!orderCount) return 'lead';
  if (firstOrderDaysAgo != null && firstOrderDaysAgo <= 30) return 'new';
  if (lastOrderDaysAgo != null && lastOrderDaysAgo <= 60) return 'active';
  if (lastOrderDaysAgo != null && lastOrderDaysAgo <= 120) return 'at_risk';
  return 'churned';
}

function summariseOrders(orders) {
  const valid = Array.isArray(orders) ? orders : [];
  const paid = valid.filter(o => !o.status || ['paid','completed','fulfilled','complete'].includes(String(o.status).toLowerCase()));
  const totalSpent = Math.round(paid.reduce((s, o) => s + Number(o.total || 0), 0) * 100) / 100;
  const times = valid.map(o => toTime(o.createdAt)).filter(Boolean).sort((a,b) => a-b);
  const firstAt = times[0] || null;
  const lastAt = times[times.length - 1] || null;
  return {
    orderCount: valid.length,
    paidOrderCount: paid.length,
    totalSpent,
    avgOrderValue: paid.length ? Math.round((totalSpent / paid.length) * 100) / 100 : 0,
    firstOrderAt: firstAt ? new Date(firstAt).toISOString() : null,
    lastOrderAt: lastAt ? new Date(lastAt).toISOString() : null
  };
}

/**
 * Build the unified profile for one customer.
 * Returns a flat object so it can be fed straight into the segment engine (marketing #1).
 */
async function getProfile(customerKey) {
  const key = String(customerKey || '').trim();
  if (!key) throw new Error('customerKey required');

  const [contact, orders, messages, loyalty, subscriptions] = await Promise.all([
    call(sources.loadContact, key, {}),
    call(sources.loadOrders, key, []),
    call(sources.loadMessages, key, []),
    call(sources.loadLoyalty, key, null),
    call(sources.loadSubscriptions, key, [])
  ]);

  const orderSummary = summariseOrders(orders);
  const lastOrderDaysAgo = orderSummary.lastOrderAt ? daysAgo(orderSummary.lastOrderAt) : null;
  const firstOrderDaysAgo = orderSummary.firstOrderAt ? daysAgo(orderSummary.firstOrderAt) : null;
  const stage = lifecycleStage({ orderCount: orderSummary.orderCount, lastOrderDaysAgo, firstOrderDaysAgo });

  const msgs = Array.isArray(messages) ? messages : [];
  const lastInbound = msgs.filter(m => m.direction === 'in').map(m => toTime(m.at)).sort((a,b)=>b-a)[0] || null;

  // Flat profile — every key here can be targeted by a segment rule.
  return {
    key,
    name: contact.name || null,
    phone: contact.phone || (key.includes('@') ? null : key),
    email: contact.email || (key.includes('@') ? key : null),
    city: contact.city || null,
    country: contact.country || null,
    tags: contact.tags || [],
    optedIn: contact.optedIn !== false,
    createdAt: contact.createdAt || null,
    createdDaysAgo: contact.createdAt ? daysAgo(contact.createdAt) : null,

    // order-derived
    ...orderSummary,
    hasOrdered: orderSummary.orderCount > 0,
    lastOrderDaysAgo,
    firstOrderDaysAgo,

    // engagement
    messageCount: msgs.length,
    lastInboundAt: lastInbound ? new Date(lastInbound).toISOString() : null,
    lastInboundDaysAgo: lastInbound ? daysAgo(new Date(lastInbound).toISOString()) : null,

    // loyalty (marketing #4)
    loyaltyPoints: loyalty ? loyalty.points : 0,
    loyaltyLifetime: loyalty ? loyalty.lifetimePoints : 0,
    loyaltyTier: loyalty ? loyalty.tier : 'bronze',

    // billing (payments #2)
    subscriptions: Array.isArray(subscriptions) ? subscriptions : [],
    hasActiveSubscription: (Array.isArray(subscriptions) ? subscriptions : []).some(s => ['active','trialing'].includes(s.status)),

    // the headline
    lifecycleStage: stage,

    // keep raw timelines for a profile screen
    _timeline: { orders, messages: msgs }
  };
}

/**
 * Build profiles for many keys — e.g. to feed the segment engine over the whole base.
 * Returns flat profiles WITHOUT the heavy _timeline, suited for filtering.
 */
async function getProfiles(keys = []) {
  const out = [];
  for (const k of keys) {
    try {
      const p = await getProfile(k);
      const { _timeline, ...flat } = p;
      out.push(flat);
    } catch { /* skip bad key */ }
  }
  return out;
}

module.exports = { configure, getProfile, getProfiles, lifecycleStage };
