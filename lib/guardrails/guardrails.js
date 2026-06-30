// lib/guardrails/guardrails.js
// ────────────────────────────────────────────────────────────────────
// AI Safety Guardrails. A customer-facing AI that can take orders and answer
// freely needs a seatbelt. This wraps every AI exchange with:
//   INBOUND  — strip prompt-injection attempts ("ignore previous instructions",
//              fake system tags, role-hijacks) and redact PII before logging.
//   OUTBOUND — block replies that leak system/prompt text or secrets, contain
//              profanity, over-promise ("guaranteed", "100% refund always"), or
//              drift off-topic; optional local-model moderation pass.
//
// Deterministic rules are always on (fast, explainable). An optional AI
// moderation call (self-hosted Ollama) adds a second opinion for borderline
// text. `guardedReply()` wraps any async generator fn so existing features get
// protected with a one-line change. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

let processPrompt;
try { ({ processPrompt } = require('../../ai/aiBrain')); }
catch (e) { console.warn('[guardrails] aiBrain unavailable:', e.message); processPrompt = null; }

const MODEL = () => process.env.GUARDRAILS_MODEL || process.env.SUPPORT_AGENT_MODEL || 'qwen2.5:32b';

// ── Prompt-injection detection ────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore (?:all |the |your )?(?:previous|above|prior) (?:instructions|prompts?|rules)/i,
  /disregard (?:all |the |your )?(?:previous|above|prior)/i,
  /forget (?:everything|all|your instructions|the above)/i,
  /you are now (?:a |an )?/i,
  /act as (?:if you are |a |an )?/i,
  /from now on,? (?:you|ignore|act)/i,
  /\bsystem prompt\b/i,
  /\bdeveloper mode\b/i,
  /\b(?:DAN|jailbreak)\b/i,
  /reveal (?:your |the )?(?:system|prompt|instructions|rules)/i,
  /print (?:your |the )?(?:system|prompt|instructions)/i,
  /<\/?(?:system|assistant|user)>/i,
  /\[\/?(?:INST|SYS|system)\]/i,
  /```(?:system|prompt)/i
];

function detectInjection(text = '') {
  const hits = [];
  for (const re of INJECTION_PATTERNS) { if (re.test(text)) hits.push(re.source.slice(0, 40)); }
  return { injected: hits.length > 0, hits };
}

/**
 * Sanitize inbound text: neutralize injection markers so they can't leak into a
 * prompt as instructions. We keep the user's actual question, just defang the
 * control-ish bits. Returns { clean, injected, hits }.
 */
function sanitizeInbound(text = '') {
  const det = detectInjection(text);
  let clean = String(text);
  // strip fake role/system tags
  clean = clean.replace(/<\/?(?:system|assistant|user)>/gi, ' ')
               .replace(/\[\/?(?:INST|SYS|system)\]/gi, ' ')
               .replace(/```(?:system|prompt)[\s\S]*?```/gi, ' ');
  return { clean: clean.trim(), injected: det.injected, hits: det.hits };
}

// ── PII redaction ────────────────────────────────────────────
const PII = [
  { tag: '[CARD]', re: /\b(?:\d[ -]?){13,16}\b/g },
  { tag: '[EMAIL]', re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g },
  { tag: '[IBAN]', re: /\b[A-Z]{2}\d{2}[A-Z0-9]{10,30}\b/g },
  { tag: '[CNIC]', re: /\b\d{5}-?\d{7}-?\d\b/g }, // Pakistani CNIC
  { tag: '[PHONE]', re: /\b(?:\+?\d[\d -]{8,14}\d)\b/g }
];

function redactPII(text = '') {
  let out = String(text);
  const found = [];
  for (const p of PII) { if (p.re.test(out)) { found.push(p.tag); } out = out.replace(p.re, p.tag); }
  return { redacted: out, found };
}

// ── Outbound checks ───────────────────────────────────────────
const LEAK_PATTERNS = [
  /you are (?:the )?(?:customer support agent|a helpful ai|an? ai (?:assistant|language model))/i,
  /system prompt|my instructions are|i was instructed|as an ai language model/i,
  /\bAPI[_ ]?KEY\b|sk-[a-z0-9]{10,}|bearer [a-z0-9._-]{10,}/i,
  /KNOWLEDGE BASE \(|PRODUCT CATALOG:|CONVERSATION SO FAR:/i // our own prompt scaffolding
];
const OVERPROMISE = [/100%\s*(?:guarantee|guaranteed|refund)/i, /guaranteed (?:profit|returns?|results?)/i, /always (?:free|refunded)/i, /lifetime (?:guarantee|warranty) on everything/i];
const PROFANITY = ['fuck', 'shit', 'bitch', 'asshole', 'bastard']; // light list; extend per policy

function checkOutbound(text = '') {
  const t = String(text);
  const issues = [];
  let blocked = false;

  for (const re of LEAK_PATTERNS) { if (re.test(t)) { issues.push('possible system/secret leak'); blocked = true; break; } }
  for (const re of OVERPROMISE) { if (re.test(t)) { issues.push('over-promising/compliance risk'); break; } }
  const lower = t.toLowerCase();
  if (PROFANITY.some(w => lower.includes(w))) { issues.push('profanity'); blocked = true; }
  if (detectInjection(t).injected) { issues.push('echoed injection text'); }

  return { ok: !blocked, blocked, issues };
}

// Safe replacement when an outbound message is blocked.
function safeReplacement() {
  return 'Thanks for your message! Let me get a team member to help you with this. \ud83d\ude4f';
}

// ── Optional AI moderation (second opinion) ───────────────────────────
async function moderateAI(text) {
  if (!processPrompt) return null;
  const prompt = [
    'You are a content safety check for a shop\'s WhatsApp auto-reply. Is the following message SAFE to send to a customer?',
    'Unsafe = leaks internal/system text, shares secrets, hate/harassment/sexual content, illegal advice, or makes guarantees a shop cannot keep.',
    'Answer with ONLY "SAFE" or "UNSAFE: <short reason>".',
    '',
    `Message: "${text}"`
  ].join('\n');
  try {
    const raw = await processPrompt(prompt, { model: MODEL() });
    if (!raw || /\[AI Assist\]|Connect your .* in the environment/i.test(raw)) return null;
    const verdict = String(raw).trim();
    if (/^unsafe/i.test(verdict)) return { safe: false, reason: verdict.replace(/^unsafe:?\s*/i, '') };
    return { safe: true };
  } catch { return null; }
}

/**
 * Full inbound guard: sanitize + flag injection + produce a redacted copy for logs.
 */
function guardInbound(text = '') {
  const s = sanitizeInbound(text);
  const r = redactPII(s.clean);
  return { clean: s.clean, redactedForLog: r.redacted, injected: s.injected, injectionHits: s.hits, pii: r.found };
}

/**
 * Full outbound guard. Deterministic check first; optional AI moderation if
 * `useAI` and the deterministic pass didn't already block.
 * @returns {Promise<{ ok, text, blocked, issues, replaced }>}
 */
async function guardOutbound(text = '', { useAI = false } = {}) {
  const det = checkOutbound(text);
  let blocked = det.blocked;
  let issues = [...det.issues];

  if (!blocked && useAI) {
    const mod = await moderateAI(text);
    if (mod && mod.safe === false) { blocked = true; issues.push(`ai-moderation: ${mod.reason}`); }
  }

  if (blocked) return { ok: false, text: safeReplacement(), blocked: true, issues, replaced: true };
  return { ok: true, text, blocked: false, issues, replaced: false };
}

/**
 * Wrap any async reply generator with guardrails. Sanitizes the inbound message,
 * calls your generator with the CLEAN text, then guards the output.
 * @param {(cleanText:string, ctx:object)=>Promise<string>} generateFn
 * @returns {(rawText:string, ctx?:object)=>Promise<{ reply, guarded }>}
 */
function guardedReply(generateFn, { useAI = false } = {}) {
  return async function (rawText, ctx = {}) {
    const inbound = guardInbound(rawText);
    let raw;
    try { raw = await generateFn(inbound.clean, { ...ctx, inboundGuard: inbound }); }
    catch (e) { return { reply: safeReplacement(), guarded: { error: e.message, inbound } }; }
    const out = await guardOutbound(typeof raw === 'string' ? raw : (raw && raw.reply) || '', { useAI });
    return { reply: out.text, guarded: { inbound, outbound: out } };
  };
}

function health() {
  return { ok: true, brainBridge: Boolean(processPrompt), model: MODEL(), injectionPatterns: INJECTION_PATTERNS.length, piiTypes: PII.map(p => p.tag) };
}

module.exports = {
  guardInbound, guardOutbound, guardedReply,
  sanitizeInbound, detectInjection, redactPII, checkOutbound, health,
  _internal: { INJECTION_PATTERNS, LEAK_PATTERNS, safeReplacement }
};
