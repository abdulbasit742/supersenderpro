'use strict';
/**
 * lib/chatbotBuilder/aiReply.js - resolves `ai` flow nodes through the project's self-hosted
 * LLM hub (Ollama-first per repo standing decision). ALWAYS falls back to a deterministic
 * response so flows keep working offline / in dry-run / when no hub is wired.
 */
const { config } = require('./config');

let hub = null;
for (const p of ['../llmHub', '../../lib/llmHub', '../aiAgent']) {
  try { const m = require(p); if (m) { hub = m; break; } } catch {}
}

async function viaLLM(prompt) {
  if (!hub || !config.useAI) return null;
  try {
    const fn = hub.generate || hub.complete || hub.chat || hub.ask || hub.run || hub.reply;
    if (typeof fn !== 'function') return null;
    const out = await fn.call(hub, prompt);
    const text = typeof out === 'string' ? out : (out && (out.text || out.content || out.message || out.reply));
    return text ? String(text).trim() : null;
  } catch { return null; }
}

/** Resolve an AI node. `prompt` may contain {{vars}} (already interpolated by the engine). */
async function resolve(prompt, fallbackText) {
  const out = await viaLLM(prompt);
  if (out) return out;
  return fallbackText || 'Thanks! Hamari team thodi der mein aap se rabta karegi.';
}

module.exports = { resolve, hubAvailable: () => !!hub };
