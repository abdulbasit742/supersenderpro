// lib/voiceAI/adapters/whatsappVoiceAdapter.js — Safe adapter around the EXISTING WhatsApp
// system. It NEVER touches session/auth files and NEVER sends by default. It only builds
// metadata-driven jobs and "manual action packets" the operator can act on.

const { config } = require('./../config');
const conversationManager = require('./../conversationManager');
const sttEngine = require('./../sttEngine');
const voiceAgentRouter = require('./../voiceAgentRouter');
const queue = require('./../voiceQueue');
const auditLog = require('./../auditLog');

// Receive a WhatsApp voice-note event (metadata only) and build a transcript + draft pipeline.
async function onVoiceNote(evt = {}) {
  const convo = conversationManager.create({
    customerId: evt.customerId, customerName: evt.customerName, customerPhone: evt.customerPhone,
    channel: 'whatsapp', direction: 'inbound', type: 'voice_note', language: evt.languageHint,
  });
  const stt = await sttEngine.previewOnly({
    sourceType: 'whatsapp', audioMimeType: evt.audioMimeType, durationSec: evt.durationSec,
    customerId: evt.customerId, messageId: evt.messageId, languageHint: evt.languageHint, audioSource: evt.audioSource,
  });
  conversationManager.attachTranscript(convo.id, stt.transcriptPreview, { language: stt.language });
  conversationManager.summarize(convo.id, stt.transcriptPreview);
  return { conversationId: convo.id, stt };
}

// Build a voice reply DRAFT (dry-run) and queue it for approval.
async function buildReplyDraft({ conversationId, text, customerId, language = config.defaultLanguage } = {}) {
  const agent = await voiceAgentRouter.run({ text: text || '', language, customerId });
  const draft = queue.createDraft({
    type: 'voice_reply', customerId, targetChannel: 'whatsapp',
    text: agent.replyText, provider: config.defaultProvider,
  });
  auditLog.record('whatsapp_voice_reply_drafted', { conversationId, customerId });
  return { agent, draft };
}

// Build the packet that WOULD be sent — but as a manual/dry-run packet only.
function buildSendPacket({ customerPhoneMasked, audioFilePath = null, caption = '' } = {}) {
  const liveSupported = config.effective.liveSend;
  return {
    mode: liveSupported ? 'live_capable_but_requires_approval' : 'manual_action_required',
    instructions: liveSupported
      ? 'Approved + consent confirmed required before any live send.'
      : 'Live WhatsApp audio send is disabled. Operator should send this audio manually.',
    to: customerPhoneMasked,
    audioFilePath,
    caption: caption || null,
    dryRun: true,
  };
}

module.exports = { onVoiceNote, buildReplyDraft, buildSendPacket };
