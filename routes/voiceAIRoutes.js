// routes/voiceAIRoutes.js — Express router for the Voice AI Command Center.
// Mounted at /api/voice-ai. Everything is dry-run + approval-protected by default.
// No endpoint returns secret values or full PII — only masked previews + booleans.

const express = require('express');
const router = express.Router();

const V = require('../lib/voiceAI');

function safeHandler(fn) {
  return async (req, res) => {
    try {
      const out = await fn(req, res);
      if (out !== undefined && !res.headersSent) res.json(out);
    } catch (e) {
      // Never crash the server because a voice action failed.
      res.status(500).json({ ok: false, error: e.message || 'voice_ai_error' });
    }
  };
}

// ---- Status / providers ----
router.get('/voice-ai/status', safeHandler(() => {
  const c = V.config;
  return {
    ok: true,
    enabled: c.enabled,
    dryRun: c.dryRun,
    requireApproval: c.requireApproval,
    live: { tts: c.effective.liveTTS, stt: c.effective.liveSTT, send: c.effective.liveSend, voiceCloning: c.effective.voiceCloning },
    defaultProvider: c.defaultProvider,
    defaultLanguage: c.defaultLanguage,
    pendingApprovals: V.voiceQueue.pending().length,
  };
}));

router.get('/voice-ai/providers', safeHandler(() => ({ ok: true, providers: V.providerRegistry.list() })));
router.get('/voice-ai/voices', safeHandler(() => ({ ok: true, voices: V.providerRegistry.voices() })));
router.get('/voice-ai/settings-safe', safeHandler(() => {
  const c = V.config;
  // Only safe, non-secret config is exposed.
  return { ok: true, settings: {
    enabled: c.enabled, dryRun: c.dryRun, requireApproval: c.requireApproval,
    allowLiveTTS: c.allowLiveTTS, allowLiveSTT: c.allowLiveSTT, allowVoiceCloning: c.allowVoiceCloning,
    allowLiveSend: c.allowLiveSend, storeAudio: c.storeAudio, storeTranscripts: c.storeTranscripts,
    storeText: c.storeText, defaultProvider: c.defaultProvider, defaultLanguage: c.defaultLanguage,
    maxQueue: c.maxQueue, cleanupDays: c.cleanupDays,
  } };
}));

// ---- TTS ----
router.post('/voice-ai/tts/preview', safeHandler(async (req) => ({ ok: true, result: await V.ttsEngine.previewOnly(req.body || {}) })));
router.post('/voice-ai/tts/generate', safeHandler(async (req) => ({ ok: true, result: await V.ttsEngine.generate(req.body || {}) })));
router.post('/voice-ai/tts/voiceover', safeHandler(async (req) => ({ ok: true, result: await V.ttsEngine.previewOnly({ ...(req.body || {}), purpose: 'voiceover' }) })));

// ---- STT ----
router.post('/voice-ai/stt/preview', safeHandler(async (req) => ({ ok: true, result: await V.sttEngine.previewOnly(req.body || {}) })));
router.post('/voice-ai/stt/transcribe', safeHandler(async (req) => ({ ok: true, result: await V.sttEngine.transcribe(req.body || {}) })));

// ---- Conversations ----
router.get('/voice-ai/conversations', safeHandler(() => ({ ok: true, conversations: V.conversationManager.list() })));
router.post('/voice-ai/conversations', safeHandler((req) => ({ ok: true, conversation: V.conversationManager.create(req.body || {}) })));
router.get('/voice-ai/conversations/:id', safeHandler((req) => {
  const c = V.conversationManager.get(req.params.id);
  return c ? { ok: true, conversation: c } : { ok: false, error: 'not_found' };
}));
router.put('/voice-ai/conversations/:id', safeHandler((req) => {
  const c = V.conversationManager.get(req.params.id);
  if (!c) return { ok: false, error: 'not_found' };
  if (req.body && req.body.transcript) V.conversationManager.attachTranscript(req.params.id, req.body.transcript, { language: req.body.language });
  return { ok: true, conversation: V.conversationManager.get(req.params.id) };
}));
router.post('/voice-ai/conversations/:id/summarize', safeHandler((req) => ({ ok: true, conversation: V.conversationManager.summarize(req.params.id, (req.body || {}).transcript) })));
router.post('/voice-ai/conversations/:id/reply-draft', safeHandler((req) => ({ ok: true, conversation: V.conversationManager.draftReply(req.params.id, req.body || {}) })));

// ---- Queue ----
router.get('/voice-ai/queue', safeHandler(() => ({ ok: true, queue: V.voiceQueue.all() })));
router.post('/voice-ai/queue', safeHandler((req) => V.voiceQueue.createDraft(req.body || {})));
router.post('/voice-ai/queue/:id/approve', safeHandler((req) => ({ ok: true, item: V.voiceQueue.approve(req.params.id, (req.body || {}).approvedBy || 'admin') })));
router.post('/voice-ai/queue/:id/reject', safeHandler((req) => ({ ok: true, item: V.voiceQueue.reject(req.params.id, (req.body || {}).by || 'admin', (req.body || {}).reason) })));
router.post('/voice-ai/queue/:id/schedule', safeHandler((req) => ({ ok: true, item: V.voiceQueue.schedule(req.params.id, (req.body || {}).scheduledAt) })));
router.post('/voice-ai/queue/:id/cancel', safeHandler((req) => ({ ok: true, item: V.voiceQueue.cancel(req.params.id) })));
router.post('/voice-ai/queue/:id/retry', safeHandler((req) => ({ ok: true, item: V.voiceQueue.retry(req.params.id) })));

// ---- Consent ----
router.get('/voice-ai/consent/:subjectId', safeHandler((req) => ({ ok: true, consent: V.consentStore.get(req.params.subjectId) })));
router.post('/voice-ai/consent/:subjectId', safeHandler((req) => ({ ok: true, consent: V.consentStore.set(req.params.subjectId, req.body || {}, 'api') })));
router.post('/voice-ai/opt-out/:subjectId', safeHandler((req) => ({ ok: true, consent: V.consentStore.optOut(req.params.subjectId, 'api') })));

// ---- Templates ----
router.get('/voice-ai/templates', safeHandler((req) => ({ ok: true, templates: V.templates.list({ language: req.query.language, category: req.query.category }) })));
router.post('/voice-ai/templates/render', safeHandler((req) => ({ ok: true, result: V.templateRenderer.render((req.body || {}).templateId, (req.body || {}).variables || {}) })));

// ---- Adapters ----
router.post('/voice-ai/whatsapp/voice-note', safeHandler(async (req) => ({ ok: true, result: await V.whatsappVoiceAdapter.onVoiceNote(req.body || {}) })));
router.post('/voice-ai/whatsapp/reply-draft', safeHandler(async (req) => ({ ok: true, result: await V.whatsappVoiceAdapter.buildReplyDraft(req.body || {}) })));
router.post('/voice-ai/ecommerce/voiceover', safeHandler((req) => ({ ok: true, result: V.productVoiceover.script(req.body || {}) })));
router.post('/voice-ai/channel/voiceover-draft', safeHandler((req) => ({ ok: true, result: V.channelVoiceAdapter.buildChannelVoiceover(req.body || {}) })));
router.post('/voice-ai/social/voiceover-draft', safeHandler((req) => ({ ok: true, result: V.socialVoiceAdapter.buildVoiceoverDraft(req.body || {}) })));

// ---- Reports / logs ----
router.get('/voice-ai/history', safeHandler((req) => ({ ok: true, history: V.historyStore.list({ limit: Number(req.query.limit) || 200 }) })));
router.get('/voice-ai/audit', safeHandler((req) => ({ ok: true, audit: V.auditLog.list({ limit: Number(req.query.limit) || 100 }) })));
router.post('/voice-ai/digest/generate', safeHandler(() => ({ ok: true, digest: V.reportBuilder.dailyDigest(), providerUsage: V.reportBuilder.providerUsage() })));

// ---- Doctor ----
router.get('/voice-ai/doctor', safeHandler(() => ({ ok: true, doctor: V.doctor.run() })));
router.post('/voice-ai/doctor/run', safeHandler(() => ({ ok: true, doctor: V.doctor.run() })));

// ---- Flow Studio node descriptor ----
router.get('/voice-ai/flow-nodes', safeHandler(() => ({ ok: true, nodes: V.flowNodes.describe() })));

module.exports = router;
