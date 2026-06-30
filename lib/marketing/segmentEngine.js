'use strict';
/**
 * segmentEngine.js — Marketing Automation Feature #1: dynamic, rule-based audience segments.
 *
 * A *segment* is a saved set of rules (e.g. "spent > 5000 AND last order within 30 days"). Instead of
 * manually maintaining contact lists, you define the rules once and the engine computes membership on
 * demand. Every other marketing feature (drip campaigns, one-click broadcast targeting, loyalty,
 * win-back) targets a segment, so this is the foundation the whole department stands on.
 *
 * Storage follows the existing app convention (JSON file under data/). When the Postgres migration
 * lands, move `data/marketing_segments.json` into a table; the public API here stays the same.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'marketing_segments.json');

function load() {
  try {
    return fs.existsSync(DATA_FILE)
      ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
      : { segments: [] };
  } catch {
    return { segments: [] };
  }
}
function save(d) {
  try {
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
  } catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------
// A rule = { field, op, value }. `field` is read from the contact object. Some virtual fields are
// computed for convenience (see resolveField). `match` on the segment is 'all' (AND) or 'any' (OR).

const OPERATORS = {
  eq:       (a, b) => a === b,
  neq:      (a, b) => a !== b,
  gt:       (a, b) => Number(a) > Number(b),
  gte:      (a, b) => Number(a) >= Number(b),
  lt:       (a, b) => Number(a) < Number(b),
  lte:      (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a == null ? '' : a).toLowerCase().includes(String(b).toLowerCase()),
  in:       (a, b) => Array.isArray(b) && b.map(String).includes(String(a)),
  nin:      (a, b) => Array.isArray(b) && !b.map(String).includes(String(a)),
  has:      (a, b) => Array.isArray(a) && a.map(String).includes(String(b)), // tag membership
  exists:   (a) => a !== undefined && a !== null && a !== '',
  empty:    (a) => a === undefined || a === null || a === ''
};

const VALID_OPS = Object.keys(OPERATORS);

function daysAgo(dateLike) {
  if (!dateLike) return undefined;
  const t = new Date(dateLike).getTime();
  if (Number.isNaN(t)) return undefined;
  return Math.floor((Date.now() - t) / 86400000);
}

// Resolve a (possibly virtual) field off a contact. Real fields win; virtuals are derived.
function resolveField(contact, field) {
  if (contact == null) return undefined;
  switch (field) {
    case 'lastOrderDaysAgo': return daysAgo(contact.lastOrderAt);
    case 'firstOrderDaysAgo': return daysAgo(contact.firstOrderAt);
    case 'createdDaysAgo':   return daysAgo(contact.createdAt);
    case 'hasOrdered':       return Number(contact.orderCount || 0) > 0;
    default:                 return contact[field];
  }
}

function evaluateRule(contact, rule) {
  const fn = OPERATORS[rule.op];
  if (!fn) return false;
  const actual = resolveField(contact, rule.field);
  // Unary operators (exists/empty) ignore rule.value.
  if (rule.op === 'exists' || rule.op === 'empty') return fn(actual);
  return fn(actual, rule.value);
}

/** True if `contact` belongs to `segment`. */
function matchesSegment(contact, segment) {
  const rules = Array.isArray(segment.rules) ? segment.rules : [];
  if (!rules.length) return true; // empty rule set = everyone
  const results = rules.map(r => evaluateRule(contact, r));
  return (segment.match === 'any') ? results.some(Boolean) : results.every(Boolean);
}

/** Filter a list of contacts down to those in the segment. */
function filterContacts(contacts, segment) {
  return (Array.isArray(contacts) ? contacts : []).filter(c => matchesSegment(c, segment));
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------
function validateRules(rules) {
  if (!Array.isArray(rules)) throw new Error('rules must be an array');
  for (const r of rules) {
    if (!r || typeof r.field !== 'string' || !r.field) throw new Error('each rule needs a field');
    if (!VALID_OPS.includes(r.op)) throw new Error(`invalid op "${r.op}". Valid: ${VALID_OPS.join(', ')}`);
  }
  return true;
}

function createSegment(storeId, name, rules = [], match = 'all') {
  if (!name) throw new Error('segment name is required');
  validateRules(rules);
  const data = load();
  const segment = {
    id: `SEG-${Date.now()}`,
    storeId: storeId || null,
    name,
    match: match === 'any' ? 'any' : 'all',
    rules,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.segments.push(segment);
  save(data);
  return segment;
}

function listSegments(storeId) {
  const data = load();
  return storeId
    ? data.segments.filter(s => s.storeId === storeId)
    : data.segments;
}

function getSegment(id) {
  return load().segments.find(s => s.id === id) || null;
}

function updateSegment(id, patch = {}) {
  const data = load();
  const seg = data.segments.find(s => s.id === id);
  if (!seg) return null;
  if (patch.rules !== undefined) { validateRules(patch.rules); seg.rules = patch.rules; }
  if (patch.name !== undefined) seg.name = patch.name;
  if (patch.match !== undefined) seg.match = patch.match === 'any' ? 'any' : 'all';
  seg.updatedAt = new Date().toISOString();
  save(data);
  return seg;
}

function deleteSegment(id) {
  const data = load();
  const before = data.segments.length;
  data.segments = data.segments.filter(s => s.id !== id);
  save(data);
  return { deleted: before - data.segments.length };
}

/**
 * Resolve a segment to the matching contacts from a provided contact list.
 * The caller passes contacts (e.g. from the CRM) so this module stays storage-agnostic.
 */
function resolveSegmentContacts(id, contacts) {
  const seg = getSegment(id);
  if (!seg) return { segment: null, contacts: [] };
  const matched = filterContacts(contacts, seg);
  return { segment: seg, count: matched.length, contacts: matched };
}

module.exports = {
  // evaluation
  matchesSegment,
  filterContacts,
  resolveSegmentContacts,
  // crud
  createSegment,
  listSegments,
  getSegment,
  updateSegment,
  deleteSegment,
  // meta
  VALID_OPS
};
