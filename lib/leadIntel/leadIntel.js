// lib/leadIntel/leadIntel.js
// ────────────────────────────────────────────────────────────────────
// AI Lead Intelligence. Scores each WhatsApp lead 0-100 from real conversation
// signals, then (optionally) enriches with an AI summary + next-best-action.
//
// Two layers, by design:
//   1. Deterministic score — always available, explainable, cheap. Recency,
//      frequency, buying-intent and sentiment signals from the chat history.
//   2. AI enrichment — a short summary and a concrete next-best-action, generated
//      through the AI Brain Bridge (self-hosted Ollama). Optional + graceful.
//
// Designed to run as an overnight BATCH on the Linux GPU box (PC #2): score the
// whole base while the model is warm, so mornings start with a ranked lead list.
//
// Conversation history comes from the support agent's store when present; you
// can also pass explicit signals. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[leadIntel] aiBrain unavailable:', e.message); processPrompt = null; }

let supportAgent = null;
try { supportAgent = require('../../ai/agents/supportAgent'); } catch { /* optional */ }

const MODEL = () => process.env.LEAD_INTEL_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'lead_intel');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const scoreFile = (storeId) => path.join(DATA_DIR, `${storeId}_scores.json`);

function readScores(storeId) {
  try { const f = scoreFile(storeId); return fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, 'utf8')) : {}; }
  catch { return {}; }
}
function writeScores(storeId, data) {
  try { fs.writeFileSync(scoreFile(storeId), JSON.stringify(data, null, 2)); }
  catch (e) { console.error('[leadIntel] write failed:', e.message); }
}

// ── Signal extraction ─────────────────────────────────────────────
const BUY_WORDS = ['buy', 'order', 'price', 'rate', 'cost', 'purchase', 'checkout', 'payment', 'pay', 'kitne', 'kitna', 'kharid', 'chahiye', 'lena', 'book'];
const HOT_WORDS = ['now', 'today', 'urgent', 'asap', 'abhi', 'aaj', 'jaldi', 'turant'];
const NEG_WORDS = ['refund', 'cancel', 'scam', 'fraud', 'complaint', 'bekar', 'ghatiya', 'dhoka', 'wapas'];

function daysSince(ts) { return ts ? (Date.now() - ts) / 86400000 : 999; }

/**
 * Derive signals from a support-agent thread (or accept explicit overrides).
 */
function deriveSignals(thread = {}, overrides = {}) {
  const hist = (thread && thread.history) || [];
  const userMsgs = hist.filter(h => h.role === 'user');
  const text = userMsgs.map(m => (m.content || '').toLowerCase()).join(' ');
  const lastTs = hist.length ? hist[hist.length - 1].ts : (thread.escalatedAt || null);

  const count = (words) => words.reduce((n, w) => n + (text.includes(w) ? 1 : 0), 0);

  return {
    messageCount: overrides.messageCount != null ? overrides.messageCount : userMsgs.length,
    daysSinceLastContact: overrides.daysSinceLastContact != null ? overrides.daysSinceLastContact : Math.round(daysSince(lastTs)),
    buyIntentHits: overrides.buyIntentHits != null ? overrides.buyIntentHits : count(BUY_WORDS),
    urgencyHits: overrides.urgencyHits != null ? overrides.urgencyHits : count(HOT_WORDS),
    negativeHits: overrides.negativeHits != null ? overrides.negativeHits : count(NEG_WORDS),
    escalated: overrides.escalated != null ? overrides.escalated : Boolean(thread.escalatedAt),
    hasOrderIntent: overrides.hasOrderIntent != null ? overrides.hasOrderIntent : (thread.lastIntent === 'order')
  };
}

/**
 * Deterministic 0-100 score + band + reasons. Pure function, always available.
 */
function scoreSignals(s) {
  let score = 0;
  const reasons = [];

  // Engagement / frequency (max 25)
  const eng = Math.min(25, s.messageCount * 5);
  if (eng) { score += eng; reasons.push(`${s.messageCount} inbound msgs (+${eng})`); }

  // Recency (max 25): fresher = hotter
  let rec = 0;
  if (s.daysSinceLastContact <= 1) rec = 25;
  else if (s.daysSinceLastContact <= 3) rec = 18;
  else if (s.daysSinceLastContact <= 7) rec = 12;
  else if (s.daysSinceLastContact <= 14) rec = 6;
  if (rec) { score += rec; reasons.push(`last contact ${s.daysSinceLastContact}d ago (+${rec})`); }

  // Buying intent (max 30)
  const buy = Math.min(30, s.buyIntentHits * 10 + (s.hasOrderIntent ? 10 : 0));
  if (buy) { score += buy; reasons.push(`buying signals (+${buy})`); }

  // Urgency (max 15)
  const urg = Math.min(15, s.urgencyHits * 8);
  if (urg) { score += urg; reasons.push(`urgency (+${urg})`); }

  // Negative signal penalty
  if (s.negativeHits) { const pen = Math.min(25, s.negativeHits * 12); score -= pen; reasons.push(`negative/at-risk (-${pen})`); }
  if (s.escalated) { reasons.push('escalated to human'); }

  score = Math.max(0, Math.min(100, Math.round(score)));
  const band = score >= 70 ? 'hot' : score >= 40 ? 'warm' : score > 0 ? 'cold' : 'dormant';
  const atRisk = s.negativeHits > 0;
  return { score, band, atRisk, reasons };
}

// ── AI enrichment (optional) ──────────────────────────────────────
async function enrich(thread, scored) {
  if (!processPrompt) return null;
  const hist = (thread && thread.history) || [];
  if (!hist.length) return null;
  const historyText = hist.map(h => `${h.role === 'user' ? 'Customer' : 'Agent'}: ${h.content}`).join('\n');

  const prompt = [
    'You are a sales analyst. Given a WhatsApp lead conversation and a computed lead score, output two things.',
    `Lead score: ${scored.score}/100 (${scored.band}${scored.atRisk ? ', at-risk' : ''}).`,
    '',
    'CONVERSATION:',
    historyText,
    '',
    'Respond in exactly this format, nothing else:',
    'SUMMARY: <one line: who they are + what they want>',
    'NEXT: <one concrete next-best-action the sales team should take>'
  ].join('\n');

  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    const summary = (raw.match(/SUMMARY:\s*(.+)/i) || [])[1];
    const next = (raw.match(/NEXT:\s*(.+)/i) || [])[1];
    return { summary: summary ? summary.trim() : null, nextBestAction: next ? next.trim() : null, source: 'ollama' };
  } catch (err) {
    console.warn('[leadIntel] enrich failed:', err.message);
    return null;
  }
}

// ── Public API ──────────────────────────────────────────────────
/**
 * Score a single lead. Uses the support-agent thread if available; `signals`
 * overrides any derived signal. `enrichAI` toggles the AI summary/next-action.
 */
async function scoreLead({ storeId = 'default_store', phone, signals = {}, enrichAI = true } = {}) {
  if (!phone) throw new Error('phone is required');
  let thread = {};
  if (supportAgent && typeof supportAgent.getConversation === 'function') {
    try { thread = supportAgent.getConversation(storeId, phone) || {}; } catch { thread = {}; }
  }
  const derived = deriveSignals(thread, signals);
  const scored = scoreSignals(derived);
  let enrichment = null;
  if (enrichAI) enrichment = await enrich(thread, scored);

  const record = {
    phone, storeId,
    score: scored.score, band: scored.band, atRisk: scored.atRisk,
    reasons: scored.reasons, signals: derived,
    summary: enrichment ? enrichment.summary : null,
    nextBestAction: enrichment ? enrichment.nextBestAction : null,
    enriched: Boolean(enrichment),
    scoredAt: Date.now()
  };

  const all = readScores(storeId);
  all[phone] = record;
  writeScores(storeId, all);
  return record;
}

/**
 * Batch-score many leads (overnight run). `leads` = [{ phone, signals? }] or
 * just phone strings. If omitted, re-scores everyone already on file.
 */
async function batchScore({ storeId = 'default_store', leads, enrichAI = true } = {}) {
  let list = leads;
  if (!list || !list.length) {
    const existing = readScores(storeId);
    list = Object.keys(existing).map(phone => ({ phone }));
  }
  const results = [];
  for (const item of list) {
    const phone = typeof item === 'string' ? item : item.phone;
    if (!phone) continue;
    try {
      results.push(await scoreLead({ storeId, phone, signals: (item && item.signals) || {}, enrichAI }));
    } catch (e) {
      results.push({ phone, error: e.message });
    }
  }
  results.sort((a, b) => (b.score || 0) - (a.score || 0));
  return { storeId, count: results.length, scored: results, ranAt: Date.now() };
}

function topLeads({ storeId = 'default_store', limit = 20, band } = {}) {
  const all = Object.values(readScores(storeId));
  let list = all.sort((a, b) => (b.score || 0) - (a.score || 0));
  if (band) list = list.filter(l => l.band === band);
  return list.slice(0, limit);
}

function getLead({ storeId = 'default_store', phone } = {}) {
  return readScores(storeId)[phone] || null;
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), supportAgentWired: Boolean(supportAgent && supportAgent.getConversation) };
}

module.exports = { scoreLead, batchScore, topLeads, getLead, health, _internal: { deriveSignals, scoreSignals } };
