'use strict';
// Adapters that turn ANY agent into a plan of tool calls.
// All adapters funnel through the same sandbox, so the agent stays inside your tools.

// Deterministic, zero-dependency planner. Always safe to run.
function rulePlanner(goal) {
  const g = String(goal || '').toLowerCase();
  const steps = [];
  // Always start by orienting with safe reads.
  steps.push({ tool: 'health', args: {}, rationale: 'Confirm the system is up' });
  if (/customer|client|contact/.test(g)) steps.push({ tool: 'list_customers', args: { limit: 20 }, rationale: 'Goal mentions customers' });
  if (/order|sale|revenue|purchase/.test(g)) steps.push({ tool: 'list_orders', args: { limit: 20 }, rationale: 'Goal mentions orders/sales' });
  if (/inbox|reply|chat|message/.test(g)) steps.push({ tool: 'list_inbox', args: {}, rationale: 'Goal mentions messages/inbox' });
  if (/dashboard|summary|overview|report|kpi/.test(g)) steps.push({ tool: 'dashboard_summary', args: {}, rationale: 'Goal mentions a summary/report' });
  if (/whatsapp|wa\b|connection/.test(g)) steps.push({ tool: 'whatsapp_status', args: {}, rationale: 'Goal mentions WhatsApp' });
  if (/search|find|lookup/.test(g)) steps.push({ tool: 'search_business_data', args: { query: goal }, rationale: 'Goal asks to search' });
  // Proposed (gated) actions become drafts, never auto-run.
  if (/send|notify|broadcast|remind|follow.?up/.test(g))
    steps.push({ tool: 'send_whatsapp_message', args: { to: '<resolve>', message: '<draft>' }, rationale: 'Goal implies outreach (will require approval)' });
  if (/post|publish|social/.test(g))
    steps.push({ tool: 'publish_social_post', args: { platform: '<resolve>', content: '<draft>' }, rationale: 'Goal implies social publishing (will require approval)' });
  if (steps.length === 1) steps.push({ tool: 'dashboard_summary', args: {}, rationale: 'Default situational read' });
  return steps;
}

// Optional LLM planner via Groq (uses GROQ_API_KEY if present). Falls back to rules.
async function llmPlanner(goal, { provider = 'groq' } = {}) {
  const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!key) return rulePlanner(goal);
  const { listTools } = require('./toolRegistry');
  const tools = listTools().map(t => `${t.name} (${t.risk}): ${t.description}`).join('\n');
  const url = provider === 'openai'
    ? 'https://api.openai.com/v1/chat/completions'
    : 'https://api.groq.com/openai/v1/chat/completions';
  const model = provider === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-4o-mini')
    : (process.env.GROQ_MODEL || 'llama-3.3-70b-versatile');
  const sys = `You plan actions for a sandboxed business agent. ONLY use these tools:\n${tools}\n` +
    `Return STRICT JSON: {"steps":[{"tool":"name","args":{},"rationale":"why"}]}. No prose.`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: sys }, { role: 'user', content: `Goal: ${goal}` }] })
    });
    const data = await res.json();
    const txt = data?.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(txt);
    const steps = Array.isArray(parsed.steps) ? parsed.steps : [];
    return steps.length ? steps : rulePlanner(goal);
  } catch {
    return rulePlanner(goal); // never fail the run because the LLM hiccuped
  }
}

const AGENTS = {
  zeroclaw: { name: 'ZeroClaw (rule-based)', kind: 'deterministic', plan: async (g) => rulePlanner(g) },
  groq:     { name: 'Groq LLM',  kind: 'llm', plan: async (g) => llmPlanner(g, { provider: 'groq' }) },
  openai:   { name: 'OpenAI LLM',kind: 'llm', plan: async (g) => llmPlanner(g, { provider: 'openai' }) }
};

function listAgents() {
  return Object.entries(AGENTS).map(([id, a]) => ({ id, name: a.name, kind: a.kind }));
}
function getAgent(id) { return AGENTS[id] || AGENTS.zeroclaw; }

module.exports = { AGENTS, listAgents, getAgent, rulePlanner, llmPlanner };
