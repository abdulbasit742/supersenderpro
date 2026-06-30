'use strict';

/**
 * Ecommerce Hub — AI auto-reply for unmatched buyer messages.
 * Routes through the existing AI Brain Bridge (lib/llmHub) if available, so it
 * uses whatever provider is configured (ollama local by default per project).
 * If llmHub is missing or AI_REPLY_ENABLED!=true, returns null (let FAQ/agent
 * handle it). Keeps a short system prompt grounded in store context.
 */

let llmHub = null;
try { llmHub = require('../llmHub'); } catch (_e) { try { llmHub = require('../../lib/llmHub'); } catch (_e2) { llmHub = null; } }

function enabled() { return String(process.env.AI_REPLY_ENABLED || 'false').toLowerCase() === 'true'; }

function systemPrompt() {
  return process.env.AI_REPLY_SYSTEM || [
    'You are a helpful WhatsApp shop assistant for a Pakistani ecommerce store.',
    'Reply briefly in the same language/style as the buyer (Roman Urdu if they use it).',
    'You can mention commands: !shop (browse), !product <id>, !track <orderId>, !coupon.',
    'Never invent prices or stock; if unsure, tell them to type !shop or ask a human with !agent.',
    'Keep replies under 3 short lines.'
  ].join(' ');
}

/**
 * reply(text) -> string answer, or null if AI is unavailable/disabled or errors.
 * Tries common llmHub method shapes so it works with the project's hub.
 */
async function reply(text, context) {
  if (!enabled() || !llmHub) return null;
  const messages = [
    { role: 'system', content: systemPrompt() + (context ? ('\nContext: ' + context) : '') },
    { role: 'user', content: String(text || '') }
  ];
  try {
    if (typeof llmHub.chat === 'function') { const r = await llmHub.chat({ messages: messages }); return extract(r); }
    if (typeof llmHub.complete === 'function') { const r = await llmHub.complete(String(text || ''), { system: systemPrompt() }); return extract(r); }
    if (typeof llmHub.generate === 'function') { const r = await llmHub.generate({ messages: messages }); return extract(r); }
  } catch (_e) { return null; }
  return null;
}

function extract(r) {
  if (!r) return null;
  if (typeof r === 'string') return r.trim() || null;
  if (r.text) return String(r.text).trim() || null;
  if (r.content) return String(r.content).trim() || null;
  if (r.message && r.message.content) return String(r.message.content).trim() || null;
  if (r.choices && r.choices[0]) { const c = r.choices[0]; return String((c.message && c.message.content) || c.text || '').trim() || null; }
  return null;
}

module.exports = { reply, enabled };
