'use strict';
/**
 * autoTagger.js — AI Feature #2: auto-tag conversations by intent + sentiment.
 *
 * Every inbound message carries a clue: is this a sales lead, a support issue, a complaint, a
 * pricing question? This classifies the message (intent + sentiment) so it can route correctly,
 * auto-tag the contact (feeding segments #marketing1), and flag angry customers for fast handling.
 *
 * Ollama-first via the app's AI brain (zero cost, on-prem); if AI is unavailable a keyword
 * classifier kicks in so tagging never blocks the pipeline. Tag application is injected.
 */

let aiBrain = null;
try { aiBrain = require('../../ai/aiBrain'); } catch { aiBrain = null; }

let aiCall = null;       // async (prompt) => string
let applyTags = null;    // (phone, tags[]) => void
function setAiCall(fn) { aiCall = typeof fn === 'function' ? fn : null; }
function setApplyTags(fn) { applyTags = typeof fn === 'function' ? fn : null; }

const INTENTS = ['sales', 'support', 'complaint', 'pricing', 'order_status', 'feedback', 'spam', 'other'];
const SENTIMENTS = ['positive', 'neutral', 'negative'];

// Keyword fallback classifier (used when AI is down).
const INTENT_KEYWORDS = {
  pricing: ['price', 'cost', 'how much', 'kitne', 'qeemat', 'rate'],
  order_status: ['order', 'tracking', 'delivery', 'kahan', 'shipped', 'parcel'],
  complaint: ['complaint', 'refund', 'broken', 'worst', 'kharab', 'bekar', 'angry', 'cheated'],
  support: ['help', 'support', 'issue', 'problem', 'not working', 'masla'],
  sales: ['buy', 'order kar', 'interested', 'want to', 'chahiye', 'lena hai'],
  feedback: ['thanks', 'great', 'good service', 'shukriya', 'acha']
};
const NEG_WORDS = ['worst', 'angry', 'refund', 'broken', 'kharab', 'bekar', 'cheated', 'terrible', 'bad'];
const POS_WORDS = ['thanks', 'great', 'love', 'good', 'excellent', 'shukriya', 'acha', 'best'];

function keywordClassify(text) {
  const t = String(text || '').toLowerCase();
  let intent = 'other';
  for (const [k, words] of Object.entries(INTENT_KEYWORDS)) {
    if (words.some(w => t.includes(w))) { intent = k; break; }
  }
  let sentiment = 'neutral';
  if (NEG_WORDS.some(w => t.includes(w))) sentiment = 'negative';
  else if (POS_WORDS.some(w => t.includes(w))) sentiment = 'positive';
  return { intent, sentiment, source: 'keywords' };
}

async function runAi(prompt) {
  if (aiCall) return aiCall(prompt);
  if (aiBrain && typeof aiBrain.processPrompt === 'function') return aiBrain.processPrompt(prompt);
  throw new Error('no AI');
}

function parseAi(out) {
  // expect JSON-ish {"intent":"...","sentiment":"..."}; be lenient
  try {
    const m = String(out).match(/\{[\s\S]*\}/);
    if (m) {
      const o = JSON.parse(m[0]);
      const intent = INTENTS.includes(o.intent) ? o.intent : 'other';
      const sentiment = SENTIMENTS.includes(o.sentiment) ? o.sentiment : 'neutral';
      return { intent, sentiment, source: 'ai' };
    }
  } catch { /* fall through */ }
  return null;
}

/**
 * Classify a message. Returns { intent, sentiment, source }. Never throws.
 */
async function classify(text) {
  const prompt = [
    'Classify this WhatsApp customer message. Reply ONLY JSON:',
    '{"intent":"sales|support|complaint|pricing|order_status|feedback|spam|other","sentiment":"positive|neutral|negative"}',
    '',
    `Message: "${String(text || '').slice(0, 500)}"`
  ].join('\n');
  try {
    const out = await runAi(prompt);
    return parseAi(out) || keywordClassify(text);
  } catch {
    return keywordClassify(text);
  }
}

/**
 * Classify + apply tags to a contact. Returns the classification.
 * Tags applied: intent + (negative sentiment -> 'unhappy').
 */
async function tagMessage(phone, text) {
  const c = await classify(text);
  const tags = [c.intent];
  if (c.sentiment === 'negative') tags.push('unhappy');
  if (c.sentiment === 'positive') tags.push('happy');
  if (applyTags && phone) { try { applyTags(phone, tags); } catch { /* ignore */ } }
  return { ...c, tags };
}

module.exports = { INTENTS, SENTIMENTS, setAiCall, setApplyTags, classify, tagMessage };
