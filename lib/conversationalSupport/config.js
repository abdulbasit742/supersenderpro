'use strict';
/**
 * lib/conversationalSupport/config.js - central config for the 24/7 Conversational AI Support agent.
 *
 * This is Feature #1 of the SaaS roadmap: a WhatsApp agent that answers questions, takes orders,
 * and escalates to a human when needed. AI runs through the project's self-hosted llmHub
 * (Ollama-first per the standing decision). It ALWAYS has a deterministic fallback so it keeps
 * working offline / in dry-run / when no model is reachable.
 *
 * Safe by default: CONV_SUPPORT_DRY_RUN=true prepares replies WITHOUT sending them anywhere.
 */
const path = require('path');

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};
const num = (v, def) => (v === undefined || v === null || v === '' || isNaN(Number(v)) ? def : Number(v));
const list = (v, def) => (v ? String(v).split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) : def);

const DATA_DIR = path.join(__dirname, '../../data/conversational_support');

module.exports = {
  paths: {
    dir: DATA_DIR,
    kb: (tid) => path.join(DATA_DIR, tid + '_kb.json'),
    conversations: (tid) => path.join(DATA_DIR, tid + '_conversations.json'),
    handoffs: (tid) => path.join(DATA_DIR, tid + '_handoffs.json'),
  },
  intents: ['faq', 'order', 'human', 'smalltalk', 'unknown'],
  config: {
    enabled: bool(process.env.CONV_SUPPORT_ENABLED, true),
    // When true (default), the engine PREPARES the reply but never sends it. Flip to false only
    // once a real WhatsApp send adapter is wired and you've tested.
    dryRun: bool(process.env.CONV_SUPPORT_DRY_RUN, true),
    requireAdmin: bool(process.env.CONV_SUPPORT_REQUIRE_ADMIN, true),
    useAI: bool(process.env.CONV_SUPPORT_USE_AI, true),
    // Below this model/keyword confidence the agent escalates to a human instead of guessing.
    escalateBelowConfidence: num(process.env.CONV_SUPPORT_ESCALATE_BELOW, 0.45),
    // After this many low-quality/fallback turns in a row, escalate.
    escalateAfterFallbacks: num(process.env.CONV_SUPPORT_ESCALATE_AFTER_FALLBACKS, 3),
    sessionTtlHours: num(process.env.CONV_SUPPORT_SESSION_TTL_HOURS, 48),
    maxHistoryTurns: num(process.env.CONV_SUPPORT_MAX_HISTORY, 12),
    // Words that always trigger a human handoff (refunds, complaints, legal, explicit asks).
    escalateKeywords: list(
      process.env.CONV_SUPPORT_ESCALATE_KEYWORDS,
      ['agent', 'human', 'representative', 'complaint', 'refund', 'cancel order', 'legal',
       'manager', 'baat karni', 'insaan', 'shikayat', 'wapsi', 'paise wapas']
    ),
    // Words that hint the customer wants to buy / place an order.
    orderKeywords: list(
      process.env.CONV_SUPPORT_ORDER_KEYWORDS,
      ['order', 'buy', 'purchase', 'kharidna', 'lena hai', 'chahiye', 'price', 'rate', 'kitne ka']
    ),
  },
};
