// lib/customer360/customer360.js
// ────────────────────────────────────────────────────────────────────
// AI Customer 360. The suite scatters what it knows about a person across many
// stores: lead score, chat history, orders, voice notes, win-back state,
// reviews, bookings. When an agent opens a chat they shouldn\'t hunt 7 files.
// This merges everything for a phone number into ONE unified profile, then the
// AI Brain Bridge (self-hosted Ollama) writes a one-glance summary + the
// suggested next move.
//
// Profile assembly is deterministic and read-only (no store is mutated); the
// model only narrates the assembled facts. Works with no model (returns the
// structured profile + a templated summary). Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[customer360] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.CUSTOMER360_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const DATA_ROOT = path.join(__dirname, '..', '..', 'data');

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }

// ── Source readers (each optional; missing store = empty) ─────────────────
function leadInfo(storeId, phone) {
  const l = readJSON(path.join(DATA_ROOT, 'lead_intel', `${storeId}_scores.json`), {})[phone];
  if (!l) return null;
  return { score: l.score, band: l.band, atRisk: l.atRisk, nextBestAction: l.nextBestAction || null, summary: l.summary || null, signals: l.signals || null };
}
function convoInfo(storeId, phone) {
  const t = readJSON(path.join(DATA_ROOT, 'support_agent', `${storeId}_conversations.json`), {})[phone];
  if (!t) return null;
  const hist = t.history || [];
  const last = hist.length ? hist[hist.length - 1] : null;
  return { messages: hist.length, escalated: Boolean(t.escalatedAt), muted: Boolean(t.muted), lastIntent: t.lastIntent || null, lastMessage: last ? last.content : null, lastTs: last ? last.ts : null, customerName: t.customerName || null };
}
function orderInfo(storeId, phone) {
  const d = readJSON(path.join(DATA_ROOT, 'orders_draft', `${storeId}_drafts.json`), {})[phone];
  if (!d) return null;
  return { status: d.status, items: (d.order && d.order.items) ? d.order.items.map(i => ({ name: i.canonicalName || i.name, qty: i.qty })) : [], total: d.total || null, ts: d.ts };
}
function voiceInfo(storeId, phone) {
  const jobs = readJSON(path.join(DATA_ROOT, 'voice_notes', '_jobs.json'), []).filter(j => j.storeId === storeId && j.phone === phone);
  return jobs.length ? { count: jobs.length, lastTranscript: jobs[jobs.length - 1].transcript || null } : null;
}
function winbackInfo(storeId, phone) {
  const w = readJSON(path.join(DATA_ROOT, 'winback', `${storeId}_state.json`), {})[phone];
  return w ? { status: w.status, attempts: w.attempts, segment: w.segment || null } : null;
}
function reviewInfo(storeId, phone) {
  const r = readJSON(path.join(DATA_ROOT, 'reviews', `${storeId}_reviews.json`), {})[phone];
  return r ? { verdict: r.verdict || null, rating: r.rating != null ? r.rating : null, status: r.status } : null;
}
function bookingInfo(storeId, phone) {
  const list = readJSON(path.join(DATA_ROOT, 'bookings', `${storeId}_bookings.json`), []).filter(b => b.phone === phone);
  if (!list.length) return null;
  const upcoming = list.filter(b => b.status === 'confirmed' && b.ts > Date.now()).sort((a, b) => a.ts - b.ts)[0];
  return { total: list.length, upcoming: upcoming ? { label: upcoming.label, ts: upcoming.ts } : null };
}

/**
 * Assemble the unified profile for a phone (deterministic, read-only).
 */
function buildProfile({ storeId = 'default_store', phone } = {}) {
  if (!phone) throw new Error('phone is required');
  const lead = leadInfo(storeId, phone);
  const conversation = convoInfo(storeId, phone);
  const order = orderInfo(storeId, phone);
  const voice = voiceInfo(storeId, phone);
  const winback = winbackInfo(storeId, phone);
  const review = reviewInfo(storeId, phone);
  const booking = bookingInfo(storeId, phone);

  // quick \"highlights\" the inbox can show as chips
  const highlights = [];
  if (lead) highlights.push(`${lead.band || 'lead'}${lead.score != null ? ` (${lead.score})` : ''}`);
  if (lead && lead.atRisk) highlights.push('at-risk');
  if (conversation && conversation.escalated) highlights.push('escalated');
  if (order) highlights.push(`order: ${order.status}`);
  if (booking && booking.upcoming) highlights.push('upcoming booking');
  if (review && review.rating != null) highlights.push(`${review.rating}\u2b50`);
  if (winback && winback.status) highlights.push(`winback: ${winback.status}`);

  const known = Boolean(lead || conversation || order || voice || winback || review || booking);
  return {
    phone, storeId, known,
    name: (conversation && conversation.customerName) || null,
    highlights,
    lead, conversation, order, voice, winback, review, booking,
    assembledAt: Date.now()
  };
}

function templateSummary(p) {
  if (!p.known) return 'No history on record for this contact yet.';
  const bits = [];
  if (p.lead) bits.push(`${p.lead.band || 'lead'}${p.lead.score != null ? ` (score ${p.lead.score})` : ''}${p.lead.atRisk ? ', at-risk' : ''}`);
  if (p.conversation) bits.push(`${p.conversation.messages} msgs${p.conversation.escalated ? ', escalated' : ''}${p.conversation.lastIntent ? `, last intent ${p.conversation.lastIntent}` : ''}`);
  if (p.order) bits.push(`order ${p.order.status}${p.order.total ? ` (${p.order.total})` : ''}`);
  if (p.booking && p.booking.upcoming) bits.push(`booking ${p.booking.upcoming.label}`);
  if (p.review && p.review.rating != null) bits.push(`rated ${p.review.rating}/5`);
  const next = p.lead && p.lead.nextBestAction ? ` NEXT: ${p.lead.nextBestAction}` : '';
  return `${p.name || p.phone}: ${bits.join('; ')}.${next}`;
}

async function aiSummary(p) {
  if (!processPrompt) return null;
  const prompt = [
    'You are a CRM assistant. In 2-3 lines, summarize this customer for an agent about to chat with them, then give the single best next move.',
    'Use ONLY the data below; do not invent anything.',
    JSON.stringify({
      name: p.name, lead: p.lead, conversation: p.conversation, order: p.order,
      voice: p.voice, winback: p.winback, review: p.review, booking: p.booking
    }),
    '',
    'End with a line "NEXT: <one concrete action>".'
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    return String(raw).trim();
  } catch (err) { console.warn('[customer360] summary failed:', err.message); return null; }
}

/**
 * Full profile + summary.
 * @returns {Promise<{ profile, summary, source }>}
 */
async function profile({ storeId = 'default_store', phone, withSummary = true } = {}) {
  const p = buildProfile({ storeId, phone });
  let summary = null, source = 'none';
  if (withSummary) {
    summary = await aiSummary(p);
    if (summary) source = 'ollama';
    else { summary = templateSummary(p); source = 'fallback'; }
  }
  return { profile: p, summary, source };
}

/**
 * Lightweight cross-store search: return phones that have any record, optionally
 * filtered by a band or at-risk, for an inbox sidebar. Reads lead-intel as the
 * spine (it has the widest coverage).
 */
function search({ storeId = 'default_store', band, atRisk, limit = 50 } = {}) {
  const leads = readJSON(path.join(DATA_ROOT, 'lead_intel', `${storeId}_scores.json`), {});
  let rows = Object.keys(leads).map(phone => ({ phone, band: leads[phone].band, score: leads[phone].score || 0, atRisk: Boolean(leads[phone].atRisk) }));
  if (band) rows = rows.filter(r => r.band === band);
  if (atRisk === true) rows = rows.filter(r => r.atRisk);
  rows.sort((a, b) => (b.score || 0) - (a.score || 0));
  return rows.slice(0, limit);
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), sources: ['lead_intel', 'support_agent', 'orders_draft', 'voice_notes', 'winback', 'reviews', 'bookings'] };
}

module.exports = { profile, buildProfile, search, health, _internal: { templateSummary } };
