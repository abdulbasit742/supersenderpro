// lib/voiceAI/conversationManager.js — Orchestrates a voice conversation lifecycle:
// received -> transcribed -> summarized -> reply_drafted -> (queued for approval).
// Stores only masked/safe fields. Connects to CRM data only if a customer object is passed in.

const store = require('./conversationStore');
const summaryBuilder = require('./summaryBuilder');
const replyDraftBuilder = require('./replyDraftBuilder');
const { maskPhone, maskName, preview } = require('./redaction');
const auditLog = require('./auditLog');

const STATUSES = ['received', 'transcribed', 'summarized', 'reply_drafted', 'voice_generated_dry_run',
  'approval_pending', 'approved', 'sent', 'failed', 'skipped', 'archived'];

function create({ customerId, customerName, customerPhone, channel = 'whatsapp', direction = 'inbound', type = 'voice_note', language = 'roman_urdu' } = {}) {
  const now = new Date().toISOString();
  const record = {
    id: `vc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    customerId: customerId || null,
    customerNameSafe: maskName(customerName),
    customerPhoneMasked: maskPhone(customerPhone),
    channel, direction, type, language,
    transcriptPreview: null,
    summary: null,
    intent: null,
    sentiment: null,
    suggestedReplyText: null,
    suggestedVoiceProvider: null,
    suggestedVoiceIdMasked: null,
    status: 'received',
    approvalRequired: true,
    dryRun: true,
    createdAt: now,
    updatedAt: now,
  };
  store.upsert(record);
  auditLog.record('voice_conversation_created', { id: record.id, channel, customerId });
  return record;
}

function attachTranscript(id, transcript, { language } = {}) {
  const c = store.get(id);
  if (!c) return null;
  c.transcriptPreview = preview(transcript, 160);
  if (language) c.language = language;
  c.status = 'transcribed';
  return store.upsert(c);
}

function summarize(id, transcript) {
  const c = store.get(id);
  if (!c) return null;
  const s = summaryBuilder.build(transcript || c.transcriptPreview || '', { language: c.language });
  c.summary = s.summary;
  c.intent = s.intent;
  c.sentiment = s.sentiment;
  c.status = 'summarized';
  auditLog.record('voice_conversation_summarized', { id, intent: s.intent, sentiment: s.sentiment });
  return store.upsert(c);
}

function draftReply(id, { tone = 'professional', provider = 'mock_dry_run' } = {}) {
  const c = store.get(id);
  if (!c) return null;
  const d = replyDraftBuilder.draft({ intent: c.intent || 'general', language: c.language, tone });
  c.suggestedReplyText = d.suggestedReplyText;
  c.suggestedVoiceProvider = provider;
  c.suggestedVoiceIdMasked = 'mo***ce';
  c.status = 'reply_drafted';
  c.approvalRequired = true;
  return store.upsert(c);
}

module.exports = { create, attachTranscript, summarize, draftReply, list: store.all, get: store.get, STATUSES };
