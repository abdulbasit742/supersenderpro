'use strict';
const store = require('./store');
const model = require('./flowModel');
const validator = require('./flowValidator');
const defaultFlows = require('./defaultFlows');
function ensureSeeded() { if (store.all().length === 0) store.bulkPut(defaultFlows.seeds()); }
function list(filter) {
  ensureSeeded();
  const f = filter || {};
  return store.all().filter((x) => (!f.category || x.category === f.category) && (!f.status || x.status === f.status)).map((x) => ({ id: x.id, name: x.name, category: x.category, status: x.status, screens: (x.screens || []).length, consentRequired: x.consentRequired, dryRun: true }));
}
function get(id) { ensureSeeded(); return store.get(id); }
function create(input) {
  const f = model.newFlow(input);
  const v = validator.validate(f);
  if (!v.ok) return { ok: false, errors: v.errors };
  if (f.status === 'draft' && v.warnings.length === 0) f.status = 'preview_ready';
  store.put(f);
  return { ok: true, dryRun: true, flow: f, warnings: v.warnings };
}
function update(id, patch) {
  ensureSeeded();
  const cur = store.get(id);
  if (!cur) return { ok: false, errors: ['not_found'] };
  const merged = model.newFlow(Object.assign({}, cur, patch || {}, { id: cur.id, createdAt: cur.createdAt }));
  const v = validator.validate(merged);
  if (!v.ok) return { ok: false, errors: v.errors };
  store.put(merged);
  return { ok: true, dryRun: true, flow: merged, warnings: v.warnings };
}
module.exports = { ensureSeeded, list, get, create, update };
