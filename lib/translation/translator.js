// lib/translation/translator.js
// ────────────────────────────────────────────────────────────────────
// Real-time two-way chat translation. Lets a customer write in any language and
// an agent read/reply in theirs:
//   - inbound:  customer message  -> agent language (e.g. Urdu -> English)
//   - outbound: agent reply       -> customer language (English -> Urdu)
//
// Translation runs through the AI Brain Bridge (self-hosted Ollama). Per-contact
// language is remembered so outbound replies auto-target the right language. A
// small in-memory cache avoids re-translating identical strings. If the model is
// offline it passes text through unchanged (marked source:'passthrough') so the
// chat never blocks. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[translator] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.TRANSLATION_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const AGENT_LANG = () => process.env.AGENT_LANGUAGE || 'en';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'translation');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const langFile = (storeId) => path.join(DATA_DIR, `${storeId}_contact_lang.json`);

function readLang(storeId) {
  try { const f = langFile(storeId); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; }
  catch { return {}; }
}
function writeLang(storeId, data) {
  try { fs.writeFileSync(langFile(storeId), JSON.stringify(data, null, 2)); } catch (e) { console.error('[translator] write failed:', e.message); }
}

const LANG_NAMES = { en: 'English', ur: 'Urdu', 'roman-ur': 'Roman Urdu', hi: 'Hindi', ar: 'Arabic', es: 'Spanish', fr: 'French' };
function langName(code) { return LANG_NAMES[code] || code; }

// ── Heuristic language detection (cheap, no model) ───────────────────────
function detectLanguage(text = '') {
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const roman = /\b(hai|nahi|nahin|kya|kaise|kitne|kitna|chahiye|krna|karna|acha|theek|bhai|salam|assalam|kar|hain|raha|rahe)\b/i;
  if (roman.test(text)) return 'roman-ur';
  return 'en';
}

// ── Tiny LRU-ish cache ───────────────────────────────────────────
const CACHE = new Map();
const CACHE_MAX = 500;
function cacheGet(k) { return CACHE.get(k); }
function cacheSet(k, v) { if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value); CACHE.set(k, v); }

/**
 * Translate text to a target language.
 * @returns {Promise<{ text, from, to, source }>}  source: 'ollama' | 'passthrough' | 'noop'
 */
async function translate(text, { to = 'en', from } = {}) {
  const original = String(text || '');
  if (!original.trim()) return { text: original, from: from || 'und', to, source: 'noop' };
  const detected = from || detectLanguage(original);
  if (detected === to) return { text: original, from: detected, to, source: 'noop' };

  const key = `${detected}>${to}:${original}`;
  const cached = cacheGet(key);
  if (cached) return { text: cached, from: detected, to, source: 'cache' };

  if (!processPrompt) return { text: original, from: detected, to, source: 'passthrough' };

  const prompt = [
    `Translate the following message from ${langName(detected)} to ${langName(to)}.`,
    'Preserve meaning, tone, names, numbers, prices and any {{merge_fields}} exactly.',
    'Return ONLY the translated text, no quotes, no notes.',
    '',
    original
  ].join('\n');

  try {
    const raw = await processPrompt(prompt, { model: MODEL(), languageCode: to });
    const looksUnconfigured = typeof raw === 'string' && /\[AI Assist\]|Connect your .* in the environment/i.test(raw);
    if (!raw || looksUnconfigured) return { text: original, from: detected, to, source: 'passthrough' };
    const out = String(raw).trim().replace(/^"|"$/g, '');
    cacheSet(key, out);
    return { text: out, from: detected, to, source: 'ollama' };
  } catch (err) {
    console.warn('[translator] translate failed:', err.message);
    return { text: original, from: detected, to, source: 'passthrough' };
  }
}

// ── Per-contact language memory ────────────────────────────────────
function rememberContactLang(storeId, phone, lang) {
  if (!phone || !lang) return;
  const all = readLang(storeId); all[phone] = { lang, ts: Date.now() }; writeLang(storeId, all);
}
function getContactLang(storeId, phone) {
  const all = readLang(storeId); return all[phone] ? all[phone].lang : null;
}

/**
 * Inbound: customer -> agent language. Records the customer's language so we can
 * reply in it later. Returns the translation plus the detected customer language.
 */
async function translateInbound({ storeId = 'default_store', phone, text, agentLang = AGENT_LANG() } = {}) {
  const detected = detectLanguage(String(text || ''));
  if (phone) rememberContactLang(storeId, phone, detected);
  const r = await translate(text, { to: agentLang, from: detected });
  return { ...r, customerLang: detected, agentLang };
}

/**
 * Outbound: agent reply -> customer language. Uses remembered language for the
 * contact (or an explicit `to`, or falls back to detecting the original).
 */
async function translateOutbound({ storeId = 'default_store', phone, text, to, agentLang = AGENT_LANG() } = {}) {
  const target = to || (phone && getContactLang(storeId, phone)) || detectLanguage(String(text || ''));
  const r = await translate(text, { to: target, from: agentLang });
  return { ...r, customerLang: target, agentLang };
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), agentLanguage: AGENT_LANG(), cacheSize: CACHE.size };
}

module.exports = {
  translate, translateInbound, translateOutbound,
  detectLanguage, rememberContactLang, getContactLang, health,
  _internal: { langName, LANG_NAMES }
};
