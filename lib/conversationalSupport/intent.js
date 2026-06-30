'use strict';
/**
 * lib/conversationalSupport/intent.js - hybrid intent detection. Fast rule-based first
 * (keywords/regex, works offline), then optional LLM classification for ambiguous messages.
 * Note: a generic 'delivery time' question is intentionally NOT track_order; only explicit
 * status/tracking phrasing is.
 */
const { config, intents } = require('./config');
const llm = require('./llm');

const RULES = [
  { intent: 'human', kw: config.humanKeywords },
  { intent: 'track_order', re: /(track|tracking|order\s*status|status\s*(of|kya)|kahan\s*hai|kab\s*aaye|shipment|parcel)/i },
  { intent: 'order', re: /(order|buy|kharid|purchase|chahiye|chahye|book\b|mangwana|lena hai|kitne ka|how much|price chahiye)/i },
  { intent: 'greeting', re: /^(hi|hello|hey|salam|assalam|aoa|asalam|start|info|menu)\b/i },
  { intent: 'goodbye', re: /(bye|khuda hafiz|allah hafiz|shukriya|thank you|ok bye|thanks)/i },
];

function ruleBased(text) {
  const t = String(text || '').trim();
  const low = t.toLowerCase();
  for (const r of RULES) {
    if (r.kw && r.kw.some((k) => low.includes(k))) return r.intent;
    if (r.re && r.re.test(t)) return r.intent;
  }
  return null;
}

async function detect(text, { allowLLM = true } = {}) {
  const rule = ruleBased(text);
  if (rule) return { intent: rule, via: 'rules' };
  if (allowLLM && config.useAI) {
    const got = await llm.classify(text, intents);
    if (got) return { intent: got, via: 'llm' };
  }
  return { intent: 'unknown', via: 'fallback' };
}

module.exports = { detect, ruleBased };
