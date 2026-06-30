'use strict';

const { config } = require('./config');

// Optional LLM via llmHub (Ollama-first). Loaded lazily + defensively so the
// module works even if llmHub is absent. NEVER required for core behaviour.
function tryLLM() {
  try { return require('../llmHub'); } catch (e) { return null; }
}

// ---- Deterministic template engine (always available) -------------------
// Variant strategies produce distinct, market-appropriate Roman-Urdu + English
// phrasings so A/B/n tests have real differences without any model.
const OPENERS = [
  'Assalam o Alaikum {{name}}!',
  'Hello {{name}} \uD83D\uDC4B',
  'Khush khabri {{name}}!',
];
const CLOSERS = [
  'Abhi order karein \uD83D\uDED2',
  'Reply \"YES\" for details.',
  'Stock limited hai, jaldi karein!',
];

function fill(tpl, ctx) {
  return String(tpl).replace(/\{\{(\w+)\}\}/g, (_, k) => (ctx[k] != null ? String(ctx[k]) : ''));
}

function templateVariants(brief, ctx, n) {
  const body = brief.message || brief.offer || 'Special offer available now.';
  const out = [];
  for (let i = 0; i < n; i++) {
    const opener = OPENERS[i % OPENERS.length];
    const closer = CLOSERS[i % CLOSERS.length];
    const text = [fill(opener, ctx), fill(body, ctx), fill(closer, ctx)]
      .filter(Boolean).join('\n\n');
    out.push({ variant: String.fromCharCode(65 + i), text, source: 'template' });
  }
  return out;
}

async function llmVariants(brief, ctx, n) {
  const hub = tryLLM();
  if (!hub || !config.useLLM) return null;
  try {
    const prompt = [
      'You write short WhatsApp marketing broadcasts for a Pakistani store.',
      'Mix Roman Urdu + English naturally. Keep under 320 chars. No emojis spam.',
      'Offer/brief: ' + JSON.stringify(brief),
      'Customer context: ' + JSON.stringify(ctx),
      'Return ' + n + ' DISTINCT variants, one per line, prefixed \"A:\", \"B:\", etc.',
    ].join('\n');
    const fn = hub.complete || hub.chat || hub.generate;
    if (typeof fn !== 'function') return null;
    const res = await fn.call(hub, { prompt, maxTokens: 400 });
    const text = (res && (res.text || res.content || res.output)) || '';
    const lines = String(text).split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed = lines
      .map((l) => l.replace(/^[A-Z]\s*[:.)-]\s*/, '').trim())
      .filter(Boolean)
      .slice(0, n)
      .map((t, i) => ({ variant: String.fromCharCode(65 + i), text: t, source: 'llm' }));
    return parsed.length ? parsed : null;
  } catch (e) {
    return null; // graceful fallback to templates
  }
}

// Compose n variants. Tries LLM (optional), always falls back to templates.
async function compose(brief, opts) {
  opts = opts || {};
  const ctx = opts.context || { name: 'Customer' };
  const n = Math.max(1, Math.min(Number(opts.variants) || config.maxVariants, 8));
  const viaLLM = await llmVariants(brief || {}, ctx, n);
  if (viaLLM && viaLLM.length) {
    // Top up with templates if model returned fewer than requested.
    if (viaLLM.length < n) {
      const extra = templateVariants(brief || {}, ctx, n).slice(viaLLM.length);
      return viaLLM.concat(extra);
    }
    return viaLLM;
  }
  return templateVariants(brief || {}, ctx, n);
}

module.exports = { compose, templateVariants, fill };
