'use strict';
/**
 * subscriptionLifecycle.js — Payments & Billing Feature #2: the subscription state machine.
 *
 * Feature #1 (fulfillment) activates a plan when a payment is verified. This module owns what happens
 * AFTER: when does it renew, what if payment fails, when does access actually stop.
 *
 * Status machine:
 *   trialing -> active -> past_due (grace) -> expired
 *                     -> cancelled (access until period end, then expired)
 *
 * Key dates per subscription:
 *   currentPeriodStart / currentPeriodEnd  — the paid-through window
 *   graceUntil                              — if renewal fails, access continues until here
 *   cancelAtPeriodEnd                       — true = don't renew, expire at currentPeriodEnd
 *
 * A periodic tick() moves subscriptions between states based on "now". Side effects (start dunning,
 * cut off access, send receipts) are delegated to injected hooks so this stays decoupled + testable.
 *
 * Storage: JSON (data/subscriptions.json), matching the rest of the app.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'subscriptions.json');

// Defaults (configurable). Grace = extra days of access after a failed renewal before cut-off.
let CONFIG = {
  graceDays: 3,
  // map of planId -> period length in days; fallback used if a plan isn't listed
  defaultPeriodDays: 30,
  periodDaysByPlan: {}
};

// Injected lifecycle hooks (all optional): each is (subscription) => void | Promise
const hooks = {
  onActivate: null,
  onRenew: null,
  onPastDue: null,   // entered grace (renewal due/failed)
  onExpire: null,    // access actually ends
  onCancel: null
};

function configure(opts = {}) { CONFIG = { ...CONFIG, ...opts }; return CONFIG; }
function setHooks(h = {}) { for (const k of Object.keys(hooks)) if (typeof h[k] === 'function') hooks[k] = h[k]; return hooks; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { subs: [] }; }
  catch { return { subs: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

const now = () => Date.now();
const iso = (ms) => new Date(ms).toISOString();
const DAY = 86400000;

function periodDays(planId) {
  return Number(CONFIG.periodDaysByPlan[planId] || CONFIG.defaultPeriodDays || 30);
}
function customerKey(customer) {
  return String((customer && (customer.phone || customer.email || customer.id)) || customer || '').trim();
}
function subId(key, planId) { return `SUB-${key}-${planId}`; }

async function fire(hookName, sub) {
  try { if (hooks[hookName]) await hooks[hookName](sub); } catch (e) { /* never break the sweep */ }
}

// ---------------------------------------------------------------------------
// Create / activate (called from payment fulfillment)
// ---------------------------------------------------------------------------
/**
 * Activate (or renew) a subscription for a customer+plan. Idempotent-ish: activating an existing
 * active sub extends it (treated as a renewal).
 */
async function activate(customer, planId, opts = {}) {
  const key = customerKey(customer);
  if (!key) throw new Error('customer needs phone/email/id');
  if (!planId) throw new Error('planId is required');
  const data = load();
  const id = subId(key, planId);
  const days = Number(opts.periodDays || periodDays(planId));
  const tNow = now();
  let sub = data.subs.find(s => s.id === id);

  if (sub && (sub.status === 'active' || sub.status === 'trialing' || sub.status === 'past_due')) {
    // treat as renewal: extend from the later of now or current end
    const base = Math.max(tNow, new Date(sub.currentPeriodEnd || iso(tNow)).getTime());
    sub.currentPeriodStart = iso(base);
    sub.currentPeriodEnd = iso(base + days * DAY);
    sub.status = 'active';
    sub.graceUntil = null;
    sub.cancelAtPeriodEnd = false;
    sub.updatedAt = iso(tNow);
    sub.renewals = (sub.renewals || 0) + 1;
    save(data);
    await fire('onRenew', sub);
    return sub;
  }

  sub = {
    id,
    customerKey: key,
    customer,
    planId,
    status: 'active',
    currentPeriodStart: iso(tNow),
    currentPeriodEnd: iso(tNow + days * DAY),
    graceUntil: null,
    cancelAtPeriodEnd: false,
    renewals: 0,
    createdAt: iso(tNow),
    updatedAt: iso(tNow)
  };
  data.subs.push(sub);
  save(data);
  await fire('onActivate', sub);
  return sub;
}

/** Explicit renewal (e.g. successful recurring charge). Same as activate on an existing sub. */
async function renew(customer, planId, opts = {}) {
  return activate(customer, planId, opts);
}

/**
 * Cancel. Default: at period end (keep access until paid-through date). immediate=true ends now.
 */
async function cancel(customer, planId, { immediate = false } = {}) {
  const data = load();
  const sub = data.subs.find(s => s.id === subId(customerKey(customer), planId));
  if (!sub) return null;
  if (immediate) {
    sub.status = 'expired';
    sub.currentPeriodEnd = iso(now());
    sub.cancelAtPeriodEnd = false;
  } else {
    sub.cancelAtPeriodEnd = true;
  }
  sub.updatedAt = iso(now());
  save(data);
  await fire('onCancel', sub);
  if (sub.status === 'expired') await fire('onExpire', sub);
  return sub;
}

/** Mark a renewal payment as failed -> enter grace (past_due) until graceUntil, then expire. */
async function markRenewalFailed(customer, planId) {
  const data = load();
  const sub = data.subs.find(s => s.id === subId(customerKey(customer), planId));
  if (!sub) return null;
  sub.status = 'past_due';
  sub.graceUntil = iso(now() + (CONFIG.graceDays || 0) * DAY);
  sub.updatedAt = iso(now());
  save(data);
  await fire('onPastDue', sub);
  return sub;
}

// ---------------------------------------------------------------------------
// Sweep
// ---------------------------------------------------------------------------
/**
 * Move subscriptions between states based on the clock. Call on an interval (e.g. hourly cron).
 * - active past its period end & cancelAtPeriodEnd -> expired
 * - active past its period end (auto-renew expected) -> past_due + grace (renewal due)
 * - past_due past graceUntil -> expired
 * Returns counts of what changed.
 */
async function tick() {
  const data = load();
  const tNow = now();
  let renewalsDue = 0, expired = 0;

  for (const sub of data.subs) {
    const periodEnd = new Date(sub.currentPeriodEnd || 0).getTime();

    if (sub.status === 'active' && tNow >= periodEnd) {
      if (sub.cancelAtPeriodEnd) {
        sub.status = 'expired';
        sub.updatedAt = iso(tNow);
        expired++;
        await fire('onExpire', sub);
      } else {
        // renewal is due; enter grace and let dunning try to collect
        sub.status = 'past_due';
        sub.graceUntil = iso(tNow + (CONFIG.graceDays || 0) * DAY);
        sub.updatedAt = iso(tNow);
        renewalsDue++;
        await fire('onPastDue', sub);
      }
    } else if (sub.status === 'past_due') {
      const graceEnd = new Date(sub.graceUntil || 0).getTime();
      if (tNow >= graceEnd) {
        sub.status = 'expired';
        sub.updatedAt = iso(tNow);
        expired++;
        await fire('onExpire', sub);
      }
    }
  }
  save(data);
  return { renewalsDue, expired, at: iso(tNow) };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------
function getSubscription(customer, planId) {
  return load().subs.find(s => s.id === subId(customerKey(customer), planId)) || null;
}
function listForCustomer(customer) {
  const key = customerKey(customer);
  return load().subs.filter(s => s.customerKey === key);
}
/** Does this customer currently have access to a plan? (active or within grace/period.) */
function hasAccess(customer, planId) {
  const sub = getSubscription(customer, planId);
  if (!sub) return false;
  const tNow = now();
  if (sub.status === 'active' || sub.status === 'trialing') return true;
  if (sub.status === 'past_due') return tNow < new Date(sub.graceUntil || 0).getTime();
  if (sub.status === 'cancelled') return tNow < new Date(sub.currentPeriodEnd || 0).getTime();
  return false; // expired
}

module.exports = {
  configure,
  setHooks,
  activate,
  renew,
  cancel,
  markRenewalFailed,
  tick,
  getSubscription,
  listForCustomer,
  hasAccess
};
