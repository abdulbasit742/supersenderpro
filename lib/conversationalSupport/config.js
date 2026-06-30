'use strict';
/**
 * lib/conversationalSupport/config.js - central config for the 24/7 Conversational AI / Support agent.
 *
 * Roadmap feature #1: a WhatsApp agent that answers FAQs, takes orders, and escalates to a human
 * when needed. AI runs on the project's self-hosted llmHub (Ollama-first per the standing decision)
 * so inference cost is zero and data stays on-prem.
 *
 * Safe by default: CONV_SUPPORT_DRY_RUN=true prepares replies WITHOUT sending. Tenant-scoped.
 */
const path = require('path');

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};
const num = (v, def) => { const n = Number(v); return Number.isFinite(n) ? n : def; };

const DATA_DIR = path.join(__dirname, '../../data/conversational_support');

const INTENTS = ['greeting', 'faq', 'order', 'track_order', 'human', 'goodbye', 'unknown'];

module.exports = {
  paths: {
    dir: DATA_DIR,
    kb: (tid) => path.join(DATA_DIR, tid + '_kb.json'),
    sessions: (tid) => path.join(DATA_DIR, tid + '_sessions.json'),
    handoffs: (tid) => path.join(DATA_DIR, tid + '_handoffs.json'),
    orders: (tid) => path.join(DATA_DIR, tid + '_orders.json'),
  },
  intents: INTENTS,
  config: {
    enabled: bool(process.env.CONV_SUPPORT_ENABLED, true),
    dryRun: bool(process.env.CONV_SUPPORT_DRY_RUN, true),
    requireAdmin: bool(process.env.CONV_SUPPORT_REQUIRE_ADMIN, true),
    useAI: bool(process.env.CONV_SUPPORT_USE_AI, true),
    // FAQ confidence (0..1) below this => not confident => clarify/escalate
    minAnswerConfidence: num(process.env.CONV_SUPPORT_MIN_CONFIDENCE, 0.18),
    // consecutive unknown/low-confidence turns before auto-escalating to a human
    maxUnknownTurns: num(process.env.CONV_SUPPORT_MAX_UNKNOWN, 2),
    sessionTtlHours: num(process.env.CONV_SUPPORT_SESSION_TTL_HOURS, 12),
    historyLimit: num(process.env.CONV_SUPPORT_HISTORY_LIMIT, 12),
    botName: process.env.CONV_SUPPORT_BOT_NAME || 'SuperSender Assistant',
    humanKeywords: (process.env.CONV_SUPPORT_HUMAN_KEYWORDS || 'agent,human,insaan,representative,complaint,shikayat,baat karni,baat karwao,call me')
      .split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
  },
};
