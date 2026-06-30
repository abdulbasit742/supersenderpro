// lib/inboundPipeline/inboundPipeline.js
// ────────────────────────────────────────────────────────────────────
// AI Inbound Pipeline — the capstone. The suite has many features; the WhatsApp
// engine should NOT have to call each one. This is the single entry point that
// orchestrates them for one inbound message, in the right order, each stage
// optional and degrading gracefully:
//
//   1. guardrails (#33)        sanitize inbound, defang injection, redact PII
//   2. media:
//        voice note  -> voiceNoteAI (#7) transcribe to text
//        image       -> visionSearch (#23) describe + catalog match
//   3. translation (#15)       customer language -> agent/store language (inbound)
//   4. intent router (#17)     classify + auto-tags + routing target
//   5. support agent (#1)      generate the reply (RAG #3 if wired)
//   6. order extraction (#25)  if buying intent, draft a structured order
//   7. guardrails outbound     moderate the reply before sending
//   8. translation (outbound)  agent language -> customer language
//   9. voice reply (#35)       optionally synthesize a spoken reply
//  10. telemetry              lead-intel rescoring hint + send-time engagement
//
// Each dependency is loaded best-effort; missing ones are simply skipped, so the
// pipeline runs with whatever subset of the suite is installed. Returns a single
// structured result the engine acts on. Zero new npm dependencies.
// ────────────────────────────────────────────────────────────────────

function tryRequire(p) { try { return require(p); } catch { return null; } }

const guardrails   = tryRequire('../guardrails/guardrails');
const voiceNoteAI  = tryRequire('../voiceNoteAI/voiceNoteAI');
const visionSearch = tryRequire('../visionSearch/visionSearch');
const translator   = tryRequire('../translation/translator');
const intentRouter = tryRequire('../intentRouter/intentRouter');
const supportAgent = tryRequire('../../ai/agents/supportAgent');
const orderExtractor = tryRequire('../orderExtraction/orderExtractor');
const voiceReply   = tryRequire('../voiceReply/voiceReply');
const sendTime     = tryRequire('../sendTime/sendTimeOptimizer');
const leadIntel    = tryRequire('../leadIntel/leadIntel');

const AGENT_LANG = () => process.env.AGENT_LANGUAGE || 'en';

/**
 * Orchestrate one inbound WhatsApp message through the suite.
 * @param {object} args
 * @param {string} args.phone                       (required)
 * @param {string} [args.storeId='default_store']
 * @param {string} [args.text]                      text message body / caption
 * @param {('text'|'voice'|'image')} [args.type='text']
 * @param {Buffer} [args.media]                      audio/image bytes when type != text
 * @param {string} [args.customerName]
 * @param {object} [args.options]                    { voiceReply?:bool, translate?:bool }
 * @returns {Promise<object>} a structured result for the WhatsApp engine
 */
async function handleInbound({ phone, storeId = 'default_store', text = '', type = 'text', media = null, customerName, options = {} } = {}) {
  if (!phone) throw new Error('phone is required');
  const trace = [];
  const result = { phone, storeId, type, reply: null, replyMode: 'text', tags: [], routing: null, order: null, shouldEscalate: false, trace };

  // ── 1. media -> text ─────────────────────────────────────────
  let messageText = text || '';
  if (type === 'voice' && media && voiceNoteAI) {
    try {
      const t = await voiceNoteAI.transcribe(media, { filename: 'voice.ogg' });
      messageText = t.text || messageText;
      result.transcript = t.text || null;
      trace.push({ stage: 'voice_transcribe', ok: Boolean(t.text), source: t.source });
    } catch (e) { trace.push({ stage: 'voice_transcribe', ok: false, error: e.message }); }
  } else if (type === 'image' && media && visionSearch) {
    try {
      const v = await visionSearch.searchByImage({ storeId, buffer: media, hint: text, phone });
      result.vision = { matches: v.matches, answer: v.answer };
      // if the customer didn't type anything, use the vision answer as a basis
      if (!messageText) messageText = text || (v.description ? (v.description.keywords || []).join(' ') : '');
      trace.push({ stage: 'vision_search', ok: true, matches: (v.matches || []).length });
    } catch (e) { trace.push({ stage: 'vision_search', ok: false, error: e.message }); }
  }

  // ── 2. guardrails inbound ─────────────────────────────────────
  let inboundGuard = null;
  if (guardrails && messageText) {
    try { inboundGuard = guardrails.guardInbound(messageText); messageText = inboundGuard.clean || messageText; trace.push({ stage: 'guardrails_in', ok: true, injected: inboundGuard.injected }); }
    catch (e) { trace.push({ stage: 'guardrails_in', ok: false, error: e.message }); }
  }

  // ── 3. translation inbound -> agent language ─────────────────────────
  let customerLang = null;
  let agentText = messageText;
  const doTranslate = options.translate !== false && translator;
  if (doTranslate && messageText) {
    try {
      const inb = await translator.translateInbound({ storeId, phone, text: messageText, agentLang: AGENT_LANG() });
      customerLang = inb.customerLang; agentText = inb.text || messageText;
      trace.push({ stage: 'translate_in', ok: true, from: inb.customerLang, to: inb.agentLang, source: inb.source });
    } catch (e) { trace.push({ stage: 'translate_in', ok: false, error: e.message }); }
  }

  // ── 4. intent routing + tags ───────────────────────────────────
  if (intentRouter && messageText) {
    try {
      const r = await intentRouter.route({ storeId, text: messageText });
      result.intent = r.intent; result.tags = r.tags || []; result.routing = r.routing || null;
      trace.push({ stage: 'intent_route', ok: true, intent: r.intent, method: r.method });
    } catch (e) { trace.push({ stage: 'intent_route', ok: false, error: e.message }); }
  }

  // ── 5. support agent reply (operates in agent language) ─────────────────
  let replyText = '';
  if (supportAgent && typeof supportAgent.handleMessage === 'function' && (agentText || messageText)) {
    try {
      const a = await supportAgent.handleMessage({ storeId, phone, message: agentText || messageText, customerName });
      replyText = a.reply || '';
      result.shouldEscalate = Boolean(a.shouldEscalate);
      result.escalationReason = a.escalationReason || null;
      result.agentIntent = a.intent;
      if (a.order) result.order = a.order;
      trace.push({ stage: 'support_agent', ok: true, escalate: result.shouldEscalate, source: a.source });
    } catch (e) { trace.push({ stage: 'support_agent', ok: false, error: e.message }); }
  }

  // ── 6. order extraction (if buying intent / order-ish) ───────────────────
  const orderish = result.intent === 'sales' || result.agentIntent === 'order';
  if (orderExtractor && orderish && (agentText || messageText)) {
    try {
      const ex = await orderExtractor.extractOrder({ storeId, phone, text: agentText || messageText });
      if (ex.order && ex.order.items && ex.order.items.length) {
        result.order = ex.order; result.orderSummary = ex.summary; result.orderMissing = ex.missing;
      }
      trace.push({ stage: 'order_extract', ok: true, items: ex.order && ex.order.items ? ex.order.items.length : 0 });
    } catch (e) { trace.push({ stage: 'order_extract', ok: false, error: e.message }); }
  }

  // ── 7. guardrails outbound ───────────────────────────────────
  if (guardrails && replyText) {
    try { const out = await guardrails.guardOutbound(replyText); if (out.replaced) result.shouldEscalate = true; replyText = out.text; trace.push({ stage: 'guardrails_out', ok: true, blocked: out.blocked }); }
    catch (e) { trace.push({ stage: 'guardrails_out', ok: false, error: e.message }); }
  }

  // ── 8. translation outbound -> customer language ───────────────────────
  if (doTranslate && replyText && customerLang && customerLang !== AGENT_LANG()) {
    try { const outT = await translator.translateOutbound({ storeId, phone, text: replyText, agentLang: AGENT_LANG() }); replyText = outT.text || replyText; trace.push({ stage: 'translate_out', ok: true, to: outT.customerLang, source: outT.source }); }
    catch (e) { trace.push({ stage: 'translate_out', ok: false, error: e.message }); }
  }

  result.reply = replyText || null;

  // ── 9. optional voice reply ────────────────────────────────────
  // Speak back if the customer sent a voice note, or caller asked for it.
  const wantVoice = options.voiceReply === true || (type === 'voice' && options.voiceReply !== false);
  if (wantVoice && voiceReply && replyText) {
    try {
      const spoken = await voiceReply.speak({ storeId, phone, text: replyText, language: customerLang || undefined });
      if (spoken.mode === 'voice') { result.replyMode = 'voice'; result.voiceFile = spoken.file; result.voiceUrl = spoken.url; }
      trace.push({ stage: 'voice_reply', ok: true, mode: spoken.mode });
    } catch (e) { trace.push({ stage: 'voice_reply', ok: false, error: e.message }); }
  }

  // ── 10. telemetry: log engagement (improves send-time) + lead rescoring hint ──
  if (sendTime && typeof sendTime.logEngagement === 'function') {
    try { sendTime.logEngagement({ storeId, phone }); trace.push({ stage: 'engagement_log', ok: true }); }
    catch (e) { trace.push({ stage: 'engagement_log', ok: false, error: e.message }); }
  }
  if (leadIntel && typeof leadIntel.scoreLead === 'function') {
    // fire-and-forget rescoring (deterministic part is cheap; skip AI enrichment here)
    leadIntel.scoreLead({ storeId, phone, enrichAI: false }).then(() => {}).catch(() => {});
    trace.push({ stage: 'lead_rescore', ok: true });
  }

  result.customerLang = customerLang;
  return result;
}

function wiredFeatures() {
  return {
    guardrails: Boolean(guardrails), voiceNoteAI: Boolean(voiceNoteAI), visionSearch: Boolean(visionSearch),
    translation: Boolean(translator), intentRouter: Boolean(intentRouter), supportAgent: Boolean(supportAgent && supportAgent.handleMessage),
    orderExtraction: Boolean(orderExtractor), voiceReply: Boolean(voiceReply), sendTime: Boolean(sendTime), leadIntel: Boolean(leadIntel)
  };
}

function health() { return { ok: true, agentLanguage: AGENT_LANG(), features: wiredFeatures() }; }

module.exports = { handleInbound, wiredFeatures, health };
