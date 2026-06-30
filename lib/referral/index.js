'use strict';
// #74 Referral Program — barrel + high-level helpers.
const config = require('./config');
const store = require('./store');
const privacy = require('./privacy');
const codeEngine = require('./codeEngine');
const attribution = require('./attribution');
const doctor = require('./doctor');

function getCode(tenantId, ownerId) {
  const db = store.load();
  const c = codeEngine.getOrCreate(db, { tenantId, ownerId });
  store.save(db);
  return c;
}
function attribute(args) {
  const db = store.load();
  const res = attribution.attribute(db, args);
  store.save(db);
  return res;
}
function qualify(args) {
  const db = store.load();
  const res = attribution.qualify(db, args);
  store.save(db);
  return res;
}
function stats(tenantId, referrerId) {
  const db = store.load();
  const rows = store.listReferrals(db, tenantId, referrerId);
  return {
    total: rows.length,
    pending: rows.filter(r => r.status === 'pending').length,
    qualified: rows.filter(r => r.status === 'qualified').length,
    capped: rows.filter(r => r.status === 'capped').length
  };
}
// Event hooks (wired by webhook #51 / order mgmt #63 if present).
function onSignup(evt) {
  if (!config.enabled) return { skipped: 'disabled' };
  if (config.qualifyOn !== 'signup') return { skipped: 'qualify_on_order' };
  return qualify({ tenantId: evt.tenantId, refereeId: evt.refereeId || evt.contactId });
}
function onFirstOrder(evt) {
  if (!config.enabled) return { skipped: 'disabled' };
  if (config.qualifyOn !== 'first_order') return { skipped: 'qualify_on_signup' };
  return qualify({ tenantId: evt.tenantId, refereeId: evt.refereeId || evt.contactId, orderTotal: evt.amount || evt.orderTotal });
}
module.exports = { config, store, privacy, codeEngine, attribution, doctor, getCode, attribute, qualify, stats, onSignup, onFirstOrder };
