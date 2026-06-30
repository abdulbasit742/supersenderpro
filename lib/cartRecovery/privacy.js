'use strict';
// PII masking for any cart view that leaves the server.
function maskPhone(p) {
  if (!p) return p;
  const s = String(p).replace(/\s+/g, '');
  if (s.length <= 4) return '****';
  return s.slice(0, 3) + '****' + s.slice(-2);
}
function maskEmail(e) {
  if (!e || !String(e).includes('@')) return e ? '****' : e;
  const [u, d] = String(e).split('@');
  const mu = u.length <= 2 ? '**' : u[0] + '***' + u.slice(-1);
  return mu + '@' + d;
}
function maskContact(c) {
  if (!c || typeof c !== 'object') return c;
  return Object.assign({}, c, {
    phone: maskPhone(c.phone),
    email: maskEmail(c.email),
  });
}
module.exports = { maskPhone, maskEmail, maskContact };
