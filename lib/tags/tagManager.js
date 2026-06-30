'use strict';
/**
 * tagManager.js — Tags Feature #1: a clean, central tag system.
 *
 * Tags are sprinkled across contacts ad-hoc, which leads to chaos: 'VIP', 'vip', 'V.I.P' all
 * different. This is the registry: every tag defined once with a colour, plus rename (cascades to
 * all contacts), merge (fold a messy duplicate into the canonical tag), and usage counts. Since
 * segments (#marketing1) target on tags, keeping tags clean keeps targeting accurate.
 *
 * Contact tag reads/writes go through injected hooks so this stays storage-agnostic.
 * Storage (registry): JSON (data/tags.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'tags.json');

// Injected contact hooks:
//   listContacts() => [{ phone, tags:[] }]
//   setContactTags(phone, tags[]) => void
let listContacts = null;
let setContactTags = null;
function setContactHooks({ list, setTags } = {}) {
  if (typeof list === 'function') listContacts = list;
  if (typeof setTags === 'function') setContactTags = setTags;
}

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { tags: [] }; }
  catch { return { tags: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const norm = (s) => String(s || '').trim().toLowerCase();

function createTag(opts = {}) {
  const name = String(opts.name || '').trim();
  if (!name) throw new Error('tag name required');
  const data = load();
  if (data.tags.some(t => norm(t.name) === norm(name))) throw new Error('tag already exists');
  const tag = {
    id: `TAG-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    name,
    color: opts.color || '#3b82f6',
    description: opts.description || '',
    createdAt: nowIso()
  };
  data.tags.push(tag);
  save(data);
  return tag;
}

function listTags() {
  const data = load();
  // attach usage counts if we can read contacts
  let counts = {};
  if (listContacts) {
    try { for (const c of (listContacts() || [])) for (const t of (c.tags || [])) counts[norm(t)] = (counts[norm(t)] || 0) + 1; }
    catch { counts = {}; }
  }
  return data.tags.map(t => ({ ...t, usage: counts[norm(t.name)] || 0 }));
}

function updateTag(id, patch = {}) {
  const data = load();
  const t = data.tags.find(x => x.id === id);
  if (!t) return null;
  if (patch.color !== undefined) t.color = patch.color;
  if (patch.description !== undefined) t.description = patch.description;
  // rename cascades across contacts
  if (patch.name !== undefined && norm(patch.name) !== norm(t.name)) {
    const oldName = t.name; const newName = String(patch.name).trim();
    t.name = newName;
    cascadeRename(oldName, newName);
  }
  t.updatedAt = nowIso();
  save(data);
  return t;
}

function cascadeRename(oldName, newName) {
  if (!listContacts || !setContactTags) return;
  try {
    for (const c of (listContacts() || [])) {
      const tags = c.tags || [];
      if (tags.some(x => norm(x) === norm(oldName))) {
        const next = Array.from(new Set(tags.map(x => norm(x) === norm(oldName) ? newName : x)));
        setContactTags(c.phone, next);
      }
    }
  } catch { /* best-effort */ }
}

/** Merge `fromName` into `intoName`: every contact with fromName gets intoName, fromName removed. */
function mergeTags(fromName, intoName) {
  if (norm(fromName) === norm(intoName)) throw new Error('cannot merge a tag into itself');
  cascadeRename(fromName, intoName);
  const data = load();
  data.tags = data.tags.filter(t => norm(t.name) !== norm(fromName));
  save(data);
  return { merged: true, from: fromName, into: intoName };
}

function deleteTag(id, { removeFromContacts = false } = {}) {
  const data = load();
  const t = data.tags.find(x => x.id === id);
  if (!t) return { deleted: false };
  if (removeFromContacts && listContacts && setContactTags) {
    try {
      for (const c of (listContacts() || [])) {
        const tags = c.tags || [];
        if (tags.some(x => norm(x) === norm(t.name))) setContactTags(c.phone, tags.filter(x => norm(x) !== norm(t.name)));
      }
    } catch { /* best-effort */ }
  }
  data.tags = data.tags.filter(x => x.id !== id);
  save(data);
  return { deleted: true };
}

module.exports = { setContactHooks, createTag, listTags, updateTag, mergeTags, deleteTag };
