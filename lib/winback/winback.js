// lib/winback/winback.js
// ────────────────────────────────────────────────────────────────────
// AI Dormant-Customer Win-Back. Cart recovery (#31) chases a stalled order;
// THIS chases people who simply went quiet — no contact in N days. It finds the
// dormant set (from the lead-intel store), segments them by likely reason, and
// crafts a tailored re-engagement message per segment with the AI Brain Bridge
// (self-hosted Ollama). Send-time aware (#21) and suppression-aware so we never
// pester someone who keeps ignoring us.
//
// Deterministic segmentation + template fallback so it runs with no model.
// Built to run as a weekly batch on PC #2. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[winback] aiBrain unavailable:', e.message); processPrompt = null; }

let sendTime = null;
try { sendTime = require('../sendTime/sendTimeOptimizer'); } catch { /* optional */ }

const MODEL = () => process.env.WINBACK_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const DORMANT_DAYS = () => parseInt(process.env.WINBACK_DORMANT_DAYS || '21', 10);
const MAX_ATTEMPTS = () => parseInt(process.env.WINBACK_MAX_ATTEMPTS || '2', 10);

const DATA_ROOT = path.join(__dirname, '..', '..', 'data');
const DATA_DIR = path.join(DATA_ROOT, 'winback');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const stateFile = (storeId) => path.join(DATA_DIR, `${storeId}_state.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[winback] write failed:', e.message); } }
function readState(storeId) { return readJSON(stateFile(storeId), {}); }
function writeState(storeId, d) { writeJSON(stateFile(storeId), d); }

function leadStore(storeId) {
  return readJSON(path.join(DATA_ROOT, 'lead_intel', `${storeId}_scores.json`), {});
}

// ── Segmentation ───────────────────────────────────────────────
// Reason buckets drive both message tone and any incentive.
const SEGMENTS = ['at_risk', 'lapsed_buyer', 'price_sensitive', 'never_purchased', 'general'];

function segmentOf(lead) {
  const s = lead.signals || {};
  if (lead.atRisk) return 'at_risk';
  if (s.hasOrderIntent && !s.buyIntentHits) return 'lapsed_buyer';
  if ((s.buyIntentHits || 0) >= 1 && (lead.band === 'cold' || lead.band === 'dormant')) return 'price_sensitive';
  if (!s.hasOrderIntent && (s.messageCount || 0) >= 1) return 'never_purchased';
  return 'general';
}

/**
 * Find dormant customers: last contact older than dormantDays, not already
 * exhausted/suppressed/won in win-back state.
 */
function findDormant({ storeId = 'default_store', dormantDays = DORMANT_DAYS() } = {}) {
  const leads = leadStore(storeId);
  const state = readState(storeId);
  const out = [];
  for (const phone of Object.keys(leads)) {
    const lead = leads[phone];
    const days = lead.signals && lead.signals.daysSinceLastContact != null ? lead.signals.daysSinceLastContact : null;
    if (days == null || days < dormantDays) continue;
    const st = state[phone];
    if (st && (st.status === 'won' || st.status === 'suppressed' || st.status === 'exhausted')) continue;
    out.push({ phone, daysSinceLastContact: days, band: lead.band, segment: segmentOf(lead), score: lead.score || 0 });
  }
  return out.sort((a, b) => (b.score || 0) - (a.score || 0));
}

function segmentCounts(dormant) {
  return dormant.reduce((a, d) => { a[d.segment] = (a[d.segment] || 0) + 1; return a; }, {});
}

// ── Message crafting ─────────────────────────────────────────
const TEMPLATES = {
  at_risk:        'Hi {{name}}, we noticed you had a rough experience and we\'d love to make it right. Reply and we\'ll sort it out personally. \ud83d\ude4f',
  lapsed_buyer:   'Hey {{name}}! It\'s been a while \ud83d\ude0a We just restocked and have some new arrivals. Want me to show you what\'s new?',
  price_sensitive:'Hi {{name}}! Good news — we have a special offer running this week. Reply OFFER and I\'ll share the deal. Reply STOP to opt out.',
  never_purchased:'Hi {{name}}! Still interested? I can answer any questions and help you pick the right option. What were you looking for?',
  general:        'Hi {{name}}! We miss you \ud83d\udc4b Anything we can help you with today?'
};

async function craftMessage({ segment = 'general', incentive = '' } = {}) {
  const base = TEMPLATES[segment] || TEMPLATES.general;
  if (!processPrompt) return { text: base, source: 'fallback' };
  const segHint = {
    at_risk: 'They had a negative experience; be empathetic, offer to make it right, no hard sell.',
    lapsed_buyer: 'They bought before but went quiet; warm, mention new arrivals/restock.',
    price_sensitive: 'They showed interest but were price-conscious; lead with a soft offer.',
    never_purchased: 'They engaged but never bought; helpful, remove friction, ask what they wanted.',
    general: 'Generic friendly re-engagement.'
  }[segment];
  const prompt = [
    'Write a SHORT (1-2 line) WhatsApp re-engagement message for a customer who went quiet.',
    `Segment context: ${segHint}`,
    incentive ? `Include this incentive: ${incentive}.` : 'Only offer a discount if it fits the segment.',
    'Include {{name}}. Warm, not desperate. Add "Reply STOP to opt out" only if it includes an offer.',
    'Avoid spammy words and ALL CAPS. Return ONLY the message.'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return { text: base, source: 'fallback' };
    return { text: String(raw).trim().replace(/^"|"$/g, ''), source: 'ollama' };
  } catch (err) {
    console.warn('[winback] craft failed:', err.message);
    return { text: base, source: 'fallback' };
  }
}

// ── Launch a win-back campaign ───────────────────────────────────
function whenFor(storeId, phone) {
  if (sendTime && typeof sendTime.nextSlot === 'function') {
    try { return sendTime.nextSlot({ storeId, phone }).whenISO; } catch { /* fall through */ }
  }
  return new Date().toISOString();
}

/**
 * Build a win-back plan: one message per dormant contact, crafted by segment,
 * timed via send-time, recorded in state (status 'queued', attempt incremented).
 * Does NOT send — returns a plan your queue worker enqueues.
 */
async function launch({ storeId = 'default_store', dormantDays = DORMANT_DAYS(), max = 200, incentiveBySegment = {} } = {}) {
  const dormant = findDormant({ storeId, dormantDays }).slice(0, max);
  const state = readState(storeId);
  const drafts = {}; // cache one message per segment to avoid N model calls
  const plan = [];

  for (const d of dormant) {
    const st = state[d.phone] || { phone: d.phone, attempts: 0, status: 'new' };
    if (st.attempts >= MAX_ATTEMPTS()) { st.status = 'exhausted'; state[d.phone] = st; continue; }

    if (!drafts[d.segment]) drafts[d.segment] = await craftMessage({ segment: d.segment, incentive: incentiveBySegment[d.segment] || '' });
    const msg = drafts[d.segment];

    const whenISO = whenFor(storeId, d.phone);
    st.attempts += 1; st.status = 'queued'; st.segment = d.segment; st.lastQueuedAt = Date.now(); st.lastWhen = whenISO;
    state[d.phone] = st;
    plan.push({ phone: d.phone, segment: d.segment, whenISO, text: msg.text, source: msg.source, attempt: st.attempts });
  }
  writeState(storeId, state);
  return { dormant: dormant.length, queued: plan.length, segments: segmentCounts(dormant), plan };
}

// ── Outcome tracking ──────────────────────────────────────────
function markWon({ storeId = 'default_store', phone } = {}) {
  const state = readState(storeId);
  if (!state[phone]) state[phone] = { phone, attempts: 0 };
  state[phone].status = 'won'; state[phone].wonAt = Date.now();
  writeState(storeId, state); return { ok: true, phone, status: 'won' };
}
function suppress({ storeId = 'default_store', phone } = {}) {
  const state = readState(storeId);
  if (!state[phone]) state[phone] = { phone, attempts: 0 };
  state[phone].status = 'suppressed'; state[phone].suppressedAt = Date.now();
  writeState(storeId, state); return { ok: true, phone, status: 'suppressed' };
}
function markSent({ storeId = 'default_store', phone } = {}) {
  const state = readState(storeId);
  if (state[phone]) { state[phone].status = 'sent'; state[phone].lastSentAt = Date.now(); writeState(storeId, state); }
  return { ok: Boolean(state[phone]) };
}
function listState({ storeId = 'default_store', status } = {}) {
  let list = Object.values(readState(storeId));
  if (status) list = list.filter(s => s.status === status);
  return list;
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), sendTimeWired: Boolean(sendTime && sendTime.nextSlot), dormantDays: DORMANT_DAYS(), maxAttempts: MAX_ATTEMPTS() };
}

module.exports = {
  findDormant, segmentOf, segmentCounts, craftMessage, launch,
  markWon, suppress, markSent, listState, health,
  _internal: { SEGMENTS, TEMPLATES, segmentOf }
};
