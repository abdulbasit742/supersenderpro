'use strict';
/**
 * aiAdvisor.js — optional LLM layer on top of rule-based recommendations.
 *
 * SAFETY: dry-run / rule-based by default. Live AI runs ONLY when
 * MARKETPLACE_INTELLIGENCE_AI_LIVE=true AND a caller-provided aiCallFn is passed
 * (so we reuse the project's existing AI provider — no duplicate LLM stack).
 */
const recommendationEngine = require('./recommendationEngine');

function isLive() { return String(process.env.MARKETPLACE_INTELLIGENCE_AI_LIVE || 'false').toLowerCase() === 'true'; }

/**
 * @param {object} state graph state
 * @param {function=} aiCallFn async (prompt, systemPrompt) => string  (e.g. server's callAIProvider)
 */
async function advise(state, aiCallFn) {
  const base = recommendationEngine.generate(state);
  if (!isLive() || typeof aiCallFn !== 'function') {
    return { mode: 'rule_based_dry_run', recommendations: base };
  }
  try {
    const prompt = `You are a marketplace analyst. Given these safe, masked rule-based signals, rewrite the top 8 as crisp Urdu/English mixed admin actions. Do not invent data.\n\n${JSON.stringify(base.slice(0, 12))}`;
    const text = await aiCallFn(prompt, 'Be concise. Never reveal phone numbers or raw data.');
    return { mode: 'ai_live', recommendations: base, aiSummary: String(text || '').slice(0, 4000) };
  } catch (e) {
    return { mode: 'rule_based_dry_run', recommendations: base, aiError: e.message };
  }
}

module.exports = { advise, isLive };
