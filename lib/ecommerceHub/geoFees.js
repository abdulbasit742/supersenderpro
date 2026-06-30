'use strict';

/**
 * Ecommerce Hub — geo-based delivery fee.
 * Fee per city/region from GEO_FEES env JSON like {"karachi":150,"*":250}.
 * Free over GEO_FREE_OVER threshold. Pure logic.
 */

function fees() { try { return JSON.parse(process.env.GEO_FEES || '{}'); } catch (_e) { return {}; } }
function freeOver() { return Number(process.env.GEO_FREE_OVER || 0); }
function norm(s) { return String(s || '').trim().toLowerCase(); }

function feeFor(city, orderTotal) {
  if (freeOver() > 0 && Number(orderTotal || 0) >= freeOver()) return { ok: true, fee: 0, reason: 'free_over_threshold' };
  const f = fees(); const c = norm(city);
  if (c && f[c] != null) return { ok: true, fee: Number(f[c]), reason: 'city' };
  const keys = Object.keys(f);
  for (const k of keys) { if (k !== '*' && (c.indexOf(norm(k)) !== -1 || norm(k).indexOf(c) !== -1)) return { ok: true, fee: Number(f[k]), reason: 'city_match' }; }
  if (f['*'] != null) return { ok: true, fee: Number(f['*']), reason: 'default' };
  return { ok: true, fee: Number(process.env.GEO_FEE_DEFAULT || 200), reason: 'fallback' };
}

module.exports = { feeFor, fees, freeOver };
