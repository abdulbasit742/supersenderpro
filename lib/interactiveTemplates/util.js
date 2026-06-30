'use strict';
/** lib/interactiveTemplates/util.js - shared helpers for the interactive message builder. */
const nowISO = () => new Date().toISOString();
const id = (prefix) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/** Hard-trim a string to a max length (WhatsApp rejects over-length fields). */
const clip = (s, max) => String(s == null ? '' : s).slice(0, max);

/** interpolate {{var}} tokens from a flat-ish context object (missing -> empty string). */
function interpolate(text, ctx) {
  if (!text) return '';
  return String(text).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), ctx || {});
    return v == null ? '' : String(v);
  });
}

function maskPhone(p) {
  const s = String(p || '').replace(/\s+/g, '');
  if (s.length < 5) return s ? '***' : '';
  return s.slice(0, 3) + '***' + s.slice(-2);
}

module.exports = { nowISO, id, clip, interpolate, maskPhone };
