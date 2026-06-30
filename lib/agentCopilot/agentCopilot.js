// lib/agentCopilot/agentCopilot.js
// ────────────────────────────────────────────────────────────────────
// Human-agent Copilot. Once a chat is escalated to a human (see the support
// agent's escalation path), the human still needs to type fast and on-brand.
// This generates:
//   - 2-3 suggested reply drafts for the latest customer message,
//   - a concise thread summary (what the customer wants, where things stand),
//   - on-demand tone rewrites of a draft the human is about to send.
//
// All generation runs through the AI Brain Bridge (ai/aiBrain.js -> processPrompt),
// i.e. the self-hosted Ollama model. Conversation history comes from the support
// agent's store; relevant knowledge comes from the RAG store when present. Both
// are optional, so this works standalone. Graceful fallback to canned drafts.
//
// Zero new npm deps.
// ────────────────────────────────────────────────────────────────────

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[agentCopilot] aiBrain unavailable:', e.message); processPrompt = null; }

let supportAgent = null;
try { supportAgent = require('../../ai/agents/supportAgent'); } catch { /* optional */ }

let ragHelper = null;
try { ragHelper = require('../../ai/knowledgeBase/supportAgentRag'); } catch { /* optional */ }

const MODEL = () => process.env.COPILOT_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

function historyBlock(storeId, phone) {
  if (!supportAgent || typeof supportAgent.getConversation !== 'function') return { text: '(no history available)', lastCustomer: '' };
  let thread;
  try { thread = supportAgent.getConversation(storeId, phone); } catch { thread = null; }
  const hist = (thread && thread.history) || [];
  const text = hist.length
    ? hist.map(h => `${h.role === 'user' ? 'Customer' : 'Agent'}: ${h.content}`).join('\n')
    : '(no prior messages)';
  const lastCustomer = [...hist].reverse().find(h => h.role === 'user');
  return { text, lastCustomer: lastCustomer ? lastCustomer.content : '' };
}

function extractDrafts(raw) {
  if (!raw) return [];
  // Accept numbered lists, bulleted lists, or newline-separated.
  const lines = String(raw).split('\n').map(l => l.trim()).filter(Boolean);
  const drafts = [];
  for (const l of lines) {
    const m = l.match(/^(?:\d+[.)]|[-*•])\s*(.+)$/);
    if (m) drafts.push(m[1].trim());
  }
  const out = (drafts.length ? drafts : lines).filter(s => s.length > 1);
  return out.slice(0, 3);
}

const CANNED = [
  'Thanks for your patience! Could you share a bit more detail so I can help precisely?',
  'I understand, let me look into this for you right away.',
  'Apologies for the trouble. Here is what I can do to sort this out:'
];

/**
 * Suggest 2-3 reply drafts for the latest customer message in a thread.
 * @returns {Promise<{ suggestions: string[], summaryHint?: string, source }>}
 */
async function suggestReplies({ storeId = 'default_store', phone, customerMessage, count = 3 } = {}) {
  if (!phone && !customerMessage) throw new Error('phone or customerMessage is required');
  const { text: history, lastCustomer } = phone ? historyBlock(storeId, phone) : { text: '(no history)', lastCustomer: '' };
  const target = customerMessage || lastCustomer;
  if (!target) throw new Error('no customer message to respond to');

  let knowledge = '';
  if (ragHelper && typeof ragHelper.getContext === 'function') {
    try { knowledge = (await ragHelper.getContext(storeId, target, { k: 3 })).context || ''; } catch { knowledge = ''; }
  }

  if (!processPrompt) return { suggestions: CANNED.slice(0, count), source: 'fallback' };

  const prompt = [
    'You are a sales/support copilot helping a HUMAN agent reply to a customer on WhatsApp.',
    knowledge ? knowledge + '\n' : '',
    'CONVERSATION SO FAR:',
    history,
    '',
    `The customer\'s latest message to answer: "${target}"`,
    '',
    `Write ${count} distinct, ready-to-send reply drafts the agent can pick from.`,
    'Rules: short and natural (WhatsApp style), helpful, on-brand, varied in approach.',
    'Match the customer\'s language (English / Urdu / Roman Urdu). Only use facts from the knowledge above; do not invent prices.',
    'Return ONLY the drafts as a numbered list, nothing else.'
  ].filter(Boolean).join('\n');

  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    const looksUnconfigured = typeof raw === 'string' && /\[AI Assist\]|Connect your .* in the environment/i.test(raw);
    const suggestions = extractDrafts(raw);
    if (looksUnconfigured || !suggestions.length) return { suggestions: CANNED.slice(0, count), source: 'fallback' };
    return { suggestions, source: 'ollama' };
  } catch (err) {
    console.warn('[agentCopilot] suggest failed:', err.message);
    return { suggestions: CANNED.slice(0, count), source: 'fallback' };
  }
}

/**
 * Summarize a thread for an agent picking it up.
 * @returns {Promise<{ summary: string, source }>}
 */
async function summarizeThread({ storeId = 'default_store', phone } = {}) {
  if (!phone) throw new Error('phone is required');
  const { text: history } = historyBlock(storeId, phone);
  if (history.startsWith('(no')) return { summary: 'No prior conversation on record.', source: 'none' };
  if (!processPrompt) return { summary: 'Conversation history available; AI summary unavailable (model offline).', source: 'fallback' };

  const prompt = [
    'Summarize this WhatsApp support conversation for a human agent taking it over.',
    'In 2-3 lines: what the customer wants, key facts (product, order, issue), and the current state / next action.',
    '',
    history,
    '',
    'Summary:'
  ].join('\n');

  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    const looksUnconfigured = typeof raw === 'string' && /\[AI Assist\]|Connect your .* in the environment/i.test(raw);
    if (!raw || looksUnconfigured) return { summary: 'Conversation history available; AI summary unavailable.', source: 'fallback' };
    return { summary: String(raw).trim(), source: 'ollama' };
  } catch (err) {
    return { summary: 'Conversation history available; AI summary unavailable.', source: 'fallback', error: err.message };
  }
}

/**
 * Rewrite a draft in a requested tone (e.g. 'friendly', 'formal', 'apologetic',
 * 'concise', or translate to 'urdu'/'roman urdu').
 * @returns {Promise<{ rewrite: string, source }>}
 */
async function rewriteTone({ draft, tone = 'friendly' } = {}) {
  if (!draft || !String(draft).trim()) throw new Error('draft is required');
  if (!processPrompt) return { rewrite: draft, source: 'fallback' };

  const prompt = [
    `Rewrite the following WhatsApp reply to be ${tone}. Keep the meaning and any facts identical.`,
    'Keep it short and natural. Return ONLY the rewritten message.',
    '',
    `Message: "${draft}"`,
    '',
    'Rewritten:'
  ].join('\n');

  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    const looksUnconfigured = typeof raw === 'string' && /\[AI Assist\]|Connect your .* in the environment/i.test(raw);
    if (!raw || looksUnconfigured) return { rewrite: draft, source: 'fallback' };
    return { rewrite: String(raw).trim().replace(/^"|"$/g, ''), source: 'ollama' };
  } catch (err) {
    return { rewrite: draft, source: 'fallback', error: err.message };
  }
}

function health() {
  return {
    ok: true,
    brainBridge: Boolean(processPrompt),
    model: MODEL(),
    supportAgentWired: Boolean(supportAgent && supportAgent.getConversation),
    ragWired: Boolean(ragHelper && ragHelper.getContext)
  };
}

module.exports = { suggestReplies, summarizeThread, rewriteTone, health, _internal: { extractDrafts, CANNED } };
