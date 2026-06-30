'use strict';
// #74 Referral Program — PII masking.
function mask(id) {
  if (!id) return id;
  const s = String(id);
  if (s.length <= 4) return '***';
  return s.slice(0, 2) + '***' + s.slice(-2);
}
function maskCode(c) { return c ? Object.assign({}, c, { ownerId: mask(c.ownerId) }) : c; }
function maskReferral(r) { return r ? Object.assign({}, r, { referrerId: mask(r.referrerId), refereeId: mask(r.refereeId) }) : r; }
module.exports = { mask, maskCode, maskReferral };
