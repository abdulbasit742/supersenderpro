// lib/reviews/reviewCollector.js
// ────────────────────────────────────────────────────────────────────
// AI Review & Feedback Collector. After an order completes, the right follow-up
// turns a happy customer into a public review and an unhappy one into a saved
// relationship — if you route them correctly. This:
//   1. schedules a post-purchase review request (timed via send-time #21),
//   2. reads the reply\'s sentiment + any star rating,
//   3. ROUTES: happy -> nudge to a public review link; unhappy -> private
//      human escalation (so complaints are fixed, not posted publicly),
//   4. extracts a clean testimonial from positive replies (AI Brain Bridge).
//
// Deterministic sentiment + rating parsing means it works with no model; the
// model only polishes testimonials + the ask copy. File-backed. Zero new deps.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[reviews] aiBrain unavailable:', e.message); processPrompt = null; }

let sendTime = null;
try { sendTime = require('../sendTime/sendTimeOptimizer'); } catch { /* optional */ }

const MODEL = () => process.env.REVIEW_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';
const REVIEW_LINK = () => process.env.REVIEW_LINK || '';
const ASK_DELAY_HOURS = () => parseFloat(process.env.REVIEW_ASK_DELAY_HOURS || '24');
const HAPPY_THRESHOLD = () => parseInt(process.env.REVIEW_HAPPY_THRESHOLD || '4', 10); // >=4 stars = happy

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'reviews');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const stateFile = (storeId) => path.join(DATA_DIR, `${storeId}_reviews.json`);
const testimonialFile = (storeId) => path.join(DATA_DIR, `${storeId}_testimonials.json`);

function readJSON(p, fb) { try { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : fb; } catch { return fb; } }
function writeJSON(p, d) { try { fs.writeFileSync(p, JSON.stringify(d, null, 2)); } catch (e) { console.error('[reviews] write failed:', e.message); } }

// ── Sentiment + rating parsing (deterministic) ────────────────────────
const POS = ['great', 'good', 'excellent', 'amazing', 'love', 'loved', 'perfect', 'best', 'happy', 'satisfied', 'recommend', 'fast', 'thanks', 'shukria', 'zabardast', 'acha', 'achha', 'badhiya', 'mashallah'];
const NEG = ['bad', 'worst', 'terrible', 'late', 'broken', 'defective', 'scam', 'refund', 'angry', 'disappointed', 'poor', 'slow', 'bekar', 'ghatiya', 'kharab', 'bura', 'dhoka'];

function parseRating(text = '') {
  const t = String(text);
  // "5 stars", "5/5", "rate 4", or bare 1-5 with star emoji
  const m = t.match(/\b([1-5])\s*(?:\/\s*5|stars?|\u2b50)/i) || t.match(/(\u2b50{1,5})/);
  if (m) {
    if (m[1] && /^\d$/.test(m[1])) return parseInt(m[1], 10);
    if (m[1] && /\u2b50/.test(m[1])) return m[1].length;
  }
  const bare = t.match(/^\s*([1-5])\s*$/);
  return bare ? parseInt(bare[1], 10) : null;
}

function sentimentOf(text = '') {
  const t = String(text).toLowerCase();
  const pos = POS.filter(w => t.includes(w)).length;
  const neg = NEG.filter(w => t.includes(w)).length;
  if (neg > pos) return 'negative';
  if (pos > neg) return 'positive';
  return 'neutral';
}

/** Combine rating + sentiment into happy/unhappy/neutral. */
function classify(text) {
  const rating = parseRating(text);
  const sentiment = sentimentOf(text);
  let verdict;
  if (rating != null) verdict = rating >= HAPPY_THRESHOLD() ? 'happy' : (rating <= 2 ? 'unhappy' : 'neutral');
  else verdict = sentiment === 'positive' ? 'happy' : sentiment === 'negative' ? 'unhappy' : 'neutral';
  return { rating, sentiment, verdict };
}

// ── Ask copy + testimonial extraction ───────────────────────────────
function askTemplate() {
  return 'Hi {{name}}! \ud83d\ude4f How was your experience with us? Reply with a rating 1-5 (or a few words). It really helps!';
}
function happyTemplate() {
  const link = REVIEW_LINK();
  return link
    ? `So glad you\'re happy, {{name}}! \ud83d\ude4c Would you mind leaving a quick public review here? ${link} \ud83d\ude4f`
    : 'So glad you\'re happy, {{name}}! \ud83d\ude4c Would you mind sharing a quick public review? It means a lot \ud83d\ude4f';
}
function unhappyTemplate() {
  return 'I\'m really sorry it wasn\'t perfect, {{name}}. I\'ve flagged this to our team and we\'ll make it right — someone will reach out personally. \ud83d\ude4f';
}

async function extractTestimonial(text) {
  if (!processPrompt) {
    const clean = String(text).replace(/\s+/g, ' ').trim();
    return { quote: clean.length <= 160 ? clean : clean.slice(0, 157) + '...', source: 'fallback' };
  }
  const prompt = [
    'Turn this happy customer reply into a SHORT, clean testimonial quote (max 25 words).',
    'Keep their voice, fix grammar lightly, no quotation marks, no emojis. Return ONLY the quote.',
    '',
    `Customer reply: "${text}"`
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) {
      const clean = String(text).replace(/\s+/g, ' ').trim();
      return { quote: clean.slice(0, 160), source: 'fallback' };
    }
    return { quote: String(raw).trim().replace(/^"|"$/g, ''), source: 'ollama' };
  } catch { return { quote: String(text).slice(0, 160), source: 'fallback' }; }
}

// ── Public API ──────────────────────────────────────────────────
/**
 * Schedule a post-purchase review request for a contact. Returns the ask message
 * + when to send it (send-time aware). Records state 'asked'.
 */
function requestReview({ storeId = 'default_store', phone, orderId, delayHours = ASK_DELAY_HOURS() } = {}) {
  if (!phone) throw new Error('phone is required');
  const base = Date.now() + delayHours * 3600 * 1000;
  let whenISO = new Date(base).toISOString();
  if (sendTime && typeof sendTime.nextSlot === 'function') {
    try { whenISO = sendTime.nextSlot({ storeId, phone, from: base }).whenISO; } catch { /* keep base */ }
  }
  const state = readState(storeId);
  state[phone] = { phone, orderId: orderId || null, status: 'asked', askedAt: Date.now(), whenISO };
  writeState(storeId, state);
  return { phone, whenISO, message: askTemplate() };
}

function readState(storeId) { return readJSON(stateFile(storeId), {}); }
function writeState(storeId, d) { writeJSON(stateFile(storeId), d); }

/**
 * Ingest a customer\'s reply to a review request. Classifies, routes, and (if
 * happy) extracts + stores a testimonial.
 * @returns {Promise<{ verdict, rating, sentiment, action, reply, testimonial? }>}
 */
async function ingestReply({ storeId = 'default_store', phone, text } = {}) {
  if (!phone || !text) throw new Error('phone and text are required');
  const c = classify(text);
  const state = readState(storeId);
  const rec = state[phone] || { phone, status: 'asked' };
  rec.rating = c.rating; rec.sentiment = c.sentiment; rec.verdict = c.verdict; rec.repliedAt = Date.now(); rec.replyText = text;

  let action, reply, testimonial = null;
  if (c.verdict === 'happy') {
    action = 'route_to_public_review';
    reply = happyTemplate();
    const t = await extractTestimonial(text);
    testimonial = { phone, quote: t.quote, rating: c.rating, source: t.source, ts: Date.now() };
    const tlist = readJSON(testimonialFile(storeId), []);
    tlist.push(testimonial);
    writeJSON(testimonialFile(storeId), tlist);
    rec.status = 'happy_routed';
  } else if (c.verdict === 'unhappy') {
    action = 'escalate_private';
    reply = unhappyTemplate();
    rec.status = 'unhappy_escalated';
    rec.escalate = true;
  } else {
    action = 'thank';
    reply = 'Thanks for the feedback, {{name}}! \ud83d\ude4f';
    rec.status = 'neutral';
  }
  state[phone] = rec; writeState(storeId, state);
  return { verdict: c.verdict, rating: c.rating, sentiment: c.sentiment, action, reply, shouldEscalate: c.verdict === 'unhappy', testimonial };
}

function listTestimonials({ storeId = 'default_store', minRating, limit = 100 } = {}) {
  let list = readJSON(testimonialFile(storeId), []).slice().reverse();
  if (minRating != null) list = list.filter(t => (t.rating || 0) >= minRating);
  return list.slice(0, limit);
}

function stats({ storeId = 'default_store' } = {}) {
  const recs = Object.values(readState(storeId));
  const replied = recs.filter(r => r.repliedAt);
  const happy = recs.filter(r => r.verdict === 'happy').length;
  const unhappy = recs.filter(r => r.verdict === 'unhappy').length;
  const ratings = replied.map(r => r.rating).filter(n => typeof n === 'number');
  const avg = ratings.length ? +(ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(2) : null;
  return {
    asked: recs.length, replied: replied.length,
    responseRate: recs.length ? +(replied.length / recs.length).toFixed(3) : null,
    happy, unhappy, neutral: replied.length - happy - unhappy,
    avgRating: avg, testimonials: readJSON(testimonialFile(storeId), []).length
  };
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), reviewLinkSet: Boolean(REVIEW_LINK()), sendTimeWired: Boolean(sendTime && sendTime.nextSlot), happyThreshold: HAPPY_THRESHOLD() };
}

module.exports = {
  requestReview, ingestReply, listTestimonials, stats, health,
  _internal: { classify, parseRating, sentimentOf, extractTestimonial }
};
