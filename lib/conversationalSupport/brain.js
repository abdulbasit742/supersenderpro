'use strict';
/**
 * lib/conversationalSupport/brain.js - the AI layer. Routes through the project's self-hosted
 * LLM hub (Ollama-first per the standing decision: PC #1, qwen2.5:32b kept warm). It is built to
 * DEGRADE GRACEFULLY: every function returns a sensible deterministic result when no model is
 * reachable, so the agent never goes silent.
 *
 *   classify(text, history, tid) -> { intent, confidence, reason }
 *   answer(text, history, tid)   -> { text, grounded, source }
 */
const { config } = require('./config');
const kb = require('./knowledgeBase');
const { matchAny, clamp01, norm } = require('./util');

// Resolve the shared hub the same defensive way chatbotBuilder/aiReply does.
let hub = null;
for (const p of ['../llmHub', '../../lib/llmHub', '../aiAgent']) {
  try { const m = require(p); if (m) { hub = m; break; } } catch {}
}
const hubAvailable = () => !!hub && config.useAI;

async function callHub(prompt, opts) {
  if (!hubAvailable()) return null;
  try {
    const fn = hub.generate || hub.complete || hub.chat || hub.ask || hub.run || hub.reply;
    if (typeof fn !== 'function') return null;
    const out = await fn.call(hub, prompt, opts || {});
    const text = typeof out === 'string' ? out : (out && (out.text || out.content || out.message || out.reply));
    return text ? String(text).trim() : null;
  } catch { return null; }
}

function historyBlock(history, max = 8) {
  return (history || []).slice(-max)
    .map((h) => (h.role === 'user' ? 'Customer: ' : 'Agent: ') + h.text)
    .join('\n');
}

function safeParseJSON(s) {
  if (!s) return null;
  try { return JSON.parse(s); } catch {}
  const m = String(s).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

/** Deterministic keyword intent classifier - the always-available fallback. */
function keywordClassify(text, tid) {
  if (matchAny(text, config.escalateKeywords)) return { intent: 'human', confidence: 0.9, reason: 'escalate keyword' };
  if (matchAny(text, config.orderKeywords) || kb.findProduct(tid, text)) return { intent: 'order', confidence: 0.6, reason: 'order keyword/product' };
  const faq = kb.bestFaq(tid, text);
  if (faq) return { intent: 'faq', confidence: clamp01(0.4 + faq.score * 0.5), reason: 'faq overlap ' + faq.score.toFixed(2) };
  const t = norm(text);
  if (t.length <= 12 && /(hi|hello|salam|assalam|hey|thanks|shukria|ok|theek)/.test(t)) return { intent: 'smalltalk', confidence: 0.7, reason: 'greeting' };
  return { intent: 'unknown', confidence: 0.2, reason: 'no match' };
}

/** Classify intent. Tries the model (JSON mode) first, falls back to keywords. */
async function classify(text, history, tid) {
  const base = keywordClassify(text, tid);
  // Explicit human asks short-circuit: don't waste a model call, never override down.
  if (base.intent === 'human') return base;
  if (!hubAvailable()) return base;
  const prompt = [
    'You are an intent classifier for a WhatsApp business support agent.',
    'Classify the LATEST customer message into exactly one intent:',
    '- faq: a question answerable from business info/FAQs',
    '- order: wants to buy, asks price/availability, or is placing/continuing an order',
    '- human: wants a human, complaint, refund, cancellation, or anything sensitive',
    '- smalltalk: greeting/thanks/chit-chat',
    '- unknown: cannot tell',
    'Respond with ONLY compact JSON: {"intent":"...","confidence":0..1}.',
    '',
    'Recent conversation:',
    historyBlock(history),
    'Latest customer message: ' + text,
  ].join('\n');
  const raw = await callHub(prompt, { json: true, temperature: 0 });
  const parsed = safeParseJSON(raw);
  if (parsed && config.intents.includes(parsed.intent)) {
    return { intent: parsed.intent, confidence: clamp01(parsed.confidence !== undefined ? parsed.confidence : 0.6), reason: 'llm' };
  }
  return base;
}

/**
 * Compose a grounded answer. Tries the model with KB context; falls back to the best-matching FAQ,
 * then to the configured fallback message. `grounded` is false when we couldn't ground it (caller
 * may use that signal to escalate).
 */
async function answer(text, history, tid) {
  const settings = kb.settings(tid);
  if (hubAvailable()) {
    const prompt = [
      'You are ' + (settings.businessName || 'our store') + "'s friendly WhatsApp support agent.",
      'Answer the customer ONLY using the business info below. If the info is not enough to answer,',
      'reply with exactly: NEED_HUMAN',
      'Keep it to 1-3 short WhatsApp lines. Match the customer\'s language (Urdu/English/Roman Urdu mix is fine).',
      '',
      '=== BUSINESS INFO ===',
      kb.context(tid),
      '=== END ===',
      '',
      'Recent conversation:',
      historyBlock(history),
      'Customer: ' + text,
      'Agent:',
    ].join('\n');
    const out = await callHub(prompt, { temperature: 0.3 });
    if (out && !/NEED_HUMAN/i.test(out)) return { text: out, grounded: true, source: 'llm' };
    if (out && /NEED_HUMAN/i.test(out)) return { text: '', grounded: false, source: 'llm_need_human' };
  }
  // Fallback path: deterministic FAQ match.
  const faq = kb.bestFaq(tid, text);
  if (faq) return { text: faq.faq.a, grounded: true, source: 'faq' };
  return { text: settings.fallbackMessage || 'Let me connect you to our team.', grounded: false, source: 'fallback' };
}

module.exports = { classify, answer, hubAvailable, keywordClassify, _callHub: callHub };
