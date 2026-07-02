'use strict';
/**
 * usageLimits.js — Billing Feature #6: usage metering + plan enforcement.
 *
 * Plans (lib/saasBilling/planRegistry.js) define limits like socialPostsPerDay, connectedSocialAccounts,
 * teamMembers, apiCallsPerMonth. Defining them is useless unless something COUNTS usage and BLOCKS
 * (or upsells) when a tenant exceeds their plan. This is that enforcement layer.
 *
 * For each metered key it tracks a tenant's usage, compares against their plan limit, and:
 *   - allows or denies (consume returns ok:false when over)
 *   - emits 'limit_near' (>=80%) and 'limit_reached' so a workflow can send an upsell
 *   - -1 in the plan means unlimited
 *
 * Daily keys (those ending in PerDay) auto-reset each day. Monthly keys reset each month.
 * Plan limits are read via an injected resolver so this isn't hard-coupled to the registry.
 *
 * Storage: JSON (data/usage.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'usage.json');

let limitResolver = null; // (tenantId, key) => number  (-1 unlimited, undefined = no limit set)
let eventEmitter = null;  // (event, ctx) => void
function setLimitResolver(fn) { limitResolver = typeof fn === 'function' ? fn : null; }
function setEventEmitter(fn) { eventEmitter = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { usage: {} }; }
  catch { return { usage: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

function periodFor(key) {
  if (/PerDay$/.test(key)) return new Date().toISOString().slice(0, 10);      // YYYY-MM-DD
  if (/PerMonth$/.test(key)) return new Date().toISOString().slice(0, 7);     // YYYY-MM
  return 'total';                                                              // lifetime/cumulative
}
function cell(data, tenantId, key) {
  const t = data.usage[tenantId] || (data.usage[tenantId] = {});
  const period = periodFor(key);
  const slot = t[key] || (t[key] = {});
  if (slot.period !== period) { slot.period = period; slot.count = 0; } // auto-reset on new period
  return slot;
}

function limitFor(tenantId, key) {
  if (!limitResolver) return -1; // no resolver = treat as unlimited (don't block by accident)
  const v = limitResolver(String(tenantId), key);
  return (v === undefined || v === null) ? -1 : Number(v);
}

/** Read current usage + limit + remaining for a key. */
function status(tenantId, key) {
  const data = load();
  const slot = cell(data, String(tenantId), key);
  save(data);
  const limit = limitFor(tenantId, key);
  const used = slot.count || 0;
  return { key, used, limit, unlimited: limit === -1, remaining: limit === -1 ? Infinity : Math.max(0, limit - used), period: slot.period };
}

/** Would `amount` more be allowed? (does not consume) */
function checkLimit(tenantId, key, amount = 1) {
  const s = status(tenantId, key);
  if (s.unlimited) return { ok: true, ...s };
  return { ok: (s.used + amount) <= s.limit, ...s };
}

/**
 * Consume `amount` of a metered key. Returns { ok, used, limit, remaining }. When ok:false the
 * caller should block the action and prompt an upgrade. Emits near/reached events for upsell flows.
 */
function consume(tenantId, key, amount = 1) {
  const data = load();
  const slot = cell(data, String(tenantId), key);
  const limit = limitFor(tenantId, key);
  const used = slot.count || 0;

  if (limit !== -1 && (used + amount) > limit) {
    save(data);
    try { if (eventEmitter) eventEmitter('limit_reached', { tenantId: String(tenantId), key, limit, used }); } catch {}
    return { ok: false, used, limit, remaining: Math.max(0, limit - used) };
  }

  slot.count = used + amount;
  save(data);

  if (limit !== -1) {
    const ratio = slot.count / limit;
    if (ratio >= 0.8 && (used / limit) < 0.8) { // crossed the 80% line on this call
      try { if (eventEmitter) eventEmitter('limit_near', { tenantId: String(tenantId), key, limit, used: slot.count }); } catch {}
    }
  }
  return { ok: true, used: slot.count, limit, remaining: limit === -1 ? Infinity : Math.max(0, limit - slot.count) };
}

/** Full usage snapshot for a tenant (dashboard). */
function tenantUsage(tenantId) {
  const data = load();
  const t = data.usage[String(tenantId)] || {};
  const out = {};
  for (const key of Object.keys(t)) out[key] = status(tenantId, key);
  return out;
}

module.exports = { setLimitResolver, setEventEmitter, status, checkLimit, consume, tenantUsage };
