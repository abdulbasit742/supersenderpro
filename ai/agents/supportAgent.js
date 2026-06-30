// ai/agents/supportAgent.js
// ────────────────────────────────────────────────────────────────────
// 24/7 Conversational Support Agent (self-hosted-AI first)
//
// A WhatsApp-facing support agent that answers questions, takes orders, and
// escalates to a human when needed. All AI generation is routed through the
// existing AI Brain Bridge (ai/aiBrain.js -> processPrompt), so it uses the
// self-hosted Ollama model by default (set ai_provider=ollama in settings.json
// or AI_PROVIDER=ollama, OLLAMA_HOST=http://127.0.0.1:11434).
//
// Design goals:
//   - Zero new npm dependencies (uses Node built-ins + existing modules only).
//   - File-backed per-store knowledge base + conversation memory (data/).
//   - Deterministic guardrails around a non-deterministic small model:
//       * intent + sentiment heuristics
//       * control-tag parsing ([ORDER ...] / [ESCALATE ...])
//       * graceful fallback if the model/provider is unavailable.
//   - Returns a structured result the WhatsApp layer can act on.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');

let processPrompt;
try {
  ({ processPrompt } = require('../aiBrain'));
} catch (err) {
  console.warn('[supportAgent] aiBrain not available, running in fallback-only mode:', err.message);
  processPrompt = null;
}

// ── Storage ────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'support_agent');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const kbFile = (storeId) => path.join(DATA_DIR, `${storeId}_kb.json`);
const convoFile = (storeId) => path.join(DATA_DIR, `${storeId}_conversations.json`);

function readJSON(file, fallback) {
  try {
    if (!fs.existsSync(file)) { fs.writeFileSync(file, JSON.stringify(fallback, null, 2)); return fallback; }
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { return fallback; }
}
function writeJSON(file, data) {
  try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); } catch (e) {
    console.error('[supportAgent] write failed:', file, e.message);
  }
}

// ── Default knowledge base ─────────────────────────────────────────────
const DEFAULT_KB = {
  businessName: 'SuperSender Pro',
  tone: 'friendly, concise, professional',
  about: 'We sell digital tools, software access and premium subscriptions, delivered instantly over WhatsApp.',
  currency: 'PKR',
  faqs: [
    { q: 'What are your delivery times?', a: 'Digital products are delivered instantly after payment confirmation, usually within a few minutes.' },
    { q: 'What payment methods do you accept?', a: 'We accept bank transfer, JazzCash, Easypaisa and card payments.' },
    { q: 'Do you offer refunds?', a: 'Refunds are available within 24 hours if the product was not delivered or is not working.' },
    { q: 'Are the tools genuine?', a: 'Yes, all tools and subscriptions are genuine and come with support.' }
  ],
  products: [
    // { id, name, price, description, inStock }
  ],
  policies: 'Be honest about stock and delivery. Never promise something we do not offer. Never invent prices that are not in the catalog.',
  escalationKeywords: [
    'human', 'agent', 'representative', 'real person', 'talk to someone', 'speak to someone',
    'manager', 'complaint', 'refund', 'chargeback', 'legal', 'fraud', 'scam',
    'insaan', 'baat karao', 'banda', 'shikayat', 'paise wapas', 'refund chahiye'
  ],
  fallbackReply: 'Thanks for your message! Let me connect you with our team who will help you shortly. 🙏',
  confidenceFloor: 0.45
};

function getKnowledgeBase(storeId = 'default_store') {
  return readJSON(kbFile(storeId), { ...DEFAULT_KB });
}
function setKnowledgeBase(storeId = 'default_store', updates = {}) {
  const kb = getKnowledgeBase(storeId);
  const merged = { ...kb, ...updates };
  writeJSON(kbFile(storeId), merged);
  return merged;
}

// ── Conversation memory ────────────────────────────────────────────
const MAX_TURNS = 12;

function loadConversations(storeId) { return readJSON(convoFile(storeId), {}); }
function getThread(storeId, phone) {
  const all = loadConversations(storeId);
  return all[phone] || { history: [], muted: false, lastIntent: null, escalatedAt: null };
}
function saveThread(storeId, phone, thread) {
  const all = loadConversations(storeId);
  all[phone] = thread;
  writeJSON(convoFile(storeId), all);
}
function pushTurn(thread, role, content) {
  thread.history.push({ role, content, ts: Date.now() });
  if (thread.history.length > MAX_TURNS) thread.history = thread.history.slice(-MAX_TURNS);
  return thread;
}

// ── Lightweight language + intent + sentiment heuristics ───────────────────
function detectLanguage(text = '') {
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';
  if (/[\u0900-\u097F]/.test(text)) return 'hi';
  const roman = /\b(hai|nahi|kya|kaise|kitne|chahiye|krna|karna|acha|theek|bhai|salam|assalam)\b/i;
  if (roman.test(text)) return 'roman-ur';
  return 'en';
}

const NEGATIVE_WORDS = [
  'angry', 'terrible', 'worst', 'useless', 'scam', 'fraud', 'cheat', 'horrible', 'disgusting',
  'pathetic', 'never again', 'waste', 'rip off', 'ripoff',
  'bekar', 'ghatiya', 'bakwaas', 'bakwas', 'dhoka', 'faltu', 'bura'
];

function detectSentiment(text = '') {
  const t = text.toLowerCase();
  const hits = NEGATIVE_WORDS.filter(w => t.includes(w)).length;
  return hits >= 1 ? 'negative' : 'neutral';
}

function detectIntent(text = '', kb) {
  const t = text.toLowerCase();
  const esc = (kb.escalationKeywords || []).some(k => t.includes(k.toLowerCase()));
  if (esc) return 'escalate';
  if (/\b(order|buy|purchase|checkout|kharid|lena hai|chahiye|book|price|rate|kitne|kitna)\b/i.test(text)) return 'order';
  if (/\b(hi|hello|hey|salam|assalam|salaam|aoa|good morning|good evening)\b/i.test(text)) return 'greeting';
  return 'question';
}

// ── Prompt builder ───────────────────────────────────────────────
function buildPrompt(kb, thread, message, language) {
  const faqBlock = (kb.faqs || []).map((f, i) => `${i + 1}. Q: ${f.q}\n   A: ${f.a}`).join('\n');
  const productBlock = (kb.products || []).length
    ? (kb.products || []).map(p => `- ${p.name}${p.price != null ? ` — ${kb.currency || ''} ${p.price}` : ''}${p.inStock === false ? ' (OUT OF STOCK)' : ''}${p.description ? `: ${p.description}` : ''}`).join('\n')
    : '(No catalog provided. Do not invent products or prices.)';
  const historyBlock = (thread.history || []).slice(-MAX_TURNS)
    .map(h => `${h.role === 'user' ? 'Customer' : 'Agent'}: ${h.content}`).join('\n') || '(no prior messages)';

  const langInstruction = {
    'ur': 'Reply in Urdu.',
    'hi': 'Reply in Hindi.',
    'roman-ur': 'Reply in Roman Urdu (Hindi/Urdu written in English letters), casual and friendly.',
    'en': 'Reply in English.'
  }[language] || 'Reply in the same language the customer used.';

  return [
    `You are the customer support agent for "${kb.businessName}". Tone: ${kb.tone || 'friendly and concise'}.`,
    `About the business: ${kb.about || ''}`,
    kb.policies ? `Policies you must follow: ${kb.policies}` : '',
    '',
    'KNOWLEDGE BASE (FAQs):',
    faqBlock || '(none)',
    '',
    'PRODUCT CATALOG:',
    productBlock,
    '',
    'CONVERSATION SO FAR:',
    historyBlock,
    '',
    `New customer message: "${message}"`,
    '',
    'INSTRUCTIONS:',
    `- ${langInstruction}`,
    '- Keep replies short (1-3 sentences), warm and helpful. This is WhatsApp.',
    '- Only use facts from the knowledge base and catalog above. If you do not know, say so.',
    '- If the customer wants to place or confirm an order, add a final line exactly like: [ORDER] product=<product name>; qty=<number>',
    '- If you cannot help, the customer is upset, asks for a human, or wants a refund/complaint, add a final line exactly like: [ESCALATE] <short reason>',
    '- Never put the control lines anywhere except the very end. Write your normal reply first.',
    '',
    'Your reply:'
  ].filter(Boolean).join('\n');
}

// ── Control-tag parsing ───────────────────────────────────────────
function parseControlTags(raw) {
  let reply = raw || '';
  let order = null;
  let escalate = null;

  const orderMatch = reply.match(/\[ORDER\]\s*([^\n\[]+)/i);
  if (orderMatch) {
    const body = orderMatch[1];
    const prod = (body.match(/product\s*=\s*([^;]+)/i) || [])[1];
    const qty = (body.match(/qty\s*=\s*(\d+)/i) || [])[1];
    order = { product: prod ? prod.trim() : null, qty: qty ? parseInt(qty, 10) : 1 };
  }

  const escMatch = reply.match(/\[ESCALATE\]\s*([^\n\[]*)/i);
  if (escMatch) escalate = (escMatch[1] || 'Agent requested').trim() || 'Agent requested';

  reply = reply.replace(/\[ORDER\][^\n\[]*/ig, '').replace(/\[ESCALATE\][^\n\[]*/ig, '').trim();

  return { reply, order, escalate };
}

// ── Main entry point ────────────────────────────────────────────
/**
 * Handle one inbound customer message.
 * @returns {Promise<{reply, intent, sentiment, language, shouldEscalate, escalationReason, order, model, source}>}
 */
async function handleMessage({ storeId = 'default_store', phone, message, customerName } = {}) {
  if (!phone || !message) {
    throw new Error('phone and message are required');
  }

  const kb = getKnowledgeBase(storeId);
  const thread = getThread(storeId, phone);
  if (customerName) thread.customerName = customerName;

  const language = detectLanguage(message);
  const sentiment = detectSentiment(message);
  const intent = detectIntent(message, kb);

  pushTurn(thread, 'user', message);

  const hardEscalate = intent === 'escalate' || sentiment === 'negative';

  let result;
  const model = process.env.SUPPORT_AGENT_MODEL || kb.model || 'qwen2.5:32b';

  if (!processPrompt) {
    result = {
      reply: kb.fallbackReply || DEFAULT_KB.fallbackReply,
      order: null,
      escalate: 'AI engine unavailable',
      source: 'fallback'
    };
  } else {
    try {
      const prompt = buildPrompt(kb, thread, message, language);
      const raw = await processPrompt(prompt, { model, languageCode: language });
      const looksUnconfigured = typeof raw === 'string' && /\[AI Assist\]|Connect your .* in the environment/i.test(raw);
      if (!raw || looksUnconfigured) {
        result = { reply: kb.fallbackReply || DEFAULT_KB.fallbackReply, order: null, escalate: 'AI engine not configured', source: 'fallback' };
      } else {
        const parsed = parseControlTags(raw);
        result = { ...parsed, source: 'ollama' };
      }
    } catch (err) {
      console.error('[supportAgent] generation failed:', err.message);
      result = { reply: kb.fallbackReply || DEFAULT_KB.fallbackReply, order: null, escalate: 'AI generation error', source: 'fallback' };
    }
  }

  const shouldEscalate = Boolean(hardEscalate || result.escalate || result.source === 'fallback');
  const escalationReason = hardEscalate
    ? (intent === 'escalate' ? 'Customer requested a human / sensitive topic' : 'Negative sentiment detected')
    : (result.escalate || null);

  if (!result.reply || !result.reply.trim()) {
    result.reply = kb.fallbackReply || DEFAULT_KB.fallbackReply;
  }

  pushTurn(thread, 'agent', result.reply);
  thread.lastIntent = intent;
  if (shouldEscalate) { thread.escalatedAt = Date.now(); thread.muted = true; }
  saveThread(storeId, phone, thread);

  return {
    reply: result.reply,
    intent,
    sentiment,
    language,
    shouldEscalate,
    escalationReason,
    order: result.order || null,
    model,
    source: result.source
  };
}

// ── Helpers exposed for routes / dashboards ────────────────────────────
function getConversation(storeId = 'default_store', phone) {
  return getThread(storeId, phone);
}
function resetConversation(storeId = 'default_store', phone) {
  const all = loadConversations(storeId);
  delete all[phone];
  writeJSON(convoFile(storeId), all);
  return { reset: true, phone };
}
function setMuted(storeId = 'default_store', phone, muted) {
  const thread = getThread(storeId, phone);
  thread.muted = Boolean(muted);
  saveThread(storeId, phone, thread);
  return thread;
}

async function health(storeId = 'default_store') {
  const kb = getKnowledgeBase(storeId);
  const host = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
  const model = process.env.SUPPORT_AGENT_MODEL || kb.model || 'qwen2.5:32b';
  let ollamaReachable = false;
  try {
    const r = await fetch(`${host}/api/tags`, { method: 'GET' });
    ollamaReachable = r.ok;
  } catch { ollamaReachable = false; }
  return {
    ok: true,
    brainBridge: Boolean(processPrompt),
    ollamaHost: host,
    ollamaReachable,
    model,
    faqs: (kb.faqs || []).length,
    products: (kb.products || []).length
  };
}

module.exports = {
  handleMessage,
  getKnowledgeBase,
  setKnowledgeBase,
  getConversation,
  resetConversation,
  setMuted,
  health,
  _internal: { detectLanguage, detectIntent, detectSentiment, parseControlTags, buildPrompt }
};
