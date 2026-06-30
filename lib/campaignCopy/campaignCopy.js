// lib/campaignCopy/campaignCopy.js
// ────────────────────────────────────────────────────────────────────
// AI Campaign Copywriter. Turns a short brief into ready-to-send WhatsApp
// broadcast copy: N on-brand variants (for A/B testing), each with merge-field
// placeholders ({{name}} etc.), tone + language control, and an anti-ban /
// spam lint so a careless blast doesn't get the number flagged.
//
// Generation runs through the AI Brain Bridge (self-hosted Ollama). If the model
// is offline it falls back to a deterministic template so the team can still
// ship. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[campaignCopy] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.CAMPAIGN_COPY_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

const LANG_INSTRUCTION = {
  en: 'Write in English.',
  ur: 'Write in Urdu (Urdu script).',
  'roman-ur': 'Write in Roman Urdu (Urdu/Hindi in English letters), casual and friendly.',
  hi: 'Write in Hindi.'
};

// ── Anti-ban / spam lint ──────────────────────────────────────────
const SPAM_WORDS = ['free', 'winner', 'congratulations', '100%', 'guarantee', 'guaranteed', 'click here', 'act now', 'limited time', 'cash', 'prize', 'urgent', 'risk-free', 'no cost', 'buy now'];

/**
 * Lint broadcast copy for spam/anti-ban risk. Returns { score 0-100 (higher =
 * riskier), level, issues[] }. Heuristic, deterministic, no model needed.
 */
function lint(text) {
  const t = String(text || '');
  const lower = t.toLowerCase();
  const issues = [];
  let risk = 0;

  const spamHits = SPAM_WORDS.filter(w => lower.includes(w));
  if (spamHits.length) { risk += spamHits.length * 10; issues.push(`spam-trigger words: ${spamHits.join(', ')}`); }

  const links = (t.match(/https?:\/\/|www\./gi) || []).length;
  if (links > 1) { risk += 15; issues.push(`${links} links (keep to <=1)`); }

  const caps = (t.match(/[A-Z]/g) || []).length;
  const letters = (t.match(/[A-Za-z]/g) || []).length || 1;
  if (letters > 20 && caps / letters > 0.4) { risk += 15; issues.push('excessive CAPS'); }

  const exclaims = (t.match(/!/g) || []).length;
  if (exclaims > 2) { risk += 10; issues.push(`${exclaims} exclamation marks`); }

  const emojis = (t.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]/gu) || []).length;
  if (emojis > 5) { risk += 10; issues.push(`${emojis} emojis (keep it tasteful)`); }

  if (t.length > 1000) { risk += 10; issues.push('very long message'); }
  if (!/\{\{\s*\w+\s*\}\}/.test(t)) issues.push('no personalization merge field (consider {{name}})');
  if (!/stop|unsubscribe|opt.?out|reply stop/i.test(lower)) issues.push('no opt-out hint (recommended for broadcasts)');

  risk = Math.max(0, Math.min(100, risk));
  const level = risk >= 60 ? 'high' : risk >= 30 ? 'medium' : 'low';
  return { score: risk, level, issues };
}

function stripFences(s) { return String(s || '').replace(/^```[a-z]*\n?|```$/gim, '').trim(); }

function splitVariants(raw, n) {
  const text = stripFences(raw);
  // Split on explicit "Variant X" / "Option X" headers or numbered list items.
  const byHeader = text.split(/\n(?=(?:variant|option)\s*[A-Z0-9]|\d+[.)]\s)/i)
    .map(s => s.replace(/^(?:variant|option)\s*[A-Z0-9][:.)-]*\s*/i, '').replace(/^\d+[.)]\s*/, '').trim())
    .filter(Boolean);
  const out = (byHeader.length >= 2 ? byHeader : text.split(/\n{2,}/).map(s => s.trim()).filter(Boolean));
  return out.slice(0, n);
}

function templateFallback({ brief, offer, cta, n, language }) {
  const base = offer || brief || 'our latest update';
  const action = cta || 'Reply YES to know more';
  const samples = [
    `Hi {{name}}! \ud83d\udc4b ${base}. ${action}.`,
    `{{name}}, thought you\'d like this: ${base}. ${action} \ud83d\ude4c`,
    `Quick one, {{name}} — ${base}. ${action}. Reply STOP to opt out.`,
    `\u2728 ${base}, just for you {{name}}. ${action}.`
  ];
  return samples.slice(0, n);
}

/**
 * Generate N broadcast copy variants from a brief.
 * @param {object} opts
 * @param {string} opts.brief - what the campaign is about (required)
 * @param {string} [opts.offer] @param {string} [opts.cta] @param {string} [opts.tone='friendly']
 * @param {string} [opts.language='en'] @param {number} [opts.variants=3]
 * @param {string} [opts.audience] - segment description for personalization
 * @returns {Promise<{ variants: [{label,text,lint}], source }>}
 */
async function generate({ brief, offer, cta, tone = 'friendly', language = 'en', variants = 3, audience } = {}) {
  if (!brief && !offer) throw new Error('brief or offer is required');
  const n = Math.max(1, Math.min(6, variants));
  const label = (i) => `Variant ${String.fromCharCode(65 + i)}`; // A, B, C...

  if (!processPrompt) {
    const texts = templateFallback({ brief, offer, cta, n, language });
    return { variants: texts.map((t, i) => ({ label: label(i), text: t, lint: lint(t) })), source: 'fallback' };
  }

  const prompt = [
    'You are a WhatsApp marketing copywriter. Write short, high-converting broadcast messages.',
    `${LANG_INSTRUCTION[language] || LANG_INSTRUCTION.en}`,
    `Tone: ${tone}.`,
    audience ? `Audience segment: ${audience}.` : '',
    `Campaign brief: ${brief || offer}`,
    offer ? `Offer: ${offer}` : '',
    cta ? `Call to action: ${cta}` : '',
    '',
    `Write ${n} DISTINCT variants for A/B testing. Rules:`,
    '- Each variant 1-3 short lines, WhatsApp-native.',
    '- Include a personalization merge field {{name}} naturally.',
    '- Avoid spammy words (free, winner, 100%, click here, act now) and ALL-CAPS — they get numbers banned.',
    '- At most one link. Keep emojis tasteful (<=3).',
    '- Add a soft opt-out hint where natural (e.g. "Reply STOP to opt out").',
    `Label each as "Variant A", "Variant B", etc. Return ONLY the variants.`
  ].filter(Boolean).join('\n');

  try {
    const raw = await processPrompt(prompt, { model: MODEL(), languageCode: language });
    const looksUnconfigured = typeof raw === 'string' && /\[AI Assist\]|Connect your .* in the environment/i.test(raw);
    const parts = splitVariants(raw, n);
    if (looksUnconfigured || !parts.length) {
      const texts = templateFallback({ brief, offer, cta, n, language });
      return { variants: texts.map((t, i) => ({ label: label(i), text: t, lint: lint(t) })), source: 'fallback' };
    }
    return { variants: parts.map((t, i) => ({ label: label(i), text: t, lint: lint(t) })), source: 'ollama' };
  } catch (err) {
    console.warn('[campaignCopy] generate failed:', err.message);
    const texts = templateFallback({ brief, offer, cta, n, language });
    return { variants: texts.map((t, i) => ({ label: label(i), text: t, lint: lint(t) })), source: 'fallback' };
  }
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL() };
}

module.exports = { generate, lint, health, _internal: { splitVariants, templateFallback, SPAM_WORDS } };
