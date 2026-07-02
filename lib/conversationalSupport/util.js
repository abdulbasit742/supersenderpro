'use strict';
/** lib/conversationalSupport/util.js - small shared helpers for the conversational support agent. */
const nowISO = () => new Date().toISOString();
const id = (prefix) => prefix + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const hoursAgo = (iso) => (Date.now() - new Date(iso).getTime()) / 3600000;
const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
const clamp01 = (n) => Math.max(0, Math.min(1, Number(n) || 0));

function maskPhone(p) {
  const s = String(p || '').replace(/\s+/g, '');
  if (s.length < 5) return s ? '***' : '';
  return s.slice(0, 3) + '***' + s.slice(-2);
}

/** interpolate {{var}} tokens from a flat-ish context object (missing -> empty string). */
function interpolate(text, ctx) {
  if (!text) return '';
  return String(text).replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), ctx);
    return v == null ? '' : String(v);
  });
}

/** Does `text` contain any of `words` (substring, case-insensitive)? Returns the matched word or null. */
function matchAny(text, words) {
  const t = norm(text);
  for (const w of words || []) { if (w && t.includes(norm(w))) return w; }
  return null;
}

/**
 * Lightweight bag-of-words similarity 0..1 between a query and a candidate string.
 * Used by the deterministic FAQ matcher so the agent still answers without a live model.
 */
function overlapScore(query, candidate) {
  const tok = (s) => norm(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter((w) => w.length > 2);
  const q = new Set(tok(query));
  if (!q.size) return 0;
  const c = tok(candidate);
  if (!c.length) return 0;
  let hit = 0;
  const seen = new Set();
  for (const w of c) { if (q.has(w) && !seen.has(w)) { hit++; seen.add(w); } }
  return clamp01(hit / q.size);
}

/** Pull a quantity (first small integer) out of free text, default 1. */
function extractQty(text) {
  const m = String(text || '').match(/\b(\d{1,3})\b/);
  const n = m ? parseInt(m[1], 10) : 1;
  return n > 0 && n <= 999 ? n : 1;
}

module.exports = { nowISO, id, hoursAgo, norm, clamp01, maskPhone, interpolate, matchAny, overlapScore, extractQty };
