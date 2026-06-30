'use strict';
/**
 * lib/interactiveTemplates/templates.js - tenant-scoped CRUD for interactive message templates.
 */
const { paths } = require('./config');
const store = require('./store');
const payload = require('./payload');
const { nowISO, id } = require('./util');

const read = (tid) => store.readJSON(paths.templates(tid), { templates: [] });
const write = (tid, d) => store.writeJSON(paths.templates(tid), d);

function list(tid, filter = {}) {
  let t = read(tid).templates;
  if (filter.type) t = t.filter((x) => x.type === filter.type);
  return t.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function get(tid, tplId) {
  return read(tid).templates.find((t) => t.id === tplId) || null;
}

function create(tid, input = {}) {
  const v = payload.validate(input);
  if (!v.ok) throw new Error('invalid template: ' + v.errors.join('; '));
  const data = read(tid);
  const tpl = Object.assign({}, input, { id: id('itpl'), tenantId: tid, createdAt: nowISO(), updatedAt: nowISO() });
  data.templates.push(tpl);
  write(tid, data);
  return tpl;
}

function update(tid, tplId, updates = {}) {
  const data = read(tid);
  const t = data.templates.find((x) => x.id === tplId);
  if (!t) return null;
  const merged = Object.assign({}, t, updates, { id: t.id, tenantId: tid, createdAt: t.createdAt, updatedAt: nowISO() });
  const v = payload.validate(merged);
  if (!v.ok) throw new Error('invalid template: ' + v.errors.join('; '));
  Object.assign(t, merged);
  write(tid, data);
  return t;
}

function remove(tid, tplId) {
  const data = read(tid);
  const before = data.templates.length;
  data.templates = data.templates.filter((t) => t.id !== tplId);
  write(tid, data);
  return data.templates.length < before;
}

module.exports = { list, get, create, update, remove };
