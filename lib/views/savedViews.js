'use strict';
/**
 * savedViews.js — Views Feature #1: reusable filter/sort presets.
 *
 * Power users live in filtered lists: "my open deals over 50k", "unread VIP inbox", "leads from ads
 * this week". Re-applying filters every time is friction. A saved view stores entity + filter rules
 * + sort + columns so one click restores that lens. Shared (team) or personal.
 *
 * apply() runs a view against a dataset the caller provides (storage-agnostic), reusing the same
 * operator semantics as the marketing segment engine for consistency.
 *
 * Storage: JSON (data/saved_views.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'saved_views.json');
const ENTITIES = ['contacts', 'leads', 'deals', 'inbox', 'invoices'];

const OPERATORS = {
  eq: (a, b) => a === b, neq: (a, b) => a !== b,
  gt: (a, b) => Number(a) > Number(b), gte: (a, b) => Number(a) >= Number(b),
  lt: (a, b) => Number(a) < Number(b), lte: (a, b) => Number(a) <= Number(b),
  contains: (a, b) => String(a == null ? '' : a).toLowerCase().includes(String(b).toLowerCase()),
  in: (a, b) => Array.isArray(b) && b.map(String).includes(String(a)),
  exists: (a) => a !== undefined && a !== null && a !== '',
  empty: (a) => a === undefined || a === null || a === ''
};
const VALID_OPS = Object.keys(OPERATORS);

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { views: [] }; }
  catch { return { views: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();

function getPath(obj, key) {
  if (!key) return undefined;
  if (!key.includes('.')) return obj[key];
  return key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function createView(opts = {}) {
  if (!ENTITIES.includes(opts.entity)) throw new Error(`entity must be one of: ${ENTITIES.join(', ')}`);
  if (!opts.name) throw new Error('view needs a name');
  for (const r of (opts.filters || [])) {
    if (!r.field || !VALID_OPS.includes(r.op)) throw new Error(`bad filter rule. ops: ${VALID_OPS.join(', ')}`);
  }
  const data = load();
  const view = {
    id: `VIEW-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name: opts.name,
    entity: opts.entity,
    filters: opts.filters || [],
    match: opts.match === 'any' ? 'any' : 'all',
    sort: opts.sort || null,           // { field, dir:'asc'|'desc' }
    columns: opts.columns || null,     // optional column list for the UI
    ownerId: opts.ownerId || null,
    shared: !!opts.shared,             // team-visible vs personal
    pinned: !!opts.pinned,
    createdAt: nowIso()
  };
  data.views.push(view);
  save(data);
  return view;
}

function listViews(filter = {}) {
  let rows = load().views;
  if (filter.entity) rows = rows.filter(v => v.entity === filter.entity);
  // visible: shared views + this user's personal views
  if (filter.ownerId) rows = rows.filter(v => v.shared || v.ownerId === filter.ownerId);
  rows.sort((a, b) => (b.pinned - a.pinned) || (new Date(b.createdAt) - new Date(a.createdAt)));
  return rows;
}

function getView(id) { return load().views.find(v => v.id === id) || null; }

function updateView(id, patch = {}) {
  const data = load();
  const v = data.views.find(x => x.id === id);
  if (!v) return null;
  for (const f of ['name', 'filters', 'match', 'sort', 'columns', 'shared', 'pinned']) {
    if (patch[f] !== undefined) v[f] = patch[f];
  }
  v.updatedAt = nowIso();
  save(data);
  return v;
}

function deleteView(id) {
  const data = load();
  const before = data.views.length;
  data.views = data.views.filter(v => v.id !== id);
  save(data);
  return { deleted: before - data.views.length };
}

function matchRow(row, view) {
  const rules = view.filters || [];
  if (!rules.length) return true;
  const results = rules.map(r => {
    const fn = OPERATORS[r.op]; if (!fn) return false;
    const actual = getPath(row, r.field);
    return (r.op === 'exists' || r.op === 'empty') ? fn(actual) : fn(actual, r.value);
  });
  return view.match === 'any' ? results.some(Boolean) : results.every(Boolean);
}

/** Apply a saved view to a dataset (filter + sort). The caller supplies the rows. */
function apply(viewId, rows) {
  const view = getView(viewId);
  if (!view) return { view: null, rows: [] };
  let out = (Array.isArray(rows) ? rows : []).filter(r => matchRow(r, view));
  if (view.sort && view.sort.field) {
    const { field, dir } = view.sort;
    out = out.slice().sort((a, b) => {
      const av = getPath(a, field), bv = getPath(b, field);
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return dir === 'desc' ? -cmp : cmp;
    });
  }
  return { view, count: out.length, rows: out };
}

module.exports = { ENTITIES, VALID_OPS, createView, listViews, getView, updateView, deleteView, apply };
