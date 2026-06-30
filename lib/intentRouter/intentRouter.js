// lib/intentRouter/intentRouter.js
// ────────────────────────────────────────────────────────────────────
// AI Intent Router + auto-tagging. Every inbound WhatsApp message is classified
// into an intent, tagged, and routed to the right queue/team with a priority —
// so sales leads, support tickets, billing questions and complaints don't all
// land in one undifferentiated inbox.
//
// Two tiers:
//   1. Deterministic keyword classifier — always on, instant, explainable.
//   2. AI classifier (optional) — for low-confidence cases, asks the AI Brain
//      Bridge (self-hosted Ollama) to pick from the known intent set.
//
// Routing rules (intent -> { queue, team, priority }) are configurable per store
// and file-backed. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[intentRouter] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.INTENT_ROUTER_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'intent_router');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const rulesFile = (storeId) => path.join(DATA_DIR, `${storeId}_rules.json`);

// ── Intent set + signals ─────────────────────────────────────────
const INTENTS = ['sales', 'support', 'billing', 'complaint', 'shipping', 'greeting', 'spam', 'other'];

const KEYWORDS = {
  sales:     ['buy', 'order', 'price', 'rate', 'cost', 'purchase', 'quote', 'kitne', 'kitna', 'kharid', 'chahiye', 'lena', 'demo', 'trial', 'plan'],
  support:   ['help', 'how', 'not working', 'issue', 'problem', 'error', 'broken', 'setup', 'install', 'kaise', 'masla', 'kaam nahi'],
  billing:   ['invoice', 'payment', 'paid', 'charge', 'charged', 'subscription', 'renew', 'receipt', 'bill', 'paise', 'paid kar'],
  complaint: ['refund', 'cancel', 'scam', 'fraud', 'complaint', 'angry', 'worst', 'cheat', 'bekar', 'ghatiya', 'dhoka', 'shikayat', 'wapas'],
  shipping:  ['delivery', 'deliver', 'track', 'tracking', 'shipped', 'shipment', 'courier', 'parcel', 'kab milega', 'pohanch'],
  greeting:  ['hi', 'hello', 'hey', 'salam', 'assalam', 'aoa', 'good morning', 'good evening']
};

const SPAM_SIGNALS = ['http://bit.ly', 'click here', 'you have won', 'congratulations you', 'free money', 'forex', 'crypto pump', 'sex', 'viagra'];

const DEFAULT_RULES = {
  routing: {
    sales:     { queue: 'sales',    team: 'sales',   priority: 'high' },
    support:   { queue: 'support',  team: 'support', priority: 'normal' },
    billing:   { queue: 'billing',  team: 'billing', priority: 'high' },
    complaint: { queue: 'escalations', team: 'lead', priority: 'urgent' },
    shipping:  { queue: 'support',  team: 'support', priority: 'normal' },
    greeting:  { queue: 'general',  team: 'bot',     priority: 'low' },
    spam:      { queue: 'spam',     team: 'none',    priority: 'low' },
    other:     { queue: 'general',  team: 'support', priority: 'normal' }
  },
  tagMap: {
    sales: ['lead'], support: ['support'], billing: ['billing'],
    complaint: ['at-risk', 'complaint'], shipping: ['order'], greeting: [], spam: ['spam'], other: []
  }
};

function readRules(storeId) {
  try { const f = rulesFile(storeId); if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8')); }
  catch { /* fall through */ }
  return JSON.parse(JSON.stringify(DEFAULT_RULES));
}
function setRules(storeId, updates = {}) {
  const cur = readRules(storeId);
  const merged = {
    routing: { ...cur.routing, ...(updates.routing || {}) },
    tagMap: { ...cur.tagMap, ...(updates.tagMap || {}) }
  };
  fs.writeFileSync(rulesFile(storeId), JSON.stringify(merged, null, 2));
  return merged;
}

// ── Deterministic classifier ──────────────────────────────────────
function classifyKeyword(text = '') {
  const t = String(text).toLowerCase();
  if (SPAM_SIGNALS.some(s => t.includes(s))) return { intent: 'spam', confidence: 0.9, scores: { spam: 1 } };

  const scores = {};
  for (const intent of Object.keys(KEYWORDS)) {
    scores[intent] = KEYWORDS[intent].reduce((n, w) => n + (t.includes(w) ? 1 : 0), 0);
  }
  // greeting only wins if the message is short and nothing else matched
  const nonGreet = Object.entries(scores).filter(([k]) => k !== 'greeting').reduce((a, [, v]) => a + v, 0);
  if (scores.greeting && nonGreet === 0 && t.length <= 40) return { intent: 'greeting', confidence: 0.7, scores };

  let best = 'other', bestScore = 0;
  for (const [intent, sc] of Object.entries(scores)) {
    if (intent === 'greeting') continue;
    if (sc > bestScore) { best = intent; bestScore = sc; }
  }
  if (bestScore === 0) return { intent: 'other', confidence: 0.3, scores };
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  return { intent: best, confidence: Math.min(0.95, 0.5 + bestScore / total * 0.5), scores };
}

async function classifyAI(text) {
  if (!processPrompt) return null;
  const prompt = [
    'Classify this WhatsApp customer message into exactly ONE intent from this list:',
    INTENTS.join(', ') + '.',
    'Reply with ONLY the single intent word, nothing else.',
    '',
    `Message: "${text}"`
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    const word = String(raw).toLowerCase().match(/[a-z]+/);
    if (word && INTENTS.includes(word[0])) return word[0];
    return null;
  } catch (err) { console.warn('[intentRouter] AI classify failed:', err.message); return null; }
}

/**
 * Classify a message. Uses the keyword classifier; if confidence is below
 * `aiThreshold` and a model is available, asks the AI to decide.
 * @returns {Promise<{ intent, confidence, method, scores }>}
 */
async function classify(text, { useAI = true, aiThreshold = 0.55 } = {}) {
  const kw = classifyKeyword(text);
  if (!useAI || kw.confidence >= aiThreshold || !processPrompt) {
    return { ...kw, method: 'keyword' };
  }
  const ai = await classifyAI(text);
  if (ai) return { intent: ai, confidence: 0.8, method: 'ai', scores: kw.scores };
  return { ...kw, method: 'keyword' };
}

/**
 * Full route: classify, then map to tags + queue/team/priority via store rules.
 * @returns {Promise<{ intent, confidence, method, tags, routing }>}
 */
async function route({ storeId = 'default_store', text, useAI = true } = {}) {
  if (!text || !String(text).trim()) throw new Error('text is required');
  const rules = readRules(storeId);
  const c = await classify(text, { useAI });
  const routing = rules.routing[c.intent] || rules.routing.other;
  const tags = rules.tagMap[c.intent] || [];
  return { intent: c.intent, confidence: c.confidence, method: c.method, tags, routing };
}

function getRules(storeId = 'default_store') { return readRules(storeId); }

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), intents: INTENTS };
}

module.exports = {
  classify, route, getRules, setRules, health,
  _internal: { classifyKeyword, INTENTS, KEYWORDS, DEFAULT_RULES }
};
