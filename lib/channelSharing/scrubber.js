'use strict';

/**
 * lib/channelSharing/scrubber.js
 * Content transformation pipeline for channel-to-channel reposting:
 *  - phone-number scrubbing (avoid leaking source seller numbers)
 *  - link scrubbing (strip URLs / t.me invites)
 *  - find/replace rebranding
 *  - branding footer
 *  - content filters (min length, blocked keywords)
 * Pure functions — trivially unit-testable.
 */

// Matches +92 300 1234567, 0300-1234567, (021) 111 222 333, etc. (>=7 digits)
const PHONE_RE = /(?:(?:\+|00)?\d[\d\s().-]{6,}\d)/g;
const URL_RE = /\b((?:https?:\/\/|www\.)[^\s]+|t\.me\/[^\s]+|wa\.me\/[^\s]+)/gi;

function scrubPhones(text, replacement = '') {
  return String(text || '').replace(PHONE_RE, (m) => {
    const digits = m.replace(/\D/g, '');
    return digits.length >= 7 ? replacement : m; // only redact real phone-length runs
  });
}

function scrubLinks(text, replacement = '') {
  return String(text || '').replace(URL_RE, replacement);
}

function findReplace(text, pairs = []) {
  let out = String(text || '');
  for (const p of pairs) {
    if (!p || !p.from) continue;
    out = out.split(p.from).join(p.to != null ? p.to : '');
  }
  return out;
}

function applyBranding(text, footer) {
  const t = String(text || '').trimEnd();
  if (!footer) return t;
  if (t.includes(footer)) return t; // don't double-append
  return `${t}\n\n${footer}`;
}

/** Collapse 3+ blank lines and trim. */
function tidy(text) {
  return String(text || '').replace(/\n{3,}/g, '\n\n').trim();
}

/**
 * Run the full transform pipeline.
 * @param {string} text
 * @param {object} t - transform config
 *   { scrubPhones, scrubLinks, findReplace:[{from,to}], branding:{enabled,footer} }
 */
function transform(text, t = {}) {
  let out = String(text || '');
  if (t.scrubPhones) out = scrubPhones(out, t.phoneReplacement || '');
  if (t.scrubLinks) out = scrubLinks(out, t.linkReplacement || '');
  if (Array.isArray(t.findReplace) && t.findReplace.length) out = findReplace(out, t.findReplace);
  if (t.branding && t.branding.enabled) out = applyBranding(out, t.branding.footer);
  return tidy(out);
}

/**
 * Decide whether transformed content is allowed to post.
 * @returns {{ ok:boolean, reason?:string }}
 */
function passesFilters(text, f = {}) {
  const t = String(text || '');
  if (f.minLen && t.replace(/\s/g, '').length < f.minLen) return { ok: false, reason: 'too-short' };
  if (Array.isArray(f.blockKeywords)) {
    const low = t.toLowerCase();
    for (const kw of f.blockKeywords) {
      if (kw && low.includes(String(kw).toLowerCase())) return { ok: false, reason: 'blocked-keyword:' + kw };
    }
  }
  return { ok: true };
}

module.exports = { scrubPhones, scrubLinks, findReplace, applyBranding, tidy, transform, passesFilters, PHONE_RE, URL_RE };
