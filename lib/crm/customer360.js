'use strict';
/**
 * customer360.js — CRM Feature #1: the unified customer profile ("Customer 360").
 *
 * Today customer data is scattered (storeCRM, orders, inbox, loyalty). This builds ONE profile per
 * contact (keyed by phone) that merges identity + a unified activity timeline + derived stats. It is
 * the single source of truth other departments read: segments (marketing #1) target on its stats,
 * the AI agent reads its timeline for context, sales reads its stage.
 *
 * Design:
 *   - A profile has stable identity fields + an append-only `timeline` of events.
 *   - Stats (totalSpent, orderCount, lastOrderAt, firstOrderAt, messageCount, ...) are DERIVED from
 *     the timeline so they're always consistent — never hand-maintained.
 *   - recordEvent() is how every other module feeds it (an order, a message, a payment, a note).
 *   - enrichForSegments() returns the flat shape the segment engine expects.
 *
 * Storage: JSON (data/crm_profiles.json). Swap to Postgres later; API stays the same.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'crm_profiles.json');

const EVENT_TYPES = ['order', 'message', 'payment', 'loyalty', 'stage', 'note', 'optin', 'optout'];

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { profiles: {} }; }
  catch { return { profiles: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

const nowIso = () => new Date().toISOString();
function normPhone(v) {
  const raw = String(v || '').trim();
  if (!raw) return '';
  if (raw.includes('@')) return raw.split('@')[0].replace(/[^\d]/g, '');
  return raw.replace(/[^\d]/g, '');
}
function keyOf(contact) {
  if (contact && typeof contact === 'object') return normPhone(contact.phone || contact.id);
  return normPhone(contact);
}

function blankProfile(key, seed = {}) {
  return {
    key,
    name: seed.name || '',
    phone: seed.phone || key,
    email: seed.email || '',
    tags: Array.isArray(seed.tags) ? seed.tags : [],
    stage: seed.stage || 'lead',          // lead | active | customer | churned (sales can refine)
    optedIn: seed.optedIn !== false,
    timeline: [],
    stats: emptyStats(),
    createdAt: nowIso(),
    updatedAt: nowIso()
  };
}
function emptyStats() {
  return {
    totalSpent: 0, orderCount: 0, messageCount: 0,
    firstOrderAt: null, lastOrderAt: null, lastMessageAt: null, lastContactAt: null
  };
}

// Recompute derived stats from the timeline (single source of truth).
function recompute(profile) {
  const s = emptyStats();
  for (const ev of profile.timeline) {
    if (ev.type === 'order' || ev.type === 'payment') {
      const amt = Number(ev.amount || 0);
      if (ev.type === 'order') {
        s.orderCount += 1;
        s.firstOrderAt = s.firstOrderAt ? minIso(s.firstOrderAt, ev.at) : ev.at;
        s.lastOrderAt = s.lastOrderAt ? maxIso(s.lastOrderAt, ev.at) : ev.at;
      }
      if (amt > 0) s.totalSpent += amt;
    } else if (ev.type === 'message') {
      s.messageCount += 1;
      s.lastMessageAt = s.lastMessageAt ? maxIso(s.lastMessageAt, ev.at) : ev.at;
    }
    s.lastContactAt = s.lastContactAt ? maxIso(s.lastContactAt, ev.at) : ev.at;
  }
  s.totalSpent = Math.round(s.totalSpent * 100) / 100;
  profile.stats = s;
}
function minIso(a, b) { return new Date(a) <= new Date(b) ? a : b; }
function maxIso(a, b) { return new Date(a) >= new Date(b) ? a : b; }

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function upsertProfile(contact, fields = {}) {
  const key = keyOf(contact);
  if (!key) throw new Error('contact needs a phone or id');
  const data = load();
  let p = data.profiles[key];
  if (!p) p = data.profiles[key] = blankProfile(key, { phone: key, ...fields, ...(typeof contact === 'object' ? contact : {}) });
  // apply editable fields
  for (const f of ['name', 'email', 'stage', 'optedIn']) if (fields[f] !== undefined) p[f] = fields[f];
  if (Array.isArray(fields.tags)) p.tags = Array.from(new Set([...(p.tags || []), ...fields.tags]));
  p.updatedAt = nowIso();
  save(data);
  return p;
}

/**
 * Record an activity event on a profile (creates the profile if missing).
 * @param {Object|string} contact
 * @param {Object} ev  { type, amount?, text?, ref?, meta?, at? }
 */
function recordEvent(contact, ev = {}) {
  const key = keyOf(contact);
  if (!key) throw new Error('contact needs a phone or id');
  if (!EVENT_TYPES.includes(ev.type)) throw new Error(`invalid event type "${ev.type}". Valid: ${EVENT_TYPES.join(', ')}`);
  const data = load();
  let p = data.profiles[key];
  if (!p) p = data.profiles[key] = blankProfile(key, typeof contact === 'object' ? contact : { phone: key });

  const entry = {
    type: ev.type,
    amount: ev.amount != null ? Number(ev.amount) : undefined,
    text: ev.text || undefined,
    ref: ev.ref || undefined,
    meta: ev.meta || undefined,
    at: ev.at || nowIso()
  };
  p.timeline.push(entry);
  if (p.timeline.length > 2000) p.timeline = p.timeline.slice(-2000);

  // light stage progression: first order -> customer
  if (ev.type === 'order' && p.stage === 'lead') p.stage = 'customer';
  if (ev.type === 'optout') p.optedIn = false;
  if (ev.type === 'optin') p.optedIn = true;

  recompute(p);
  p.updatedAt = nowIso();
  save(data);
  return p;
}

function getProfile(contact) {
  return load().profiles[keyOf(contact)] || null;
}
function listProfiles() {
  return Object.values(load().profiles);
}
function getTimeline(contact, limit = 100) {
  const p = getProfile(contact);
  if (!p) return [];
  return p.timeline.slice(-Math.max(1, Number(limit) || 100)).reverse();
}

/**
 * Flatten a profile into the shape the segment engine (marketing #1) reads. Optionally pass a
 * loyalty enricher so loyaltyTier/loyaltyPoints come along too.
 */
function enrichForSegments(profile, loyaltyEnrich) {
  const base = {
    phone: profile.phone,
    name: profile.name,
    email: profile.email,
    tags: profile.tags,
    stage: profile.stage,
    optedIn: profile.optedIn,
    totalSpent: profile.stats.totalSpent,
    orderCount: profile.stats.orderCount,
    messageCount: profile.stats.messageCount,
    firstOrderAt: profile.stats.firstOrderAt,
    lastOrderAt: profile.stats.lastOrderAt,
    createdAt: profile.createdAt
  };
  return typeof loyaltyEnrich === 'function' ? loyaltyEnrich(base) : base;
}

/** Convenience: all profiles as segment-ready contacts (use as the CRM contact loader). */
function asSegmentContacts(loyaltyEnrich) {
  return listProfiles().map(p => enrichForSegments(p, loyaltyEnrich));
}

module.exports = {
  EVENT_TYPES,
  upsertProfile,
  recordEvent,
  getProfile,
  listProfiles,
  getTimeline,
  enrichForSegments,
  asSegmentContacts
};
