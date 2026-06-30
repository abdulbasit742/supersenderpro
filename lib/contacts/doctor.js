// lib/contacts/doctor.js — Offline self-check + posture snapshot for status routes.

const { config } = require('./config');
const store = require('./store');

function run() {
 const d = store.load();
 const checks = [];
 const ok = (name, cond, note) => checks.push({ name, pass: !!cond, note: note || '' });
 ok('store_readable', Array.isArray(d.contacts) && Array.isArray(d.segments));
 ok('consent_safe_default', config.excludeOptedOutFromSegments === true, config.excludeOptedOutFromSegments ? 'opted-out excluded from segments' : 'WARNING: opted-out included');
 const optedOut = d.contacts.filter((c) => c.consent === 'opted_out').length;
 const active = d.contacts.filter((c) => c.status === 'active').length;
 return {
 ok: checks.every((c) => c.pass),
 posture: { enabled: config.enabled, defaultCountry: config.defaultCountry, excludeOptedOutFromSegments: config.excludeOptedOutFromSegments },
 counts: { contacts: d.contacts.length, active, optedOut, segments: d.segments.length },
 checks,
 };
}

module.exports = { run };
