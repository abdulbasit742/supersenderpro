'use strict';
/**
 * lib/chatbotBuilder/config.js - central config for the no-code Chatbot Flow Builder.
 * Wati-parity: visual flows (message/question/choice/condition/ai/action/handoff nodes).
 * Safe by default: CHATBOT_BUILDER_DRY_RUN=true prepares replies WITHOUT sending.
 * AI nodes route through the project's self-hosted llmHub (Ollama-first) when available.
 */
const path = require('path');

const bool = (v, def = false) => {
  if (v === undefined || v === null || v === '') return def;
  return ['1', 'true', 'yes', 'on'].includes(String(v).toLowerCase());
};

const DATA_DIR = path.join(__dirname, '../../data/chatbot_builder');

const NODE_TYPES = ['message', 'question', 'choice', 'condition', 'ai', 'action', 'handoff', 'end'];

module.exports = {
  paths: {
    dir: DATA_DIR,
    flows: (tid) => path.join(DATA_DIR, tid + '_flows.json'),
    sessions: (tid) => path.join(DATA_DIR, tid + '_sessions.json'),
    counters: (tid) => path.join(DATA_DIR, tid + '_counters.json'),
  },
  nodeTypes: NODE_TYPES,
  config: {
    enabled: bool(process.env.CHATBOT_BUILDER_ENABLED, true),
    dryRun: bool(process.env.CHATBOT_BUILDER_DRY_RUN, true),
    requireAdmin: bool(process.env.CHATBOT_BUILDER_REQUIRE_ADMIN, true),
    maxStepsPerTurn: Number(process.env.CHATBOT_BUILDER_MAX_STEPS || 25),
    sessionTtlHours: Number(process.env.CHATBOT_BUILDER_SESSION_TTL_HOURS || 24),
    useAI: bool(process.env.CHATBOT_BUILDER_USE_AI, true),
  },
};
