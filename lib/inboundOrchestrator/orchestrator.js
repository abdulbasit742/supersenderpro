// lib/inboundOrchestrator/orchestrator.js
// ────────────────────────────────────────────────────────────────────
// AI Inbound Orchestrator. The capstone: one function that turns a raw inbound
// WhatsApp message into a final, ready-to-send reply by chaining the whole AI
// suite in the right order. Every stage is OPTIONAL and best-effort — each
// dependency is loaded via try/require, so the orchestrator runs with whatever
// subset of features is installed and simply skips the rest.
//
// Pipeline (text path):
//   guardrails.inbound (sanitize + injection defense)
//     → transcription (#7) if voice note  /  vision search (#23) if image
//     → intent router (#17) classify + tag
//     → translation inbound (#15) to agent language (remembers customer lang)
//     → support agent (#1) generate reply
//     → order extraction (#25) if buying intent  (+ cart-recovery stop on confirm)
//     → translation outbound (#15) back to customer language
//     → guardrails.outbound (moderation)
//     → voice reply (#35) if the customer used voice
//     → send-time engagement log (#21)
//
// File-backed run log. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Best-effort optional dependencies — the whole point is graceful composition.
function opt(p) { try { return require(p); } catch { return null; } }

const guardrails    = opt('../guardrails/guardrails');
const intentRouter  = opt('../intentRouter/intentRouter');
const translator    = opt('../translation/translator');
const supportAgent  = opt('../../ai/agents/supportAgent');
const orderExtractor = opt('../orderExtraction/orderExtractor');
const cartRecovery  = opt('../cartRecovery/cartRecovery');
const voiceNoteAI   = opt('../voiceNoteAI/voiceNoteAI');
const visionSearch  = opt('../visionSearch/visionSearch');
const voiceReply    = opt('../voiceReply/voiceReply');
const sendTime      = opt('../sendTime/sendTimeOptimizer');

const DATA_DIR = path.join(__dirname, '..', '..', 'data', 'orchestrator');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const runsFile = path.join(DATA_DIR, '_runs.json');
function logRun(run) {
  try {
    const all = fs.existsSync(runsFile) ? JSON.parse(fs.readFileSync(runsFile, 'utf8')) : [];
    all.push(run);
    fs.writeFileSync(runsFile, JSON.stringify(all.slice(-500), null, 2));
  } catch (e) { console.error('[orchestrator] log failed:', e.message); }
  return run;
}

const AGENT_LANG = () => process.env.AGENT_LANGUAGE || 'en';
const CONFIRM_RE = /^\s*(confirm|haan confirm|confirm order|yes confirm|ji confirm)\s*$/i;

/**
 * Handle one inbound message end-to-end.
 * @param {object} args
 * @param {string} args.storeId
 * @param {string} args.phone
 * @param {string} [args.text]            - text message (or caption)
 * @param {Buffer} [args.audioBuffer]     - voice note audio (optional)
 * @param {Buffer} [args.imageBuffer]     - image (optional)
 * @param {boolean} [args.wantVoiceReply] - synthesize a spoken reply (defaults true if audio came in)
 * @param {boolean} [args.useAIModeration]
 * @returns {Promise<object>} a full trace + the final reply
 */
async function handleInbound({ storeId = 'default_store', phone, text = '', audioBuffer, imageBuffer, wantVoiceReply, useAIModeration = false } = {}) {
  if (!phone) throw new Error('phone is required');
  const id = crypto.randomUUID().slice(0, 12);
  const trace = { stages: [], skipped: [] };
  const mark = (stage, info) => trace.stages.push({ stage, ...info });
  const skip = (stage, why) => trace.skipped.push({ stage, why });

  let inputType = 'text';
  let workingText = String(text || '');
  let customerLang = null;

  // 0. Voice note -> transcript (#7)
  if (audioBuffer && audioBuffer.length) {
    inputType = 'voice';
    if (voiceNoteAI && voiceNoteAI.transcribe) {
      const t = await voiceNoteAI.transcribe(audioBuffer, { filename: 'voice.ogg' });
      if (t.text) { workingText = t.text; customerLang = t.language; mark('transcribe', { ok: true, chars: t.text.length, lang: t.language, source: t.source }); }
      else { mark('transcribe', { ok: false }); }
    } else skip('transcribe', 'voiceNoteAI not installed');
  }

  // 0b. Image -> vision product search (#23). Produces an answer directly.
  let visionResult = null;
  if (imageBuffer && imageBuffer.length) {
    inputType = 'image';
    if (visionSearch && visionSearch.searchByImage) {
      visionResult = await visionSearch.searchByImage({ storeId, buffer: imageBuffer, hint: workingText, phone });
      mark('vision', { ok: true, matches: (visionResult.matches || []).length, source: visionResult.source });
    } else skip('vision', 'visionSearch not installed');
  }

  // 1. Guardrails inbound (sanitize + injection defense + PII redact for logs)
  let inboundGuard = null;
  if (guardrails && guardrails.guardInbound) {
    inboundGuard = guardrails.guardInbound(workingText);
    workingText = inboundGuard.clean;
    mark('guard_inbound', { injected: inboundGuard.injected, pii: inboundGuard.pii });
  } else skip('guard_inbound', 'guardrails not installed');

  // 2. Intent routing + tagging (#17)
  let routing = null;
  if (intentRouter && intentRouter.route && workingText) {
    try { routing = await intentRouter.route({ storeId, text: workingText }); mark('route', { intent: routing.intent, queue: routing.routing.queue, priority: routing.routing.priority, tags: routing.tags }); }
    catch (e) { skip('route', e.message); }
  } else skip('route', intentRouter ? 'no text' : 'intentRouter not installed');

  // 3. Inbound translation -> agent language (#15); remembers customer language
  let agentText = workingText;
  if (translator && translator.translateInbound && workingText) {
    try {
      const tr = await translator.translateInbound({ storeId, phone, text: workingText, agentLang: AGENT_LANG() });
      agentText = tr.text; customerLang = customerLang || tr.customerLang;
      mark('translate_in', { from: tr.customerLang, to: tr.agentLang, source: tr.source });
    } catch (e) { skip('translate_in', e.message); }
  } else skip('translate_in', translator ? 'no text' : 'translator not installed');

  // 4. CONFIRM shortcut -> confirm order + stop cart recovery (#25/#31)
  let confirmed = null;
  if (CONFIRM_RE.test(workingText) && orderExtractor && orderExtractor.confirmOrder) {
    confirmed = orderExtractor.confirmOrder({ storeId, phone });
    mark('order_confirm', confirmed);
    if (confirmed.confirmed && cartRecovery && cartRecovery.markRecovered) {
      try { cartRecovery.markRecovered({ storeId, phone }); mark('cart_recovered', { ok: true }); } catch (e) { skip('cart_recovered', e.message); }
    }
  }

  // 5. Generate the reply
  let replyAgentLang;
  let agentMeta = {};
  if (visionResult && visionResult.answer && inputType === 'image') {
    replyAgentLang = visionResult.answer; // image path answers directly
    mark('reply', { via: 'vision' });
  } else if (confirmed && confirmed.confirmed) {
    replyAgentLang = `Your order is confirmed! \u2705 ${confirmed.total ? `Total: ${confirmed.total}. ` : ''}We'll process it now.`;
    mark('reply', { via: 'order_confirm' });
  } else if (supportAgent && supportAgent.handleMessage && agentText) {
    try {
      const r = await supportAgent.handleMessage({ storeId, phone, message: agentText });
      replyAgentLang = r.reply; agentMeta = { intent: r.intent, shouldEscalate: r.shouldEscalate, order: r.order, source: r.source };
      mark('agent', { intent: r.intent, escalate: r.shouldEscalate, source: r.source });
    } catch (e) { skip('agent', e.message); }
  } else skip('agent', supportAgent ? 'no text' : 'supportAgent not installed');

  if (!replyAgentLang) replyAgentLang = 'Thanks for your message! Our team will get back to you shortly.';

  // 6. Order extraction on buying intent (#25) — draft, don't auto-confirm
  let orderDraft = null;
  const buying = (routing && routing.intent === 'sales') || (agentMeta.intent === 'order');
  if (buying && !confirmed && orderExtractor && orderExtractor.extractOrder && workingText) {
    try {
      orderDraft = await orderExtractor.extractOrder({ storeId, phone, text: workingText });
      mark('order_extract', { items: orderDraft.order.items.length, missing: orderDraft.missing });
      // if we have a clean order summary, prefer guiding the customer with it
      if (orderDraft.order.items.length && orderDraft.summary) replyAgentLang = orderDraft.summary;
    } catch (e) { skip('order_extract', e.message); }
  }

  // 7. Outbound translation -> customer language (#15)
  let finalText = replyAgentLang;
  if (translator && translator.translateOutbound) {
    try {
      const tr = await translator.translateOutbound({ storeId, phone, text: replyAgentLang, agentLang: AGENT_LANG() });
      finalText = tr.text;
      mark('translate_out', { to: tr.customerLang, source: tr.source });
    } catch (e) { skip('translate_out', e.message); }
  } else skip('translate_out', 'translator not installed');

  // 8. Guardrails outbound (moderation)
  if (guardrails && guardrails.guardOutbound) {
    const out = await guardrails.guardOutbound(finalText, { useAI: useAIModeration });
    if (out.blocked) { finalText = out.text; mark('guard_outbound', { blocked: true, issues: out.issues }); }
    else mark('guard_outbound', { blocked: false });
  } else skip('guard_outbound', 'guardrails not installed');

  // 9. Optional voice reply (#35) — default on when the customer sent voice
  let voice = null;
  const doVoice = wantVoiceReply === undefined ? (inputType === 'voice') : wantVoiceReply;
  if (doVoice && voiceReply && voiceReply.speak) {
    try {
      const v = await voiceReply.speak({ storeId, phone, text: finalText, language: customerLang });
      voice = v; mark('voice_reply', { mode: v.mode, file: v.file || null });
    } catch (e) { skip('voice_reply', e.message); }
  } else if (doVoice) skip('voice_reply', 'voiceReply not installed');

  // 10. Engagement log for send-time learning (#21)
  if (sendTime && sendTime.logEngagement) {
    try { sendTime.logEngagement({ storeId, phone }); mark('engagement', { ok: true }); } catch (e) { skip('engagement', e.message); }
  } else skip('engagement', 'sendTime not installed');

  const run = {
    id, storeId, phone, inputType,
    transcript: inputType === 'voice' ? workingText : null,
    intent: routing ? routing.intent : (agentMeta.intent || null),
    tags: routing ? routing.tags : [],
    routing: routing ? routing.routing : null,
    shouldEscalate: Boolean(agentMeta.shouldEscalate),
    order: orderDraft ? { items: orderDraft.order.items, missing: orderDraft.missing, total: orderDraft.total } : null,
    confirmed: confirmed && confirmed.confirmed || false,
    reply: { text: finalText, mode: voice && voice.mode === 'voice' ? 'voice' : 'text', voiceFile: voice && voice.file || null, voiceUrl: voice && voice.url || null },
    customerLang, trace, ts: Date.now()
  };
  logRun(run);
  return run;
}

function listRuns({ storeId, phone, limit = 50 } = {}) {
  let runs = [];
  try { runs = fs.existsSync(runsFile) ? JSON.parse(fs.readFileSync(runsFile, 'utf8')) : []; } catch { runs = []; }
  runs = runs.slice().reverse();
  if (storeId) runs = runs.filter(r => r.storeId === storeId);
  if (phone) runs = runs.filter(r => r.phone === phone);
  return runs.slice(0, limit);
}

function installed() {
  return {
    guardrails: Boolean(guardrails), intentRouter: Boolean(intentRouter), translator: Boolean(translator),
    supportAgent: Boolean(supportAgent), orderExtractor: Boolean(orderExtractor), cartRecovery: Boolean(cartRecovery),
    voiceNoteAI: Boolean(voiceNoteAI), visionSearch: Boolean(visionSearch), voiceReply: Boolean(voiceReply), sendTime: Boolean(sendTime)
  };
}

function health() { return { ok: true, agentLanguage: AGENT_LANG(), installed: installed() }; }

module.exports = { handleInbound, listRuns, installed, health, _internal: { CONFIRM_RE } };
