'use strict';
/**
 * localization.js — i18n Feature #1: multi-language support.
 *
 * SuperSender's users (and THEIR customers) are largely Urdu/Roman-Urdu speakers. This adds:
 *   - UI/string bundles per locale (en, ur, roman-ur) with English fallback
 *   - per-contact preferred language (detected or set) so outbound copy matches the reader
 *   - an optional AI translate hook (route through the local Ollama brain) to localize any text
 *
 * Storage: JSON (data/i18n.json) for per-contact language; string bundles are in-code (extendable).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'i18n.json');
const SUPPORTED = ['en', 'ur', 'roman-ur'];
const DEFAULT_LANG = process.env.DEFAULT_LANG || 'en';

// Core UI/system strings. Extend freely. Missing keys fall back to en, then the key itself.
const BUNDLES = {
  en: {
    welcome: 'Welcome! How can we help you today?',
    opt_out_done: 'You have been unsubscribed. Reply START to opt back in.',
    opt_in_done: 'You are subscribed again. Welcome back!',
    order_confirmed: 'Your order is confirmed. Thank you!',
    payment_received: 'Payment received. Thank you!',
    talk_to_human: 'Connecting you to a team member.'
  },
  ur: {
    welcome: 'خوش آمدید! ہم آپ کی کیسے مدد کر سکتے ہیں؟',
    opt_out_done: 'آپ کو ان سبسکرائب کر دیا گیا ہے۔ دوبارہ شامل ہونے کے لیے START بھیجیں۔',
    opt_in_done: 'آپ دوبارہ سبسکرائب ہو گئے ہیں۔ خوش آمدید!',
    order_confirmed: 'آپ کا آرڈر کنفرم ہو گیا ہے۔ شکریہ!',
    payment_received: 'ادائیگی موصول ہو گئی۔ شکریہ!',
    talk_to_human: 'آپ کو ہماری ٹیم سے ملا رہے ہیں۔'
  },
  'roman-ur': {
    welcome: 'Khush aamdeed! Hum aap ki kaise madad kar sakte hain?',
    opt_out_done: 'Aap ko unsubscribe kar diya gaya hai. Dobara shaamil hone ke liye START bhejein.',
    opt_in_done: 'Aap dobara subscribe ho gaye hain. Khush aamdeed!',
    order_confirmed: 'Aap ka order confirm ho gaya hai. Shukriya!',
    payment_received: 'Payment mil gayi. Shukriya!',
    talk_to_human: 'Aap ko hamari team se mila rahe hain.'
  }
};

let translateHook = null; // async (text, targetLang) => string  (e.g. Ollama)
function setTranslateHook(fn) { translateHook = typeof fn === 'function' ? fn : null; }

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { contactLang: {} }; }
  catch { return { contactLang: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');
function normLang(l) { l = String(l || '').toLowerCase(); return SUPPORTED.includes(l) ? l : DEFAULT_LANG; }

/** Translate a string KEY for a language, with {{var}} interpolation and fallback chain. */
function t(key, lang = DEFAULT_LANG, vars = {}) {
  const L = normLang(lang);
  const str = (BUNDLES[L] && BUNDLES[L][key]) || (BUNDLES.en && BUNDLES.en[key]) || key;
  return String(str).replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

// --- per-contact language ---
function setContactLang(phone, lang) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  const data = load();
  data.contactLang[p] = normLang(lang);
  save(data);
  return { phone: p, lang: data.contactLang[p] };
}
function getContactLang(phone) {
  return load().contactLang[normPhone(phone)] || DEFAULT_LANG;
}

// Heuristic language detection from a message (cheap; AI hook can override).
function detectLang(text) {
  const s = String(text || '');
  if (/[\u0600-\u06FF]/.test(s)) return 'ur';                 // Arabic/Urdu script
  if (/\b(aap|hai|kya|kaise|shukriya|nahi|krna|chahiye)\b/i.test(s)) return 'roman-ur';
  return 'en';
}

/** Detect + remember a contact's language from an inbound message. */
function learnFromMessage(phone, text) {
  const lang = detectLang(text);
  try { setContactLang(phone, lang); } catch { /* ignore */ }
  return lang;
}

/** Localize arbitrary text to a target language via the AI hook (fallback: original). */
async function translate(text, targetLang) {
  const L = normLang(targetLang);
  if (L === 'en' || !translateHook) return text;
  try { return (await translateHook(text, L)) || text; }
  catch { return text; }
}

module.exports = { SUPPORTED, DEFAULT_LANG, setTranslateHook, t, setContactLang, getContactLang, detectLang, learnFromMessage, translate, BUNDLES };
