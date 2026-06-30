'use strict';
/** lib/salesPipeline/util.js - small shared helpers. */
const nowISO = () => new Date().toISOString();
const id = (prefix) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hoursAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 3600000;
const minutesAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 60000;

function maskPhone(p) {
  const s = String(p || '').replace(/\s+/g, '');
  if (s.length < 5) return s ? '***' : '';
  return s.slice(0, 3) + '***' + s.slice(-2);
}

function pad(n, w = 4) { return String(n).padStart(w, '0'); }

module.exports = { nowISO, id, hoursAgo, minutesAgo, maskPhone, pad };
