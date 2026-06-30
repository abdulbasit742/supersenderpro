'use strict';
/**
 * lib/contacts/contacts.js - tenant-scoped contact records.
 * A contact: { id, tenantId, phone(normalized), name, attributes:{}, tags:[],
 *   optedOut:bool, lastActiveAt, source, createdAt, updatedAt }
 * Phone is the dedupe key (digits-only). Upsert merges attributes + tags.
 */
const { paths } = require('./config');
const store = require('./store');
const { nowISO, id, norm, normPhone } = require('./util');

const read = (tid) => store.readJSON(paths.contacts(tid), { contacts: [] });
const write = (tid, d) => store.writeJSON(paths.contacts(tid), d);

function getByPhone(tid, phone) {
  const p = normPhone(phone);
  return read(tid).contacts.find((c) => c.phone === p) || null;
}

function get(tid, contactId) {
  return read(tid).contacts.find((c) => c.id === contactId) || null;
}

function list(tid, filter = {}) {
  let c = read(tid).contacts;
  if (filter.tag) c = c.filter((x) => (x.tags || []).map(norm).includes(norm(filter.tag)));
  if (filter.optedOut !== undefined) c = c.filter((x) => !!x.optedOut === !!filter.optedOut);
  if (filter.q) {
    const q = norm(filter.q);
    c = c.filter((x) => norm(x.name).includes(q) || x.phone.includes(normPhone(filter.q)));
  }
  return c.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/** Create or merge a contact by phone. Returns the stored contact. */
function upsert(tid, input = {}) {
  const p = normPhone(input.phone);
  if (!p) throw new Error('phone is required');
  const data = read(tid);
  let c = data.contacts.find((x) => x.phone === p);
  if (!c) {
    c = {
      id: id('cnt'), tenantId: tid, phone: p,
      name: input.name || '', attributes: {}, tags: [],
      optedOut: false, source: input.source || 'manual',
      lastActiveAt: input.lastActiveAt || null,
      createdAt: nowISO(), updatedAt: nowISO(),
    };
    data.contacts.push(c);
  }
  if (input.name) c.name = input.name;
  if (input.source) c.source = input.source;
  if (input.lastActiveAt) c.lastActiveAt = input.lastActiveAt;
  if (input.attributes && typeof input.attributes === 'object') c.attributes = Object.assign({}, c.attributes, input.attributes);
  if (Array.isArray(input.tags)) c.tags = Array.from(new Set([...(c.tags || []), ...input.tags.map((t) => String(t))]));
  if (input.optedOut !== undefined) c.optedOut = !!input.optedOut;
  c.updatedAt = nowISO();
  write(tid, data);
  return c;
}

function setTags(tid, contactId, addTags = [], removeTags = []) {
  const data = read(tid);
  const c = data.contacts.find((x) => x.id === contactId);
  if (!c) return null;
  const rm = new Set(removeTags.map(norm));
  const set = new Set((c.tags || []).filter((t) => !rm.has(norm(t))));
  addTags.forEach((t) => set.add(String(t)));
  c.tags = Array.from(set);
  c.updatedAt = nowISO();
  write(tid, data);
  return c;
}

function setOptOut(tid, phone, optedOut) {
  const c = upsert(tid, { phone });
  return upsert(tid, { phone: c.phone, optedOut: !!optedOut });
}

function markActive(tid, phone) {
  return upsert(tid, { phone, lastActiveAt: nowISO() });
}

function remove(tid, contactId) {
  const data = read(tid);
  const before = data.contacts.length;
  data.contacts = data.contacts.filter((c) => c.id !== contactId);
  write(tid, data);
  return data.contacts.length < before;
}

/** Bulk import from an array of rows ({phone,name,attributes,tags}). Returns counts. */
function importMany(tid, rows = []) {
  let created = 0, merged = 0, skipped = 0;
  rows.forEach((r) => {
    const p = normPhone(r && r.phone);
    if (!p) { skipped++; return; }
    const existed = !!getByPhone(tid, p);
    upsert(tid, r);
    existed ? merged++ : created++;
  });
  return { created, merged, skipped, total: rows.length };
}

module.exports = { getByPhone, get, list, upsert, setTags, setOptOut, markActive, remove, importMany };
