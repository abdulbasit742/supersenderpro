'use strict';
/**
 * customer360.js — CRM Feature #1: the unified Customer 360 profile.
 *
 * Today customer data is scattered: orders in one file, loyalty in another, subscriptions in a third,
 * messages somewhere else. Nothing gives you ONE view of a person. This is that view — the spine the
 * whole product hangs off, because marketing segments, payments, and support all need to know "who is
 * this customer, fully".
 *
 * Design:
 *   - Identity + CRM-owned fields (name, tags, notes, consent) are stored here (JSON cache).
 *   - Everything else is pulled live from the systems that own it, via injected providers:
 *       registerProvider('orders',        (key) => ({ orderCount, totalSpent, lastOrderAt, orders }))
 *       registerProvider('loyalty',       (key) => ({ points, tier, ... }))
 *       registerProvider('subscriptions', (key) => ([ { planId, status, ... } ]))
 *       registerProvider('messages',      (key) => ({ lastInboundAt, lastOutboundAt, threadCount }))
 *   - getProfile(key) merges identity + all providers into one object, and flattens the most useful
 *     derived fields to the top level so Feature #1 marketing segments can target them directly
 *     (totalSpent, orderCount, lastOrderAt, loyaltyTier, hasActiveSub, ...).
 *
 * This keeps CRM decoupled: it never duplicates the source of truth, it composes it.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'crm_profiles.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { profiles: {} }; }
  catch { return { profiles: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

const nowIso = () => new Date().toISOString();
function normKey(contactOrKey) {
  const raw = String((contactOrKey && (contactOrKey.phone || contactOrKey.id)) || contactOrKey || '').trim();
  return raw.replace(/[^\dA-Za-z@._+-]/g, '');
}

// ---------------------------------------------------------------------------
// Source providers (injected at wire-time so CRM doesn't own others' data)
// ---------------------------------------------------------------------------
const providers = {}; // name -> (key) => object|array (sync or async)
function registerProvider(name, fn) {
  if (typeof fn === 'function') providers[name] = fn;
  return Object.keys(providers);
}

// ---------------------------------------------------------------------------
// Identity / CRM-owned fields
// ---------------------------------------------------------------------------
function upsertIdentity(contact) {
  const key = normKey(contact);
  if (!key) throw new Error('contact needs phone or id');
  const data = load();
  const p = data.profiles[key] || { key, createdAt: nowIso(), tags: [], notes: [] };
  if (contact.name) p.name = contact.name;
  if (contact.email) p.email = contact.email;
  if (contact.phone) p.phone = contact.phone;
  if (contact.city) p.city = contact.city;
  if (contact.country) p.country = contact.country;
  if (typeof contact.optedIn === 'boolean') p.optedIn = contact.optedIn;
  p.updatedAt = nowIso();
  data.profiles[key] = p;
  save(data);
  return p;
}

function addTag(contactOrKey, tag) {
  const key = normKey(contactOrKey);
  const data = load();
  const p = data.profiles[key];
  if (!p) return null;
  p.tags = Array.from(new Set([...(p.tags || []), String(tag)]));
  p.updatedAt = nowIso();
  save(data);
  return p;
}
function removeTag(contactOrKey, tag) {
  const key = normKey(contactOrKey);
  const data = load();
  const p = data.profiles[key];
  if (!p) return null;
  p.tags = (p.tags || []).filter(t => t !== tag);
  p.updatedAt = nowIso();
  save(data);
  return p;
}
function addNote(contactOrKey, text, author = 'system') {
  const key = normKey(contactOrKey);
  const data = load();
  const p = data.profiles[key];
  if (!p) return null;
  p.notes = [...(p.notes || []), { text: String(text), author, at: nowIso() }];
  p.updatedAt = nowIso();
  save(data);
  return p;
}

// ---------------------------------------------------------------------------
// The 360 read
// ---------------------------------------------------------------------------
async function callProvider(name, key) {
  try { return providers[name] ? await providers[name](key) : null; }
  catch { return null; }
}

/**
 * Build the full unified profile: identity + all registered providers + flattened derived fields.
 */
async function getProfile(contactOrKey) {
  const key = normKey(contactOrKey);
  if (!key) return null;
  const data = load();
  const identity = data.profiles[key] || { key, tags: [], notes: [] };

  const [orders, loyalty, subscriptions, messages] = await Promise.all([
    callProvider('orders', key),
    callProvider('loyalty', key),
    callProvider('subscriptions', key),
    callProvider('messages', key)
  ]);

  const subs = Array.isArray(subscriptions) ? subscriptions : [];
  const hasActiveSub = subs.some(s => s.status === 'active' || s.status === 'trialing');

  return {
    key,
    identity,
    // raw blocks
    orders: orders || null,
    loyalty: loyalty || null,
    subscriptions: subs,
    messages: messages || null,
    // flattened derived fields (segments understand these directly)
    name: identity.name || null,
    phone: identity.phone || key,
    email: identity.email || null,
    city: identity.city || null,
    tags: identity.tags || [],
    optedIn: identity.optedIn !== false,
    orderCount: orders ? Number(orders.orderCount || 0) : 0,
    totalSpent: orders ? Number(orders.totalSpent || 0) : 0,
    lastOrderAt: orders ? (orders.lastOrderAt || null) : null,
    loyaltyPoints: loyalty ? Number(loyalty.points || 0) : 0,
    loyaltyTier: loyalty ? (loyalty.tier || 'bronze') : 'bronze',
    hasActiveSub,
    lastInboundAt: messages ? (messages.lastInboundAt || null) : null,
    generatedAt: nowIso()
  };
}

/**
 * Build profiles for a list of contacts — handy as the CRM contact loader that marketing segments
 * consume (each item already has totalSpent/loyaltyTier/etc. flattened for rule matching).
 */
async function getProfilesFor(contacts = []) {
  return Promise.all((contacts || []).map(c => getProfile(c)));
}

function listIdentities() {
  return Object.values(load().profiles);
}

module.exports = {
  registerProvider,
  upsertIdentity,
  addTag,
  removeTag,
  addNote,
  getProfile,
  getProfilesFor,
  listIdentities
};
