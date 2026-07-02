'use strict';
/**
 * AI Instant FAQ Deflection / Auto-Answer engine.
 *
 * Goal: intercept inbound customer messages and INSTANTLY answer the most
 * common repetitive questions ("do you deliver?", "what are your hours?",
 * "how much shipping?") BEFORE the heavier support agent / LLM runs. This
 * deflects a big chunk of traffic deterministically (zero model needed) and
 * only escalates the messages that actually need a human or the full agent.
 *
 * Design rules (suite-wide):
 *  - Deterministic core: scoring works with NO model. Matching is pure
 *    string math (normalized token overlap + keyword hits + alias match).
 *  - AI is OPTIONAL polish only: if a local Ollama is reachable we may rephrase
 *    the canned answer to fit the customer's tone. If not, we return the
 *    canned answer verbatim. Never blocks, never throws on model failure.
 *  - Zero new npm deps. Node built-ins + global fetch only.
 *  - File-backed, tenant-scoped storage under data/.
 *  - server.js is never touched.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data', 'faqDeflection');

// ---- optional AI brain (best-effort, never required) ---------------------
let aiBrain = null;
try {
  // eslint-disable-next-line global-require
  aiBrain = require('../../ai/aiBrain');
} catch (_) {
  aiBrain = null;
}

// ---------------------------------------------------------------------------
// storage helpers
// ---------------------------------------------------------------------------
function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) { /* ignore */ }
}

function tenantFile(tenantId) {
  const id = String(tenantId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${id}.json`);
}

function loadStore(tenantId) {
  const file = tenantFile(tenantId);
  try {
    const raw = fs.readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed.faqs) parsed.faqs = [];
    if (!parsed.stats) parsed.stats = { seen: 0, deflected: 0, escalated: 0 };
    return parsed;
  } catch (_) {
    return { faqs: [], stats: { seen: 0, deflected: 0, escalated: 0 } };
  }
}

function saveStore(tenantId, store) {
  ensureDir(DATA_DIR);
  try {
    fs.writeFileSync(tenantFile(tenantId), JSON.stringify(store, null, 2), 'utf8');
    return true;
  } catch (_) {
    return false;
  }
}

// ---------------------------------------------------------------------------
// text normalization + scoring (pure, deterministic)
// ---------------------------------------------------------------------------
const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'do', 'does', 'did', 'you', 'your', 'i', 'we',
  'to', 'of', 'in', 'on', 'for', 'and', 'or', 'me', 'my', 'can', 'could',
  'would', 'will', 'how', 'what', 'when', 'where', 'which', 'please', 'plz',
  'hi', 'hello', 'hey', 'sir', 'maam', 'mam'
]);

function normalize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text, keepStop) {
  const toks = normalize(text).split(' ').filter(Boolean);
  if (keepStop) return toks;
  const meaningful = toks.filter((t) => !STOPWORDS.has(t) && t.length > 1);
  // if stripping stopwords leaves nothing, fall back to raw tokens
  return meaningful.length ? meaningful : toks;
}

function jaccard(aSet, bSet) {
  if (!aSet.size || !bSet.size) return 0;
  let inter = 0;
  for (const t of aSet) if (bSet.has(t)) inter += 1;
  const union = aSet.size + bSet.size - inter;
  return union ? inter / union : 0;
}

/**
 * Score a single FAQ entry against the incoming message.
 * Combines: token overlap (jaccard), keyword hits, and alias phrase match.
 * Returns 0..1.
 */
function scoreFaq(msgTokens, msgNorm, faq) {
  const faqTokens = new Set(tokenize(`${faq.question} ${(faq.keywords || []).join(' ')}`));
  const overlap = jaccard(msgTokens, faqTokens);

  // keyword direct hits (strong signal)
  let kwHits = 0;
  const kws = (faq.keywords || []).map((k) => normalize(k)).filter(Boolean);
  for (const kw of kws) {
    if (kw && msgNorm.includes(kw)) kwHits += 1;
  }
  const kwScore = kws.length ? Math.min(1, kwHits / Math.max(1, Math.ceil(kws.length / 2))) : 0;

  // alias / exact phrase match (very strong)
  let aliasScore = 0;
  const aliases = (faq.aliases || []).concat([faq.question]).map((a) => normalize(a));
  for (const al of aliases) {
    if (!al) continue;
    if (msgNorm === al) { aliasScore = 1; break; }
    if (al.length >= 6 && msgNorm.includes(al)) aliasScore = Math.max(aliasScore, 0.85);
  }

  // weighted blend, biased toward strong exact signals
  const blended = Math.max(
    aliasScore,
    0.55 * overlap + 0.45 * kwScore
  );
  return Math.min(1, blended);
}

// ---------------------------------------------------------------------------
// public API
// ---------------------------------------------------------------------------

/** Add or upsert a FAQ entry for a tenant. */
function upsertFaq(tenantId, faq) {
  if (!tenantId) throw new Error('tenantId required');
  if (!faq || !faq.question || !faq.answer) {
    throw new Error('faq requires question and answer');
  }
  const store = loadStore(tenantId);
  const id = faq.id || `faq_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const entry = {
    id,
    question: String(faq.question),
    answer: String(faq.answer),
    keywords: Array.isArray(faq.keywords) ? faq.keywords.map(String) : [],
    aliases: Array.isArray(faq.aliases) ? faq.aliases.map(String) : [],
    category: faq.category ? String(faq.category) : 'general',
    hits: faq.hits || 0
  };
  const idx = store.faqs.findIndex((f) => f.id === id);
  if (idx >= 0) store.faqs[idx] = Object.assign(store.faqs[idx], entry);
  else store.faqs.push(entry);
  saveStore(tenantId, store);
  return entry;
}

/** Bulk seed FAQs (e.g. from a CSV import upstream). */
function seedFaqs(tenantId, faqs) {
  const out = [];
  for (const f of (faqs || [])) {
    try { out.push(upsertFaq(tenantId, f)); } catch (_) { /* skip bad row */ }
  }
  return out;
}

function listFaqs(tenantId) {
  return loadStore(tenantId).faqs;
}

function removeFaq(tenantId, id) {
  const store = loadStore(tenantId);
  const before = store.faqs.length;
  store.faqs = store.faqs.filter((f) => f.id !== id);
  saveStore(tenantId, store);
  return store.faqs.length < before;
}

function getStats(tenantId) {
  const store = loadStore(tenantId);
  const s = store.stats || { seen: 0, deflected: 0, escalated: 0 };
  const rate = s.seen ? +(s.deflected / s.seen).toFixed(4) : 0;
  return Object.assign({}, s, { deflectionRate: rate, faqCount: store.faqs.length });
}

/**
 * Find the best matching FAQ for a message. Pure, no side effects.
 * Returns { match, score, candidates } where candidates is the top few.
 */
function match(tenantId, message) {
  const store = loadStore(tenantId);
  const msgNorm = normalize(message);
  const msgTokens = new Set(tokenize(message));
  const scored = store.faqs.map((f) => ({ faq: f, score: scoreFaq(msgTokens, msgNorm, f) }));
  scored.sort((a, b) => b.score - a.score);
  return {
    match: scored[0] && scored[0].score > 0 ? scored[0].faq : null,
    score: scored[0] ? scored[0].score : 0,
    candidates: scored.slice(0, 3).map((s) => ({ id: s.faq.id, question: s.faq.question, score: +s.score.toFixed(3) }))
  };
}

/**
 * Optionally rephrase a canned answer with the local model to match tone.
 * Best-effort: returns the original answer on ANY failure / no model.
 */
async function maybePhrase(answer, message, options) {
  const opts = options || {};
  if (opts.phrase === false || !aiBrain || typeof aiBrain.processPrompt !== 'function') {
    return { text: answer, phrased: false };
  }
  const prompt = [
    'You are a WhatsApp support assistant. Rewrite the APPROVED answer below so it',
    'directly addresses the customer message, in the same language as the customer.',
    'Keep ALL facts identical. Do not add new claims. Keep it short and friendly.',
    '',
    `CUSTOMER: ${message}`,
    `APPROVED ANSWER: ${answer}`,
    '',
    'Rewritten answer:'
  ].join('\n');
  try {
    const res = await aiBrain.processPrompt(prompt, {
      maxTokens: 200,
      temperature: 0.3,
      timeoutMs: opts.timeoutMs || 4000
    });
    const text = (res && (res.text || res.output || res.content || '')).trim();
    if (text) return { text, phrased: true };
  } catch (_) { /* fall through to canned */ }
  return { text: answer, phrased: false };
}

/**
 * Main entry point. Given an inbound message, decide whether to auto-answer
 * (deflect) or escalate. Records stats. Never throws on model failure.
 *
 * @returns {Promise<{deflected:boolean, answer:string|null, faqId:string|null,
 *   score:number, confidence:'high'|'medium'|'low', escalate:boolean,
 *   phrased:boolean, candidates:Array}>}
 */
async function deflect(tenantId, message, options) {
  if (!tenantId) throw new Error('tenantId required');
  const opts = options || {};
  const threshold = typeof opts.threshold === 'number' ? opts.threshold : 0.55;

  const store = loadStore(tenantId);
  store.stats = store.stats || { seen: 0, deflected: 0, escalated: 0 };
  store.stats.seen += 1;

  const m = match(tenantId, message);
  const score = m.score;
  let confidence = 'low';
  if (score >= 0.8) confidence = 'high';
  else if (score >= threshold) confidence = 'medium';

  if (m.match && score >= threshold) {
    // bump hit counter on the matched faq
    const fIdx = store.faqs.findIndex((f) => f.id === m.match.id);
    if (fIdx >= 0) store.faqs[fIdx].hits = (store.faqs[fIdx].hits || 0) + 1;
    store.stats.deflected += 1;
    saveStore(tenantId, store);

    const phrased = await maybePhrase(m.match.answer, message, opts);
    return {
      deflected: true,
      answer: phrased.text,
      faqId: m.match.id,
      category: m.match.category,
      score: +score.toFixed(3),
      confidence,
      escalate: false,
      phrased: phrased.phrased,
      candidates: m.candidates
    };
  }

  // no confident match -> escalate to full support agent / human
  store.stats.escalated += 1;
  saveStore(tenantId, store);
  return {
    deflected: false,
    answer: null,
    faqId: null,
    score: +score.toFixed(3),
    confidence,
    escalate: true,
    phrased: false,
    candidates: m.candidates
  };
}

function health() {
  let storageOk = false;
  try { ensureDir(DATA_DIR); storageOk = fs.existsSync(DATA_DIR); } catch (_) { storageOk = false; }
  return {
    feature: 'ai-faq-deflection',
    ok: storageOk,
    storage: storageOk ? 'ready' : 'unavailable',
    aiBrain: !!(aiBrain && typeof aiBrain.processPrompt === 'function'),
    note: 'Deterministic FAQ matcher; AI phrasing optional. Works fully offline.'
  };
}

module.exports = {
  upsertFaq,
  seedFaqs,
  listFaqs,
  removeFaq,
  getStats,
  match,
  deflect,
  health,
  // exposed for tests
  _internal: { normalize, tokenize, scoreFaq, jaccard }
};
