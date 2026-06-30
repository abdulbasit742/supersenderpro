'use strict';
/**
 * AI Inbound Spam & Abuse Filter
 * --------------------------------
 * Protects number health + team inbox by classifying inbound messages.
 * Deterministic core works with NO model. Optional Ollama tie-break for
 * borderline cases via ai/aiBrain. Tenant-scoped, file-backed.
 *
 * Labels: 'clean' | 'spam' | 'scam' | 'abuse'
 * Actions: 'allow' | 'quarantine' | 'block'
 */

const fs = require('fs');
const path = require('path');

let aiBrain = null;
try { aiBrain = require('../../ai/aiBrain'); } catch (_) { aiBrain = null; }

const DATA_DIR = path.join(process.cwd(), 'data', 'spamFilter');

function ensureDir(dir) {
  try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
}
function tenantFile(tenantId) {
  if (!tenantId) throw new Error('tenantId is required');
  ensureDir(DATA_DIR);
  return path.join(DATA_DIR, `${String(tenantId).replace(/[^a-z0-9_-]/gi, '_')}.json`);
}
function loadStore(tenantId) {
  const f = tenantFile(tenantId);
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch (_) { return { stats: { total: 0, clean: 0, spam: 0, scam: 0, abuse: 0, blocked: 0, quarantined: 0, allowed: 0 }, outcomes: [] }; }
}
function saveStore(tenantId, store) {
  fs.writeFileSync(tenantFile(tenantId), JSON.stringify(store, null, 2));
}

// ---- Lexicons & heuristics -------------------------------------------------
const SCAM_TERMS = [
  'lottery', 'you have won', 'congratulations you', 'claim your prize', 'bitcoin', 'crypto investment',
  'double your money', 'guaranteed profit', 'western union', 'gift card', 'send otp', 'share otp',
  'verify your account', 'account suspended', 'click this link to claim', 'nigerian prince', 'inheritance',
  'wire transfer', 'bank details', 'cvv', 'one time password'
];
const SPAM_TERMS = [
  'buy now', 'limited offer', 'act now', 'subscribe', 'free trial', 'work from home', 'earn $$$',
  'make money fast', 'cheap meds', 'viagra', 'casino', 'loan approved', 'pre-approved', 'no credit check',
  'increase followers', 'seo services', 'best price guaranteed'
];
const ABUSE_TERMS = [
  'idiot', 'stupid', 'fuck', 'fucking', 'bitch', 'asshole', 'bastard', 'shut up', 'kill you', 'i will kill',
  'moron', 'retard', 'die', 'hate you', 'screw you'
];

function countMatches(text, terms) {
  const hits = [];
  for (const t of terms) {
    if (text.includes(t)) hits.push(t);
  }
  return hits;
}

function urlCount(text) {
  const m = text.match(/https?:\/\/|www\.|\b[a-z0-9-]+\.(com|net|org|io|xyz|info|ru|cn|link|click)\b/gi);
  return m ? m.length : 0;
}

function capsRatio(raw) {
  const letters = raw.replace(/[^a-zA-Z]/g, '');
  if (letters.length < 8) return 0;
  const caps = raw.replace(/[^A-Z]/g, '').length;
  return caps / letters.length;
}

function repeatScore(raw) {
  // repeated chars (aaaaa) or repeated words
  let score = 0;
  if (/(.)\1{4,}/.test(raw)) score += 1;
  const words = raw.toLowerCase().split(/\s+/).filter(Boolean);
  const freq = {};
  for (const w of words) { freq[w] = (freq[w] || 0) + 1; }
  if (Object.values(freq).some((c) => c >= 4)) score += 1;
  return score;
}

/**
 * Deterministic classification. Always available, no model needed.
 * Returns { label, score (0-100), reasons[], action }
 */
function classifyDeterministic(text) {
  const raw = String(text || '');
  const lower = raw.toLowerCase();
  const reasons = [];

  const scamHits = countMatches(lower, SCAM_TERMS);
  const spamHits = countMatches(lower, SPAM_TERMS);
  const abuseHits = countMatches(lower, ABUSE_TERMS);
  const links = urlCount(raw);
  const caps = capsRatio(raw);
  const repeats = repeatScore(raw);

  let scamScore = scamHits.length * 28;
  let spamScore = spamHits.length * 18;
  let abuseScore = abuseHits.length * 30;

  if (links >= 1) { spamScore += 12; reasons.push(`${links} link(s)`); }
  if (links >= 3) { scamScore += 15; }
  if (caps > 0.6) { spamScore += 14; reasons.push('excessive caps'); }
  if (repeats > 0) { spamScore += 10 * repeats; reasons.push('repeated chars/words'); }

  if (scamHits.length) reasons.push(`scam terms: ${scamHits.slice(0, 4).join(', ')}`);
  if (spamHits.length) reasons.push(`spam terms: ${spamHits.slice(0, 4).join(', ')}`);
  if (abuseHits.length) reasons.push(`abusive terms: ${abuseHits.slice(0, 4).join(', ')}`);

  const scores = { scam: scamScore, spam: spamScore, abuse: abuseScore };
  let label = 'clean';
  let score = 0;
  for (const [k, v] of Object.entries(scores)) {
    if (v > score) { score = v; label = k; }
  }
  score = Math.min(100, score);
  if (score < 25) { label = 'clean'; }

  const action = recommendAction(label, score);
  return { label, score, reasons, action, signals: { scamHits, spamHits, abuseHits, links, caps: Number(caps.toFixed(2)), repeats } };
}

function recommendAction(label, score) {
  if (label === 'clean') return 'allow';
  if (label === 'abuse') return score >= 60 ? 'block' : 'quarantine';
  if (label === 'scam') return score >= 55 ? 'block' : 'quarantine';
  if (label === 'spam') return score >= 70 ? 'block' : (score >= 35 ? 'quarantine' : 'allow');
  return 'allow';
}

function isBorderline(result) {
  // borderline = mid-confidence, worth an AI tie-break
  return result.score >= 25 && result.score <= 55;
}

/**
 * Optional AI tie-break for borderline cases. Falls back gracefully
 * to the deterministic result if no model / any error.
 */
async function aiTieBreak(text, base) {
  if (!aiBrain || typeof aiBrain.processPrompt !== 'function') return base;
  try {
    const prompt = `Classify the following inbound WhatsApp message strictly as one of: clean, spam, scam, abuse.\nReply with ONLY a JSON object: {"label":"...","confidence":0-100}.\nMessage: """${String(text).slice(0, 600)}"""`;
    const out = await aiBrain.processPrompt(prompt, { maxTokens: 60, temperature: 0 });
    const txt = typeof out === 'string' ? out : (out && (out.text || out.content || out.output)) || '';
    const m = txt.match(/\{[\s\S]*\}/);
    if (!m) return base;
    const parsed = JSON.parse(m[0]);
    const label = ['clean', 'spam', 'scam', 'abuse'].includes(parsed.label) ? parsed.label : base.label;
    const conf = Math.max(0, Math.min(100, Number(parsed.confidence) || base.score));
    const merged = { ...base, label, score: Math.round((base.score + conf) / 2), aiAssisted: true };
    merged.action = recommendAction(merged.label, merged.score);
    merged.reasons = [...base.reasons, `ai tie-break -> ${label} (${conf})`];
    return merged;
  } catch (_) {
    return base;
  }
}

/**
 * Main entry. Deterministic always; AI only for borderline + when allowed.
 */
async function classify(text, opts = {}) {
  const base = classifyDeterministic(text);
  if (opts.useAi !== false && isBorderline(base)) {
    return await aiTieBreak(text, base);
  }
  return base;
}

/**
 * Classify + persist counters for a tenant. Returns the classification.
 */
async function check(tenantId, text, opts = {}) {
  const result = await classify(text, opts);
  const store = loadStore(tenantId);
  store.stats.total += 1;
  store.stats[result.label] = (store.stats[result.label] || 0) + 1;
  if (result.action === 'block') store.stats.blocked += 1;
  else if (result.action === 'quarantine') store.stats.quarantined += 1;
  else store.stats.allowed += 1;
  saveStore(tenantId, store);
  return result;
}

/**
 * Record human feedback (false positive / negative) for later tuning.
 */
function recordOutcome(tenantId, { text, predicted, actual, action } = {}) {
  const store = loadStore(tenantId);
  store.outcomes.push({ ts: Date.now(), text: String(text || '').slice(0, 280), predicted, actual, action });
  if (store.outcomes.length > 1000) store.outcomes = store.outcomes.slice(-1000);
  saveStore(tenantId, store);
  return { ok: true, recorded: store.outcomes.length };
}

function stats(tenantId) {
  const store = loadStore(tenantId);
  const s = store.stats;
  const flagged = (s.spam || 0) + (s.scam || 0) + (s.abuse || 0);
  return { ...s, flagged, flaggedRate: s.total ? Number((flagged / s.total).toFixed(3)) : 0, feedbackCount: store.outcomes.length };
}

module.exports = {
  classify,
  classifyDeterministic,
  check,
  recordOutcome,
  stats,
  recommendAction,
  isBorderline,
  _internal: { urlCount, capsRatio, repeatScore }
};
