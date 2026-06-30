'use strict';
// #71 Loyalty & Points — PII masking for views/exports.
function maskContact(id) {
  if (!id) return id;
  const s = String(id);
  if (s.length <= 4) return '***';
  return s.slice(0, 2) + '***' + s.slice(-2);
}
function maskAccount(a) {
  if (!a) return a;
  return Object.assign({}, a, { contactId: maskContact(a.contactId) });
}
function maskLedger(e) {
  if (!e) return e;
  return Object.assign({}, e, { contactId: maskContact(e.contactId) });
}
module.exports = { maskContact, maskAccount, maskLedger };
