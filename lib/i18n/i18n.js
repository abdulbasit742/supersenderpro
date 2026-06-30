'use strict';
/**
 * i18n.js — Localization Feature #1: multi-language UI/message strings.
 *
 * The Pakistan market is Urdu-first / Roman-Urdu heavy. This lets the product speak the user's
 * language: string catalogs per locale (en, ur, roman), `t(key, vars, locale)` lookup with English
 * fallback, {{var}} interpolation, and a per-tenant default locale. New locales/keys can be added at
 * runtime with addStrings().
 *
 * Storage: JSON for the per-tenant locale prefs (data/i18n_prefs.json). Catalogs ship in-code so
 * they're always available.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'i18n_prefs.json');
const DEFAULT_LOCALE = 'en';
const LOCALES = ['en', 'ur', 'roman'];

// Core catalog. Keep keys stable; translations can be expanded over time.
const CATALOG = {
  en: {
    'welcome': 'Welcome, {{name}}!',
    'optout.confirm': 'You have been unsubscribed. Reply START to opt back in.',
    'optin.confirm': 'You are subscribed again. Welcome back!',
    'payment.success': 'Payment received — thank you, {{name}}!',
    'payment.failed': 'Your payment could not be processed. Please update your details.',
    'support.handoff': 'Let me connect you with a team member who can help.',
    'plan.limit': 'You have reached your plan limit. Upgrade to continue.'
  },
  ur: {
    'welcome': 'خوش آمدید، {{name}}!',
    'optout.confirm': 'آپ کی سبسکرپشن بند کر دی گئی ہے۔ دوبارہ شروع کرنے کے لیے START لکھیں۔',
    'optin.confirm': 'آپ دوبارہ سبسکائب ہو گئے ہیں۔ خوش آمدید!',
    'payment.success': 'ادائیگی وصول ہو گئی — شکریہ، {{name}}!',
    'payment.failed': 'آپ کی ادائیگی پروسیس نہیں ہو سکی۔ براہ کرم تفصیلات اپ ڈیٹ کریں۔',
    'support.handoff': 'میں آپ کو ٹیم کے کسی رکن سے ملاتا ہوں جو مدد کر سکے۔',
    'plan.limit': 'آپ اپنے پلان کی حد تک پہنچ گئے ہیں۔ جاری رکھنے کے لیے اپ گریڈ کریں۔'
  },
  roman: {
    'welcome': 'Khush aamdeed, {{name}}!',
    'optout.confirm': 'Aap ki subscription band kar di gayi hai. Dobara shuru karne ke liye START likhein.',
    'optin.confirm': 'Aap dobara subscribe ho gaye hain. Khush aamdeed!',
    'payment.success': 'Payment mil gayi — shukriya, {{name}}!',
    'payment.failed': 'Aap ki payment process nahi ho saki. Baraye meharbani details update karein.',
    'support.handoff': 'Main aap ko team ke kisi member se milata hoon jo madad kar sake.',
    'plan.limit': 'Aap apne plan ki limit tak pohonch gaye hain. Jari rakhne ke liye upgrade karein.'
  }
};

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { tenantLocale: {} }; }
  catch { return { tenantLocale: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}

function interpolate(str, vars = {}) {
  return String(str || '').replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (vars[k] != null ? String(vars[k]) : ''));
}

/** Translate a key. Falls back: requested locale -> English -> the key itself. */
function t(key, vars = {}, locale = DEFAULT_LOCALE) {
  const loc = LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
  const str = (CATALOG[loc] && CATALOG[loc][key]) || (CATALOG.en && CATALOG.en[key]) || key;
  return interpolate(str, vars);
}

/** Per-tenant default locale. */
function setTenantLocale(tenantId, locale) {
  if (!LOCALES.includes(locale)) throw new Error(`locale must be one of: ${LOCALES.join(', ')}`);
  const data = load();
  data.tenantLocale[String(tenantId)] = locale;
  save(data);
  return { tenantId: String(tenantId), locale };
}
function getTenantLocale(tenantId) {
  return load().tenantLocale[String(tenantId)] || DEFAULT_LOCALE;
}

/** Translate using a tenant's configured locale. */
function tFor(tenantId, key, vars = {}) {
  return t(key, vars, getTenantLocale(tenantId));
}

/** Add/extend a locale catalog at runtime. */
function addStrings(locale, strings = {}) {
  if (!CATALOG[locale]) { CATALOG[locale] = {}; if (!LOCALES.includes(locale)) LOCALES.push(locale); }
  Object.assign(CATALOG[locale], strings);
  return Object.keys(CATALOG[locale]).length;
}

function locales() { return LOCALES.slice(); }
function keys() { return Object.keys(CATALOG.en); }

module.exports = { LOCALES, DEFAULT_LOCALE, t, tFor, setTenantLocale, getTenantLocale, addStrings, locales, keys };
