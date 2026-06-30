'use strict';

/**
 * Ecommerce Hub — delivery ETA estimate by city.
 * Returns a working-day estimate from ETA_DAYS env JSON like {"karachi":2,"*":4}.
 */

function etas() { try { return JSON.parse(process.env.ETA_DAYS || '{}'); } catch (_e) { return {}; } }
function norm(s) { return String(s || '').trim().toLowerCase(); }

function estimate(city) {
  const e = etas(); const c = norm(city);
  let days = e[c];
  if (days == null) { for (const k of Object.keys(e)) { if (k !== '*' && c.indexOf(norm(k)) !== -1) { days = e[k]; break; } } }
  if (days == null) days = e['*'] != null ? e['*'] : Number(process.env.ETA_DEFAULT_DAYS || 4);
  return { ok: true, city: city || null, days: Number(days) };
}
function reply(city) { const e = estimate(city); return '\ud83d\ude9a ' + (city ? (city + ' ') : '') + 'delivery estimate: ' + e.days + ' working days.'; }

module.exports = { estimate, reply };
