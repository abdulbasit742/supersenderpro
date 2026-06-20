// lib/saasBilling/licenseStore.js — Persistence for tenant licenses.
// Licenses are NEVER hard-deleted; status transitions to cancelled/expired instead.

const { config } = require('./config');
const store = require('./store');

function _load() {
  const d = store.readJSON(config.paths.license, null) || {};
  if (!Array.isArray(d.licenses)) d.licenses = [];
  return d;
}
function _save(d) { return store.writeJSON(config.paths.license, d); }

function all() { return _load().licenses; }

function getByTenant(tenantId) {
  const tid = String(tenantId);
  // newest active-ish license for the tenant wins
  const list = all().filter((l) => String(l.tenantId) === tid);
  return list.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0] || null;
}

function getById(id) { return all().find((l) => l.id === id) || null; }

function upsert(license) {
  const d = _load();
  const idx = d.licenses.findIndex((l) => l.id === license.id);
  if (idx >= 0) d.licenses[idx] = license; else d.licenses.push(license);
  _save(d);
  return license;
}

module.exports = { all, getByTenant, getById, upsert };
