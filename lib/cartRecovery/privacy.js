'use strict';
// #80 Abandoned Cart Recovery — PII masking.
function mask(id) {
  if (!id) return id;
  const s = String(id);
  if (s.length <= 4) return '***';
  return s.slice(0, 2) + '***' + s.slice(-2);
}
function maskCart(c) { return c ? Object.assign({}, c, { contactId: mask(c.contactId) }) : c; }
module.exports = { mask, maskCart };
