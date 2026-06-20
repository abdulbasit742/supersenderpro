// lib/tenantIsolation/policyRegistry.js — Boundary policy CRUD over the store.
const { Store } = require('./store');
const { normalize } = require('./boundaryPolicy');
const defaults = require('./defaultBoundaryPolicies');
function seedDefaults() { if (Store.listPolicies().length) return Store.listPolicies(); defaults.forEach((d) => Store.upsertPolicy(normalize(d))); return Store.listPolicies(); }
function list() { return Store.listPolicies(); }
function get(id) { return Store.getPolicy(id); }
function create(input) { return Store.upsertPolicy(normalize(input)); }
function update(id, patch) { const cur = Store.getPolicy(id); if (!cur) return null; return Store.upsertPolicy(normalize({ ...cur, ...patch, id, createdAt: cur.createdAt })); }
module.exports = { seedDefaults, list, get, create, update };
