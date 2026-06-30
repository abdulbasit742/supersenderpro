'use strict';
/**
 * #107 Language Detection + Routing
 * -------------------------------------------------------------
 * Detects the language of an inbound WhatsApp message and routes
 * it to the correct language handling lane.
 *
 * Design rules (suite-wide):
 *  - Deterministic core: works with NO model. Script + keyword
 *    based scoring decides the language. The model NEVER overrides
 *    a confident deterministic result; it is only a tie-break for
 *    ambiguous Latin-script messages (en vs roman-ur vs hi-latin).
 *  - Optional Ollama tie-break with graceful fallback (offline ok).
 *  - Zero new npm deps. File-backed, tenant-scoped memory.
 *
 * Supported: en, ur (Arabic script Urdu), roman-ur, hi (Devanagari),
 *            hi-latin, ar.
 */

const fs = require('fs');
const path = require('path');

let aiBrain = null;
try { aiBrain = require('../../ai/aiBrain'); } catch (_) { aiBrain = null; }

const DATA_DIR = path.join(process.cwd(), 'data', 'languageDetect');

function ensureDir(p) { try { fs.mkdirSync(p, { recursive: true }); } catch (_) {} }
function memFile(tenantId) {
  ensureDir(DATA_DIR);
  const safe = String(tenantId || 'default').replace(/[^a-z0-9_-]/gi, '_');
  return path.join(DATA_DIR, safe + '.json');
}
function loadMem(tenantId) {
  try { return JSON.parse(fs.readFileSync(memFile(tenantId), 'utf8')); } catch (_) { return {}; }
}
function saveMem(tenantId, mem) {
  try { ensureDir(DATA_DIR); fs.writeFileSync(memFile(tenantId), JSON.stringify(mem, null, 2)); } catch (_) {}
}

// --- Script range detection (deterministic, highest confidence) ---
function scriptCounts(text) {
  const s = String(text || '');
  let arabic = 0, devanagari = 0, latin = 0, total = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0);
    if (c >= 0x0600 && c <= 0x06FF) { arabic++; total++; }
    else if (c >= 0x0900 && c <= 0x097F) { devanagari++; total++; }
    else if ((c >= 0x41 && c <= 0x5A) || (c >= 0x61 && c <= 0x7A)) { latin++; total++; }
  }
  return { arabic, devanagari, latin, total };
}

// Urdu-specific Arabic letters (to split ur vs ar)
const URDU_HINT = /[\u0679\u067E\u0686\u0688\u0691\u06BA\u06BE\u06C1\u06CC\u06D2]/; // ٹ پ چ ڈ ڑ ں ھ ہ ی ے

// Roman-Urdu / Hindi-Latin keyword cues (common transliterations)
const ROMAN_UR = ['aap',' kro','karo','nahi','nhi','hai','hy','kya','kia','acha','theek','thik','bhai','behen','paisa','paise','kitna','kitni','order','chahiye','chahie','mujhe','mujhy','kaise','kaisay','kar','rha','rahi','rahe','ho','hain','main','mera','meri','tera','teri','yaar','shukriya','salam','assalam'];
const HI_LATIN = ['kripya','dhanyavaad','namaste','haan','nahin','aap','kaise','kyun','accha','theek','bhai','paisa','order'];
const EN_COMMON = ['the','and','you','your','please','order','price','hello','hi','thanks','thank','need','want','how','what','when','where','can','is','are','my'];

function tokenize(text) {
  return String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

function keywordScore(tokens, list) {
  const set = new Set(list.map(w => w.trim()));
  let hits = 0;
  for (const t of tokens) if (set.has(t)) hits++;
  return hits;
}

const LANG_NAMES = {
  en: 'English', ur: 'Urdu', 'roman-ur': 'Roman Urdu',
  hi: 'Hindi', 'hi-latin': 'Hindi (Latin)', ar: 'Arabic', unknown: 'Unknown'
};

/**
 * Deterministic detect. Returns { lang, confidence (0-1), method, scores }.
 */
function detectDeterministic(text) {
  const sc = scriptCounts(text);
  // Non-Latin scripts are high confidence by range.
  if (sc.total > 0 && (sc.arabic + sc.devanagari) >= sc.latin) {
    if (sc.devanagari > sc.arabic) {
      return { lang: 'hi', confidence: 0.95, method: 'script', scores: sc };
    }
    // Arabic script: split ur vs ar via Urdu-only letters
    const isUrdu = URDU_HINT.test(String(text));
    return { lang: isUrdu ? 'ur' : 'ar', confidence: isUrdu ? 0.92 : 0.8, method: 'script', scores: sc };
  }

  // Latin script: disambiguate en / roman-ur / hi-latin by keywords
  const tokens = tokenize(text);
  if (tokens.length === 0) return { lang: 'unknown', confidence: 0, method: 'empty', scores: sc };

  const en = keywordScore(tokens, EN_COMMON);
  const ru = keywordScore(tokens, ROMAN_UR);
  const hl = keywordScore(tokens, HI_LATIN);
  const scores = { en, 'roman-ur': ru, 'hi-latin': hl };

  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [topLang, topScore] = ranked[0];
  const second = ranked[1] ? ranked[1][1] : 0;

  if (topScore === 0) {
    // No cues. Default Latin → english, low confidence (tie-break candidate).
    return { lang: 'en', confidence: 0.4, method: 'default-latin', scores, ambiguous: true };
  }
  const margin = topScore - second;
  const confidence = Math.min(0.9, 0.5 + margin * 0.15 + topScore * 0.05);
  return { lang: topLang, confidence, method: 'keyword', scores, ambiguous: margin <= 1 };
}

/**
 * Optional AI tie-break for ambiguous Latin messages.
 * Never overrides a confident deterministic result.
 */
async function aiTieBreak(text) {
  if (!aiBrain || typeof aiBrain.processPrompt !== 'function') return null;
  const prompt = 'You are a language identifier. Reply with EXACTLY ONE token from this set and nothing else: en, roman-ur, hi-latin. Message: "' + String(text).slice(0, 400) + '"';
  try {
    const out = await aiBrain.processPrompt(prompt, { maxTokens: 8, temperature: 0 });
    const raw = (typeof out === 'string' ? out : (out && out.text) || '').toLowerCase();
    const m = raw.match(/roman-ur|hi-latin|en/);
    return m ? m[0] : null;
  } catch (_) { return null; }
}

/**
 * Main entry. detect(text, opts) -> { lang, langName, confidence, method, lane }
 * opts: { tenantId, contactId, useAI (default true), sticky (default true) }
 */
async function detect(text, opts = {}) {
  const tenantId = opts.tenantId || 'default';
  const useAI = opts.useAI !== false;
  const sticky = opts.sticky !== false;

  let res = detectDeterministic(text);

  // AI tie-break only when ambiguous + low confidence + Latin script
  if (useAI && res.ambiguous && res.confidence < 0.6) {
    const guess = await aiTieBreak(text);
    if (guess && guess !== res.lang) {
      res = { ...res, lang: guess, method: res.method + '+ai', confidence: 0.65 };
    } else if (guess) {
      res = { ...res, method: res.method + '+ai', confidence: Math.max(res.confidence, 0.65) };
    }
  }

  // Per-contact sticky memory: if still low confidence, fall back to last known.
  if (sticky && opts.contactId) {
    const mem = loadMem(tenantId);
    const prev = mem[opts.contactId];
    if (res.confidence < 0.5 && prev && prev.lang) {
      res = { ...res, lang: prev.lang, method: res.method + '+sticky', confidence: 0.55 };
    }
    if (res.confidence >= 0.6) {
      mem[opts.contactId] = { lang: res.lang, ts: Date.now() };
      saveMem(tenantId, mem);
    }
  }

  const lane = routeLane(res.lang);
  return {
    lang: res.lang,
    langName: LANG_NAMES[res.lang] || res.lang,
    confidence: Math.round(res.confidence * 100) / 100,
    method: res.method,
    scores: res.scores,
    lane
  };
}

/**
 * Map a language to a handling lane. Roman-ur + ur share the urdu lane;
 * hi-latin + hi share hindi; everything else its own.
 */
function routeLane(lang) {
  switch (lang) {
    case 'ur':
    case 'roman-ur': return 'urdu';
    case 'hi':
    case 'hi-latin': return 'hindi';
    case 'ar': return 'arabic';
    case 'en': return 'english';
    default: return 'english';
  }
}

function forgetContact(tenantId, contactId) {
  const mem = loadMem(tenantId || 'default');
  delete mem[contactId];
  saveMem(tenantId || 'default', mem);
  return true;
}

module.exports = { detect, detectDeterministic, routeLane, forgetContact, LANG_NAMES };
