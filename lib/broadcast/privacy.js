// lib/broadcast/privacy.js — PII masking helpers for broadcast views/logs
'use strict';

const { config } = require('./config');

function maskPhone(p) {
  if (!p) return p;
  const s = String(p);
  if (s.length <= 4) return '****';
  return s.slice(0, 3) + '****' + s.slice(-2);
}

function maskName(n) {
  if (!n) return n;
  const s = String(n);
  return s.charAt(0) + '***';
}

// Returns a shallow-masked copy of a recipient for safe display.
function maskRecipient(r) {
  if (!config.maskPII || !r) return r;
  return { ...r, phone: maskPhone(r.phone), name: maskName(r.name) };
}

function maskRecipients(arr) {
  if (!Array.isArray(arr)) return arr;
  return arr.map(maskRecipient);
}

module.exports = { maskPhone, maskName, maskRecipient, maskRecipients };
