'use strict';

// Deterministic audience targeting. Filters a contact array by simple, composable
// rules. Works fully offline; no model needed.
//
// rule shape: { tags?: string[], anyTags?: string[], excludeTags?: string[],
//   city?: string[], minOrders?: number, lastSeenWithinDays?: number,
//   optedInOnly?: boolean }

function daysSince(ts) {
  if (!ts) return Infinity;
  const t = new Date(ts).getTime();
  if (!Number.isFinite(t)) return Infinity;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

function matches(contact, rule) {
  rule = rule || {};
  const tags = (contact.tags || []).map((s) => String(s).toLowerCase());

  if (rule.optedInOnly && contact.optedIn === false) return false;

  if (Array.isArray(rule.tags) && rule.tags.length) {
    const need = rule.tags.map((s) => String(s).toLowerCase());
    if (!need.every((t) => tags.includes(t))) return false;
  }
  if (Array.isArray(rule.anyTags) && rule.anyTags.length) {
    const any = rule.anyTags.map((s) => String(s).toLowerCase());
    if (!any.some((t) => tags.includes(t))) return false;
  }
  if (Array.isArray(rule.excludeTags) && rule.excludeTags.length) {
    const ex = rule.excludeTags.map((s) => String(s).toLowerCase());
    if (ex.some((t) => tags.includes(t))) return false;
  }
  if (Array.isArray(rule.city) && rule.city.length) {
    const cities = rule.city.map((s) => String(s).toLowerCase());
    if (!cities.includes(String(contact.city || '').toLowerCase())) return false;
  }
  if (Number.isFinite(rule.minOrders)) {
    if (Number(contact.orderCount || 0) < rule.minOrders) return false;
  }
  if (Number.isFinite(rule.lastSeenWithinDays)) {
    if (daysSince(contact.lastSeenAt) > rule.lastSeenWithinDays) return false;
  }
  return true;
}

function target(contacts, rule) {
  const list = Array.isArray(contacts) ? contacts : [];
  const selected = list.filter((c) => matches(c, rule));
  return {
    total: list.length,
    selected: selected.length,
    skipped: list.length - selected.length,
    contacts: selected,
  };
}

module.exports = { target, matches, daysSince };
