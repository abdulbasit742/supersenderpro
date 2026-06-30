'use strict';
/**
 * lib/settings/index.js - per-tenant settings / preferences (key-value with a known schema).
 * Centralizes the small config each tenant needs: white-label name/logo, business hours, locale,
 * default currency, reply tone, etc. Tenant-scoped via lib/db; unknown keys are rejected so the
 * store stays a documented surface rather than a junk drawer.
 */
const repo = require('../db');
const COLLECTION = 'settings';

// Known settings: { key: { type, default, note } }. Extend as features need.
const SCHEMA = {
  brandName: { type: 'string', default: 'SuperSender', note: 'white-label display name' },
  brandLogoUrl: { type: 'string', default: '', note: 'white-label logo URL' },
  brandColor: { type: 'string', default: '#22c55e', note: 'primary UI color' },
  locale: { type: 'string', default: 'en', note: 'default locale' },
  timezone: { type: 'string', default: 'Asia/Karachi', note: 'tenant timezone' },
  currency: { type: 'string', default: 'PKR', note: 'default currency' },
  businessHours: { type: 'json', default: { mon: '09:00-18:00', tue: '09:00-18:00', wed: '09:00-18:00', thu: '09:00-18:00', fri: '09:00-18:00', sat: 'closed', sun: 'closed' }, note: 'per-day open hours' },
  autoReplyTone: { type: 'string', default: 'friendly', note: 'AI reply tone' },
  followUpEnabled: { type: 'bool', default: true, note: 'auto follow-ups on/off' },
};

function coerce(type, v) {
  if (type === 'bool') return v === true || v === 'true' || v === 1 || v === '1';
  if (type === 'json') { if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return v; } }
  return v == null ? v : String(v);
}

async function row(tenantId) {
  repo.assertTenant(tenantId);
  const rows = await repo.list(tenantId, COLLECTION, {});
  return rows[0] || null;
}

async function getAll(tenantId) {
  const r = await row(tenantId);
  const stored = (r && r.values) || {};
  const out = {};
  for (const [k, def] of Object.entries(SCHEMA)) out[k] = (k in stored) ? stored[k] : def.default;
  return out;
}

async function get(tenantId, key) {
  if (!SCHEMA[key]) throw new Error('unknown setting: ' + key);
  const all = await getAll(tenantId);
  return all[key];
}

async function set(tenantId, patch = {}) {
  repo.assertTenant(tenantId);
  const unknown = Object.keys(patch).filter((k) => !SCHEMA[k]);
  if (unknown.length) throw new Error('unknown setting(s): ' + unknown.join(', '));
  const r = await row(tenantId);
  const values = Object.assign({}, (r && r.values) || {});
  for (const [k, v] of Object.entries(patch)) values[k] = coerce(SCHEMA[k].type, v);
  if (r) await repo.update(tenantId, COLLECTION, r.id, { values });
  else await repo.create(tenantId, COLLECTION, { values });
  return getAll(tenantId);
}

async function reset(tenantId, key) {
  const r = await row(tenantId);
  if (!r) return getAll(tenantId);
  const values = Object.assign({}, r.values || {});
  if (key) delete values[key]; else { for (const k of Object.keys(values)) delete values[k]; }
  await repo.update(tenantId, COLLECTION, r.id, { values });
  return getAll(tenantId);
}

module.exports = { SCHEMA, getAll, get, set, reset, coerce };
