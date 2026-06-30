// lib/aiAutoReply/llmBridge.js — Bridge to the existing AI hub. Uses lib/llmHub if present
// (provider-agnostic: openai/anthropic/gemini/groq/ollama/mock per the project's AI Brain Bridge).
// If the hub is absent OR a dry-run is requested, returns a deterministic local completion so the
// department always works offline and in tests. Never throws to the caller.

let hub = null; try { hub = require('../llmHub'); } catch (_e) { hub = null; }

function hubAvailable() { return !!hub; }

// Best-effort call across a few likely hub method names so we don't hard-couple to one signature.
async function _callHub(prompt, opts) {
 if (!hub) return null;
 const candidates = ['complete', 'chat', 'generate', 'ask', 'run'];
 for (const m of candidates) {
 if (typeof hub[m] === 'function') {
 try {
 const out = await hub[m]({ prompt, messages: [{ role: 'user', content: prompt }], ...opts });
 if (out == null) continue;
 if (typeof out === 'string') return out;
 if (out.text) return out.text;
 if (out.content) return out.content;
 if (out.choices && out.choices[0]) return out.choices[0].text || (out.choices[0].message && out.choices[0].message.content) || null;
 } catch (_e) { /* try next */ }
 }
 }
 return null;
}

// Deterministic offline fallback: echo the grounded FAQ answer if provided, else a safe generic.
function _localFallback({ faqAnswer }) {
 if (faqAnswer) return faqAnswer;
 return 'Thanks for reaching out! A team member will help you with this shortly.';
}

async function complete({ prompt, faqAnswer, dryRun = false, options = {} } = {}) {
 if (!dryRun && hub) {
 const out = await _callHub(prompt, options);
 if (out && String(out).trim()) return { text: String(out).trim(), source: 'llmHub' };
 }
 return { text: _localFallback({ faqAnswer }), source: hub ? 'fallback' : 'local' };
}

module.exports = { complete, hubAvailable };
