'use strict';

/**
 * Ecommerce Hub — courier auto-assign.
 * Picks the best courier for a destination using configurable rules:
 *   COURIER_RULES = JSON like {"karachi":"tcs","lahore":"leopards","*":"postex"}
 * Falls back to COURIER_DEFAULT or "postex". City match is case-insensitive and
 * substring-tolerant ("Karachi" matches "karachi"). Pure logic, no network.
 */

function rules() {
  try { return JSON.parse(process.env.COURIER_RULES || '{}'); } catch (_e) { return {}; }
}
function def() { return String(process.env.COURIER_DEFAULT || 'postex'); }

function normalize(s) { return String(s || '').trim().toLowerCase(); }

// pick(city, region) -> courier id string
function pick(city, region) {
  const r = rules();
  const c = normalize(city), rg = normalize(region);
  // exact city
  if (c && r[c]) return r[c];
  // substring match on any rule key
  const keys = Object.keys(r);
  for (const k of keys) {
    if (k === '*') continue;
    const nk = normalize(k);
    if (c && (c.indexOf(nk) !== -1 || nk.indexOf(c) !== -1)) return r[k];
    if (rg && (rg.indexOf(nk) !== -1 || nk.indexOf(rg) !== -1)) return r[k];
  }
  if (r['*']) return r['*'];
  return def();
}

function explain(city, region) {
  const courier = pick(city, region);
  return { ok: true, city: city || null, region: region || null, courier: courier, source: rules()[normalize(city)] ? 'city_rule' : (rules()['*'] ? 'wildcard' : 'default') };
}

module.exports = { pick, explain, rules, def };
