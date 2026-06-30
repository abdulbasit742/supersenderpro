'use strict';
/** lib/chatbotBuilder/util.js - small shared helpers for the chatbot flow builder. */
const nowISO = () => new Date().toISOString();
const id = (prefix) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hoursAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 3600000;
const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();

function maskPhone(p) {
  const s = String(p || '').replace(/\s+/g, '');
  if (s.length < 5) return s ? '***' : '';
  return s.slice(0, 3) + '***' + s.slice(-2);
}

/** interpolate {{var}} tokens from a flat context object (missing -> empty string). */
function interpolate(text, ctx) {
  if (!text) return '';
  return String(text).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), ctx);
    return v == null ? '' : String(v);
  });
}

module.exports = { nowISO, id, hoursAgo, norm, maskPhone, interpolate };
