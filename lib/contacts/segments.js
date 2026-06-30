'use strict';
/**
 * lib/contacts/segments.js - rule-based dynamic audience segments.
 *
 * A segment: { id, tenantId, name, match:'all'|'any', rules:[ <rule> ], createdAt, updatedAt }
 * A rule:    { field, op, value }
 *   field: 'tag' | 'name' | 'phone' | 'lastActiveAt' | 'attr:<key>'
 *   op:    eq/neq/contains/gt/lt/gte/lte/exists/not_exists/in/has_tag/no_tag/
 *          active_within_days/inactive_for_days
 *
 * resolve() evaluates a segment against the tenant's contacts and returns matching contacts
 * (opted-out contacts are excluded by default so segments are broadcast-safe).
 */
const cfg = require('./config');
const { paths } = cfg;
const store = require('./store');
const contacts = require('./contacts');
const { nowISO, id, norm, daysAgo } = require('./util');

const read = (tid) => store.readJSON(paths.segments(tid), { segments: [] });
const write = (tid, d) => store.writeJSON(paths.segments(tid), d);

function fieldValue(contact, field) {
  if (field === 'tag' || field === 'tags') return contact.tags || [];
  if (field === 'name') return contact.name;
  if (field === 'phone') return contact.phone;
  if (field === 'lastActiveAt') return contact.lastActiveAt;
  if (field && field.indexOf('attr:') === 0) return (contact.attributes || {})[field.slice(5)];
  return undefined;
}

function evalRule(contact, rule) {
  const v = fieldValue(contact, rule.field);
  const target = rule.value;
  switch (rule.op) {
    case 'eq': return norm(v) === norm(target);
    case 'neq': return norm(v) !== norm(target);
    case 'contains': return norm(v).includes(norm(target));
    case 'gt': return Number(v) > Number(target);
    case 'lt': return Number(v) < Number(target);
    case 'gte': return Number(v) >= Number(target);
    case 'lte': return Number(v) <= Number(target);
    case 'exists': return v != null && String(v) !== '';
    case 'not_exists': return v == null || String(v) === '';
    case 'in': return (Array.isArray(target) ? target : String(target).split(',')).map(norm).includes(norm(v));
    case 'has_tag': return (contact.tags || []).map(norm).includes(norm(target));
    case 'no_tag': return !(contact.tags || []).map(norm).includes(norm(target));
    case 'active_within_days': return contact.lastActiveAt ? daysAgo(contact.lastActiveAt) <= Number(target) : false;
    case 'inactive_for_days': return contact.lastActiveAt ? daysAgo(contact.lastActiveAt) >= Number(target) : true;
    default: return false;
  }
}

function matches(contact, segment) {
  const rules = segment.rules || [];
  if (!rules.length) return true; // empty ruleset = everyone
  if (segment.match === 'any') return rules.some((r) => evalRule(contact, r));
  return rules.every((r) => evalRule(contact, r)); // default 'all'
}

function validate(seg) {
  const errors = [];
  if (!seg || typeof seg !== 'object') return { ok: false, errors: ['segment must be an object'] };
  if (!seg.name) errors.push('name is required');
  if (seg.match && !['all', 'any'].includes(seg.match)) errors.push("match must be 'all' or 'any'");
  (seg.rules || []).forEach((r, i) => {
    if (!r.field) errors.push('rule[' + i + '] missing field');
    if (!cfg.operators.includes(r.op)) errors.push('rule[' + i + '] invalid op: ' + r.op);
  });
  return { ok: errors.length === 0, errors };
}

function list(tid) {
  return read(tid).segments.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}
function get(tid, segId) { return read(tid).segments.find((s) => s.id === segId) || null; }

function create(tid, input = {}) {
  const v = validate(input);
  if (!v.ok) throw new Error('invalid segment: ' + v.errors.join('; '));
  const data = read(tid);
  const seg = {
    id: id('seg'), tenantId: tid, name: input.name,
    match: input.match === 'any' ? 'any' : 'all',
    rules: Array.isArray(input.rules) ? input.rules : [],
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  data.segments.push(seg);
  write(tid, data);
  return seg;
}

function update(tid, segId, updates = {}) {
  const data = read(tid);
  const s = data.segments.find((x) => x.id === segId);
  if (!s) return null;
  const merged = Object.assign({}, s, updates, { id: s.id, tenantId: tid, createdAt: s.createdAt, updatedAt: nowISO() });
  const v = validate(merged);
  if (!v.ok) throw new Error('invalid segment: ' + v.errors.join('; '));
  Object.assign(s, merged);
  write(tid, data);
  return s;
}

function remove(tid, segId) {
  const data = read(tid);
  const before = data.segments.length;
  data.segments = data.segments.filter((s) => s.id !== segId);
  write(tid, data);
  return data.segments.length < before;
}

/** Resolve a segment (stored or ad-hoc) to matching contacts. Excludes opted-out by default. */
function resolve(tid, segmentOrId, opts = {}) {
  const seg = typeof segmentOrId === 'string' ? get(tid, segmentOrId) : segmentOrId;
  if (!seg) throw new Error('segment not found');
  const includeOptedOut = !!opts.includeOptedOut;
  const all = contacts.list(tid);
  const matched = all.filter((c) => (includeOptedOut || !c.optedOut) && matches(c, seg));
  return matched;
}

/** Count + small preview of a segment's audience (for the UI before sending a broadcast). */
function preview(tid, segmentOrId, opts = {}) {
  const matched = resolve(tid, segmentOrId, opts);
  const limit = opts.limit || cfg.config.maxSegmentPreview;
  return { count: matched.length, sample: matched.slice(0, limit).map((c) => ({ id: c.id, phone: c.phone, name: c.name, tags: c.tags })) };
}

module.exports = { validate, matches, list, get, create, update, remove, resolve, preview };
