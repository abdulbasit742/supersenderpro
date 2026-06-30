'use strict';
/**
 * lib/conversationalSupport/llm.js - routes generation + classification through the project's
 * self-hosted llmHub (Ollama-first). Always degrades gracefully to null so the agent's
 * deterministic logic keeps working offline / in dry-run / when no hub is wired.
 */
const { config } = require('./config');

let hub = null;
for (const p of ['../llmHub', '../../lib/llmHub', '../aiAgent']) {
  try { const m = require(p); if (m) { hub = m; break; } } catch {}
}

function pickFn() {
  if (!hub) return null;
  const fn = hub.generate || hub.complete || hub.chat || hub.ask || hub.run || hub.reply;
  return typeof fn === 'function' ? fn : null;
}

async function generate(prompt, opts = {}) {
  if (!config.useAI) return null;
  const fn = pickFn();
  if (!fn) return null;
  try {
    const out = await fn.call(hub, prompt, opts);
    const text = typeof out === 'string' ? out : (out && (out.text || out.content || out.message || out.reply));
    return text ? String(text).trim() : null;
  } catch { return null; }
}

/** Ask the model to pick exactly one label from a fixed set. Returns a lowercase label or null. */
async function classify(text, labels) {
  const prompt = [
    'You are an intent classifier for a WhatsApp business assistant.',
    'Reply with EXACTLY ONE of these labels and nothing else: ' + labels.join(', ') + '.',
    'Customer message: """' + String(text || '').slice(0, 500) + '"""',
    'Label:',
  ].join('\n');
  const out = await generate(prompt);
  if (!out) return null;
  const got = String(out).toLowerCase();
  return labels.find((l) => got.includes(l)) || null;
}

module.exports = { generate, classify, hubAvailable: () => !!pickFn() };
