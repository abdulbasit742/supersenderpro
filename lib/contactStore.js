'use strict';

/**
 * contactStore.js
 * JSON-backed contact book with tags, custom attributes, CSV import/export,
 * and segment queries. Lets campaigns target audiences by tag/attribute
 * instead of pasting raw number lists. Stored under data/contacts.json.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'contacts.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ contacts: [] }, null, 2));
}
function readAll() {
  ensureStore();
  try {
    const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}');
    if (!Array.isArray(d.contacts)) d.contacts = [];
    return d;
  } catch { return { contacts: [] }; }
}
function writeAll(d) {
  ensureStore();
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, STORE_FILE);
}
function newId() { return 'ct_' + crypto.randomBytes(6).toString('hex'); }

/** Normalize a phone number to digits only (keeps leading country code). */
function normNumber(n) { return String(n || '').replace(/[^\d]/g, ''); }

function upsertContact(input = {}) {
  const d = readAll();
  const number = normNumber(input.number || input.to);
  if (!number) return null;
  const now = new Date().toISOString();
  let c = d.contacts.find((x) => x.number === number);
  if (c) {
    if (input.name) c.name = String(input.name);
    if (Array.isArray(input.tags)) c.tags = Array.from(new Set([...(c.tags || []), ...input.tags.map(String)]));
    if (input.attributes && typeof input.attributes === 'object') c.attributes = { ...c.attributes, ...input.attributes };
    c.updatedAt = now;
  } else {
    c = {
      id: newId(),
      number,
      name: String(input.name || ''),
      tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
      attributes: (input.attributes && typeof input.attributes === 'object') ? input.attributes : {},
      createdAt: now,
      updatedAt: now,
    };
    d.contacts.push(c);
  }
  writeAll(d);
  return c;
}

function listContacts() { return readAll().contacts; }
function getContact(id) { return readAll().contacts.find((c) => c.id === id) || null; }
function deleteContact(id) {
  const d = readAll();
  const n = d.contacts.length;
  d.contacts = d.contacts.filter((c) => c.id !== id);
  writeAll(d);
  return d.contacts.length < n;
}

function addTag(id, tag) {
  const d = readAll();
  const c = d.contacts.find((x) => x.id === id);
  if (!c) return null;
  c.tags = Array.from(new Set([...(c.tags || []), String(tag)]));
  c.updatedAt = new Date().toISOString();
  writeAll(d);
  return c;
}
function removeTag(id, tag) {
  const d = readAll();
  const c = d.contacts.find((x) => x.id === id);
  if (!c) return null;
  c.tags = (c.tags || []).filter((t) => t !== tag);
  c.updatedAt = new Date().toISOString();
  writeAll(d);
  return c;
}

/** All tags with usage counts, sorted by count desc. */
function tagCounts() {
  const counts = {};
  for (const c of listContacts()) for (const t of c.tags || []) counts[t] = (counts[t] || 0) + 1;
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count }));
}

/**
 * Segment contacts.
 * @param {object} q
 * @param {string[]} [q.tags] - tags to filter by
 * @param {'any'|'all'} [q.match='any'] - require any or all of the tags
 * @param {object} [q.attributes] - exact attribute matches
 */
function segment(q = {}) {
  const tags = (q.tags || []).map(String).filter(Boolean);
  const match = q.match === 'all' ? 'all' : 'any';
  const attrs = q.attributes || {};
  return listContacts().filter((c) => {
    if (tags.length) {
      const ct = c.tags || [];
      const ok = match === 'all' ? tags.every((t) => ct.includes(t)) : tags.some((t) => ct.includes(t));
      if (!ok) return false;
    }
    for (const [k, v] of Object.entries(attrs)) {
      if (String((c.attributes || {})[k]) !== String(v)) return false;
    }
    return true;
  });
}

/** Convert a segment (or all contacts) into campaign recipient objects. */
function toRecipients(q) {
  const list = q ? segment(q) : listContacts();
  return list.map((c) => ({ to: c.number, name: c.name }));
}

/** Import contacts from CSV text. Header row required: number,name,tags */
function importCsv(csv) {
  const lines = String(csv || '').split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return { imported: 0 };
  const header = lines[0].toLowerCase().split(',').map((h) => h.trim());
  const idx = (k) => header.indexOf(k);
  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    const number = cols[idx('number')] || cols[0];
    if (!normNumber(number)) continue;
    const tagsRaw = idx('tags') >= 0 ? (cols[idx('tags')] || '') : '';
    upsertContact({
      number,
      name: idx('name') >= 0 ? (cols[idx('name')] || '').trim() : '',
      tags: tagsRaw.split(/[;|]/).map((t) => t.trim()).filter(Boolean),
    });
    imported++;
  }
  return { imported };
}

/** Export all contacts to CSV text. */
function exportCsv() {
  const rows = ['number,name,tags'];
  for (const c of listContacts()) {
    rows.push([c.number, c.name || '', (c.tags || []).join('|')].join(','));
  }
  return rows.join('\n');
}

module.exports = {
  STORE_FILE, normNumber, upsertContact, listContacts, getContact, deleteContact,
  addTag, removeTag, tagCounts, segment, toRecipients, importCsv, exportCsv,
};
