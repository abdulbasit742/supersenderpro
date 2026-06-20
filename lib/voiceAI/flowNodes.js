// lib/voiceAI/flowNodes.js — Voice triggers + actions exposed to an EXISTING Flow Studio.
// This only DESCRIBES nodes (id, label, schema) and provides safe action runners.
// It does not create a new Flow Studio.

const sttEngine = require('./sttEngine');
const ttsEngine = require('./ttsEngine');
const summaryBuilder = require('./summaryBuilder');
const queue = require('./voiceQueue');
const consentStore = require('./consentStore');
const auditLog = require('./auditLog');

const TRIGGERS = [
  'voice.note_received', 'voice.transcript_ready', 'voice.intent_detected', 'voice.sentiment_negative',
  'voice.reply_drafted', 'voice.approval_needed', 'voice.approved', 'voice.generated', 'voice.failed',
  'voice.opted_out', 'ecommerce.voice_deal_ready', 'channel.voiceover_ready',
];

const ACTIONS = {
  transcribe_voice_note: async (p = {}) => sttEngine.previewOnly(p),
  summarize_voice_note: async (p = {}) => summaryBuilder.build(p.transcript || '', { language: p.language }),
  generate_voice_reply: async (p = {}) => ttsEngine.previewOnly(p),
  create_voiceover: async (p = {}) => ttsEngine.previewOnly({ ...p, purpose: 'voiceover' }),
  request_admin_approval: async (p = {}) => queue.createDraft(p),
  send_voice_dry_run: async (p = {}) => ({ ok: true, dryRun: true, note: 'dry-run send only' }),
  notify_admin: async (p = {}) => auditLog.record('flow_notify_admin', p),
  create_followup_task: async (p = {}) => ({ ok: true, task: { ...p, dryRun: true } }),
  update_customer_voice_preference: async (p = {}) => consentStore.set(p.subjectId, { preferredLanguage: p.language, preferredVoice: p.voice }),
  opt_out_voice: async (p = {}) => consentStore.optOut(p.subjectId, 'flow'),
};

function describe() {
  return { triggers: TRIGGERS, actions: Object.keys(ACTIONS) };
}

module.exports = { TRIGGERS, ACTIONS, describe };
