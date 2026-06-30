'use strict';
/**
 * segmentEngine.js — Marketing Automation Feature #1: dynamic audience segmentation.
 *
 * Everything else in marketing (drip campaigns, broadcasts, loyalty targeting) needs to answer one
 * question: "WHO should receive this?" That's a segment. A segment is a saved set of RULES, not a
 * frozen list — so it always resolves to the current matching contacts.
 *
 * A segment's rule tree is one or more groups; groups are OR'd together, rules inside a group are
 * AND'd. Each rule tests one field of a contact.
 *
 *   segment.rules = {
 *     match: 'any',                 // 'any' => OR across groups (default), 'all' => AND
 *     groups: [
 *       { match: 'all', conditions: [
 *         { field: 'tags', op: 'contains', value: 'vip' },
 *         { field: 'totalSpent', op: 'gte', value: 5000 }
 *       ]}
 *     ]
 *   }
 *
 * Contacts are supplied by a pluggable source so this works with the current JSON CRM today and a
 * Postgres-backed CRM later without changing callers. Set it once via setContactSource().
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const SEG_FILE = path.join(DATA_DIR, 'marketing_segments.json');

// ---------------------------------------------------------------------------
// Persistence (JSON, same pattern as the rest of the app)
// ---------------------------------------------------------------------------
function load() {
  try {
    if (!fs.existsSync(SEG_FILE)) return { segments: [] };
    const raw = fs.readFileSync(SEG_FILE, 'utf8').trim();
    return raw ? JSON.parse(raw) : { segments: [] };
  } catch { return { segments: [] }; }
}
function save(data) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(SEG_FILE, JSON.stringify(data, null, 2));
  } catch { /* best-effort */ }
}

// ---------------------------------------------------------------------------
// Contact source (pluggable). Default returns []; the app wires the real CRM in.
// ---------------------------------------------------------------------------
let contactSource = async () => [];
/** @param {() => (Array|Promise<Array>)} fn returns all contacts to evaluate against. */
function setContactSource(fn) { if (typeof fn === 'function') contactSource = fn; }

// ---------------------------------------------------------------------------
// Rule evaluation
// ---------------------------------------------------------------------------
function getField(contact, field) {
  // supports dot paths like 'location.city'
  return String(field).split('.').reduce((o, k) => (o == null ? o : o[k]), contact);
}

function asNumber(v) { const n = Number(v); return Number.isFinite(n) ? n : null; }

// Relative date windows for behavioural rules, e.g. value: '7d' means "within last 7 days".
function withinRelative(dateVal, spec) {
  const t = Date.parse(dateVal);
  if (Number.isNaN(t)) return false;
  const m = /^(\d+)([dhwm])$/.exec(String(spec).trim());
  if (!m) return false;
  const n = Number(m[1]);
  const unitMs = { h: 3600e3, d: 86400e3, w: 604800e3, m: 2592000e3 }[m[2]];
  return (Date.now() - t) <= n * unitMs;
}

function evalCondition(contact, cond) {
  const { field, op, value } = cond || {};
  const actual = getField(contact, field);
  switch (op) {
    case 'exists':   return actual !== undefined && actual !== null && actual !== '';
    case 'eq':       return actual === value;
    case 'neq':      return actual !== value;
    case 'gt':       return asNumber(actual) !== null && asNumber(actual) > asNumber(value);
    case 'gte':      return asNumber(actual) !== null && asNumber(actual) >= asNumber(value);
    case 'lt':       return asNumber(actual) !== null && asNumber(actual) < asNumber(value);
    case 'lte':      return asNumber(actual) !== null && asNumber(actual) <= asNumber(value);
    case 'contains':
      if (Array.isArray(actual)) return actual.map(String).includes(String(value));
      return String(actual ?? '').toLowerCase().includes(String(value).toLowerCase());
    case 'in':       return Array.isArray(value) && value.map(String).includes(String(actual));
    case 'within':   return withinRelative(actual, value); // actual is a date string
    default:         return false;
  }
}

function evalGroup(contact, group) {
  const conds = Array.isArray(group?.conditions) ? group.conditions : [];
  if (!conds.length) return false;
  const match = (group.match || 'all').toLowerCase();
  return match === 'any'
    ? conds.some(c => evalCondition(contact, c))
    : conds.every(c => evalCondition(contact, c));
}

/** True if `contact` satisfies the segment's rule tree. */
function contactMatches(contact, rules) {
  const groups = Array.isArray(rules?.groups) ? rules.groups : [];
  if (!groups.length) return false;
  const match = (rules.match || 'any').toLowerCase();
  return match === 'all'
    ? groups.every(g => evalGroup(contact, g))
    : groups.some(g => evalGroup(contact, g));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
function createSegment(name, rules, meta = {}) {
  if (!name) throw new Error('segment name is required');
  const data = load();
  const seg = {
    id: `SEG-${Date.now()}`,
    name,
    description: meta.description || '',
    storeId: meta.storeId || null,
    rules: rules || { match: 'any', groups: [] },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  data.segments.push(seg);
  save(data);
  return seg;
}

function listSegments(storeId) {
  const segs = load().segments;
  return storeId ? segs.filter(s => !s.storeId || s.storeId === storeId) : segs;
}

function getSegment(id) {
  return load().segments.find(s => s.id === id) || null;
}

function updateSegment(id, patch = {}) {
  const data = load();
  const seg = data.segments.find(s => s.id === id);
  if (!seg) return null;
  for (const k of ['name', 'description', 'rules']) {
    if (patch[k] !== undefined) seg[k] = patch[k];
  }
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
 * Resolve a segment to the live list of matching contacts.
 * @returns {Promise<{segmentId:string, count:number, contacts:Array}>}
 */
async function evaluateSegment(id) {
  const seg = getSegment(id);
  if (!seg) throw new Error('segment not found');
  const all = (await contactSource()) || [];
  const contacts = all.filter(c => contactMatches(c, seg.rules));
  return { segmentId: id, name: seg.name, count: contacts.length, contacts };
}

/** Preview an ad-hoc rule tree without saving it (for the segment builder UI). */
async function previewRules(rules) {
  const all = (await contactSource()) || [];
  const contacts = all.filter(c => contactMatches(c, rules || { match: 'any', groups: [] }));
  return { count: contacts.length, contacts };
}

module.exports = {
  setContactSource,
  createSegment,
  listSegments,
  getSegment,
  updateSegment,
  deleteSegment,
  evaluateSegment,
  previewRules,
  // exported for unit tests
  _internal: { contactMatches, evalCondition }
};
