// lib/voiceAI/voiceAgentRouter.js — Routes a transcript/text to the right voice agent and
// produces a text reply + optional dry-run TTS preview. Rule-based default, no auto-send.

const agentRegistry = require('./agentRegistry');
const prompts = require('./voiceAgentPrompts');
const replyDraftBuilder = require('./replyDraftBuilder');
const intentClassifier = require('./voiceIntentClassifier');
const ttsEngine = require('./ttsEngine');

const INTENT_TO_AGENT = {
  order: 'order_followup_voice_agent',
  payment: 'payment_reminder_voice_agent',
  support: 'support_voice_agent',
  complaint: 'complaint_resolution_voice_agent',
  delivery: 'order_followup_voice_agent',
  pricing: 'sales_voice_agent',
  greeting: 'onboarding_voice_agent',
  general: 'support_voice_agent',
};

async function run({ text = '', agentId = null, language = 'roman_urdu', customerId = null, withTtsPreview = false } = {}) {
  const intent = intentClassifier.classify(text);
  const resolvedAgentId = agentId || INTENT_TO_AGENT[intent.intent] || 'support_voice_agent';
  const agent = agentRegistry[resolvedAgentId] || agentRegistry.support_voice_agent;

  const reply = replyDraftBuilder.draft({ intent: intent.intent, language, tone: agent.defaultTone });

  let ttsPreview = null;
  if (withTtsPreview) {
    ttsPreview = await ttsEngine.previewOnly({ text: reply.suggestedReplyText, language, tone: agent.defaultTone, customerId, purpose: 'agent_reply' });
  }

  return {
    agentId: agent.id,
    agentLabel: agent.label,
    promptScaffold: prompts[agent.id] || '',
    detectedIntent: intent.intent,
    replyText: reply.suggestedReplyText,
    language,
    tone: agent.defaultTone,
    escalation: !!agent.escalates && ['complaint', 'support'].includes(intent.intent),
    suggestedNextAction: agent.escalates ? 'request_admin_approval' : 'create_voice_draft',
    autoSend: false,
    ttsPreview,
  };
}

module.exports = { run, INTENT_TO_AGENT };
