// lib/saasBilling/resellerStore.js — Persistence for resellers + commissions.
// Emails/phones stored masked only. Existing lib/resellerNetwork.js is read for adaptation.

const { config } = require('./config');
const store = require('./store');

function _load() {
  const d = store.readJSON(config.paths.reseller, null) || {};
  if (!Array.isArray(d.resellers)) d.resellers = [];
  if (!Array.isArray(d.commissions)) d.commissions = [];
  return d;
}
function _save(d) { return store.writeJSON(config.paths.reseller, d); }

function allResellers() { return _load().resellers; }
function getReseller(id) { return allResellers().find((r) => r.id === id) || null; }
function upsertReseller(r) {
  const d = _load();
  const idx = d.resellers.findIndex((x) => x.id === r.id);
  if (idx >= 0) d.resellers[idx] = r; else d.resellers.push(r);
  _save(d); return r;
}

function allCommissions() { return _load().commissions; }
function commissionsFor(resellerId) { return allCommissions().filter((c) => c.resellerId === resellerId); }
function addCommission(c) { const d = _load(); d.commissions.push(c); _save(d); return c; }

module.exports = { allResellers, getReseller, upsertReseller, allCommissions, commissionsFor, addCommission };
