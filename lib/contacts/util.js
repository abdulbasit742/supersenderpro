'use strict';
/** lib/contacts/util.js - shared helpers for contacts + segmentation. */
const nowISO = () => new Date().toISOString();
const id = (prefix) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
const daysAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 86400000;

/** Normalize a phone to digits-only with no leading +, for stable dedupe/lookup. */
function normPhone(p) {
  return String(p || '').replace(/[^0-9]/g, '');
}

function maskPhone(p) {
  const s = normPhone(p);
  if (s.length < 5) return s ? '***' : '';
  return s.slice(0, 3) + '***' + s.slice(-2);
}

module.exports = { nowISO, id, norm, daysAgo, normPhone, maskPhone };
