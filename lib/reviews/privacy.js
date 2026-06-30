'use strict';
// #77 Reviews & Ratings — PII masking.
function mask(id) {
  if (!id) return id;
  const s = String(id);
  if (s.length <= 4) return '***';
  return s.slice(0, 2) + '***' + s.slice(-2);
}
function maskReview(r) { return r ? Object.assign({}, r, { contactId: mask(r.contactId) }) : r; }
module.exports = { mask, maskReview };
