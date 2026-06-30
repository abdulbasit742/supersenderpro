// lib/aiAutoReply/index.js — AI Auto-Reply: intent-aware smart responder (barrel export).
//
// Routes inbound messages through the existing lib/llmHub when present (provider-agnostic:
// openai/anthropic/gemini/groq/ollama/mock), else a deterministic local fallback so it always
// works offline. FAQ knowledge base + keyword intent matching, confidence-based human handoff,
// business-hours gating, per-contact cooldown, and a master kill switch.
//
// SAFETY: SUGGEST-MODE by default — replies are drafted, never sent, until AI_AUTO_REPLY_LIVE=true
// AND a notifier is wired via require('./lib/aiAutoReply').setNotifier(fn). Kill switch stops
// everything instantly. Contacts masked in views.

const { config } = require('./config');
const notify = require('./notify');

module.exports = {
 config,
 store: require('./store'),
 privacy: require('./privacy'),
 faqStore: require('./faqStore'),
 llmBridge: require('./llmBridge'),
 intent: require('./intent'),
 notify,
 responder: require('./responder'),
 doctor: require('./doctor'),
 setNotifier: notify.setNotifier,
};
