'use strict';

/**
 * Ecommerce Hub — lightweight per-buyer language preference + helpers.
 * Supports en (English), ur (Urdu script), roman (Roman Urdu, default for PK).
 * Stores each buyer's choice so future messages match. No external deps.
 */

const fs = require('fs');
const path = require('path');

function storePath() { const p = process.env.ECOMMERCE_HUB_LANG_PATH || 'data/ecommerce-lang.json'; return path.isAbsolute(p) ? p : path.join(process.cwd(), p); }
function empty() { return { version: 1, pref: {}, updatedAt: null }; }
function ensureDir(file) { try { fs.mkdirSync(path.dirname(file), { recursive: true }); } catch (_e) {} }
function read() { try { const s = JSON.parse(fs.readFileSync(storePath(), 'utf8')); if (!s.pref) s.pref = {}; return s; } catch (_e) { return empty(); } }
function write(s) { try { s.updatedAt = new Date().toISOString(); ensureDir(storePath()); fs.writeFileSync(storePath(), JSON.stringify(s, null, 2), 'utf8'); return true; } catch (_e) { return false; } }
function normNum(v) { return String(v || '').replace(/[^0-9]/g, ''); }

const SUPPORTED = ['en', 'ur', 'roman'];
function defaultLang() { const d = String(process.env.ECOMMERCE_HUB_DEFAULT_LANG || 'roman').toLowerCase(); return SUPPORTED.indexOf(d) !== -1 ? d : 'roman'; }

function setLang(phone, lang) {
  const l = String(lang || '').toLowerCase();
  if (SUPPORTED.indexOf(l) === -1) return false;
  const k = normNum(phone); if (!k) return false;
  const s = read(); s.pref[k] = l; return write(s);
}
function getLang(phone) { const k = normNum(phone); return (k && read().pref[k]) || defaultLang(); }

// Detect a language switch command, e.g. "!lang ur" or "language english".
function parseLangCommand(text) {
  const t = String(text || '').trim().toLowerCase();
  const m = t.match(/^(?:!lang|!language|language|zaban)\s+(en|english|ur|urdu|roman|romanurdu)\b/);
  if (!m) return null;
  const v = m[1];
  if (v.indexOf('en') === 0 || v === 'english') return 'en';
  if (v === 'ur' || v === 'urdu') return 'ur';
  return 'roman';
}

// Minimal phrase table for common bot lines.
const T = {
  greeting: {
    en: 'Hello! How can we help?',
    ur: '\u0622\u062f\u0627\u0628! \u06c1\u0645 \u0622\u067e \u06a9\u06cc \u06a9\u06cc\u0627 \u0645\u062f\u062f \u06a9\u0631 \u0633\u06a9\u062a\u06d2 \u06c1\u06cc\u06ba\u061f',
    roman: 'Assalam o Alaikum! Hum aap ki kya madad kar sakte hain?'
  },
  langSet: {
    en: 'Language set to English.',
    ur: '\u0632\u0628\u0627\u0646 \u0627\u0631\u062f\u0648 \u0645\u0646\u062a\u062e\u0628 \u06a9\u0631 \u0644\u06cc \u06af\u0626\u06cc\u06d4',
    roman: 'Zaban Roman Urdu set kar di gayi.'
  }
};
function t(key, lang) { const row = T[key]; if (!row) return ''; return row[lang] || row[defaultLang()] || row.en; }

module.exports = { SUPPORTED, defaultLang, setLang, getLang, parseLangCommand, t };
