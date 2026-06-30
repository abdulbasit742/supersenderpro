'use strict';
// #58 Shipping — PII masking for views/logs.
function maskPhone(p) {
  if (!p) return p;
  const s = String(p);
  if (s.length <= 4) return '****';
  return s.slice(0, 3) + '****' + s.slice(-2);
}

function maskAddress(a) {
  if (!a) return a;
  const s = String(a);
  if (s.length <= 6) return '***';
  return s.slice(0, 6) + '…';
}

function maskShipment(sh) {
  if (!sh) return sh;
  return Object.assign({}, sh, {
    toPhone: maskPhone(sh.toPhone),
    toAddress: maskAddress(sh.toAddress)
  });
}

module.exports = { maskPhone, maskAddress, maskShipment };
