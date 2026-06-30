'use strict';
/**
 * lib/chatbotBuilder/index.js - no-code WhatsApp Chatbot Flow Builder (Wati-parity).
 *
 * Build visual flows from message/question/choice/condition/ai/action/handoff nodes.
 * The engine runs them per-contact; AI nodes route through the self-hosted llmHub with a
 * deterministic fallback. Safe by default: CHATBOT_BUILDER_DRY_RUN=true prepares replies
 * without sending. Wire the API with: node scripts/wire-chatbot-builder.js
 */
const config = require('./config');
const store = require('./store');
const flows = require('./flows');
const sessions = require('./sessions');
const engine = require('./engine');
const aiReply = require('./aiReply');

/** A ready-to-use sample flow (lead capture -> qualify -> handoff) for onboarding/tests. */
function exampleFlow() {
  return {
    name: 'Welcome & Lead Capture',
    status: 'active',
    triggers: { keywords: ['hi', 'hello', 'salam', 'start', 'info'], isDefault: true },
    startNodeId: 'n_welcome',
    nodes: [
      { id: 'n_welcome', type: 'message', text: 'Assalam o Alaikum! 👋 SuperSender mein khush aamadeed. Main aap ki kaise madad kar sakta hoon?', next: 'n_name' },
      { id: 'n_name', type: 'question', text: 'Pehle aap ka naam bata dein?', saveAs: 'name', next: 'n_intent' },
      { id: 'n_intent', type: 'choice', text: 'Shukriya {{name}}! Aap kis cheez mein interested hain?', saveAs: 'intent',
        options: [
          { label: 'Pricing / Plans', value: 'pricing', next: 'n_pricing' },
          { label: 'Demo book karna', value: 'demo', next: 'n_handoff' },
          { label: 'Support', value: 'support', next: 'n_handoff' },
        ], fallbackNext: 'n_handoff' },
      { id: 'n_pricing', type: 'ai', prompt: 'In 2 short WhatsApp lines (Urdu/English mix), pitch SuperSender plans: Starter, Pro, Agency. Customer name: {{name}}. End by asking if they want a demo.', fallback: '{{name}}, hamare 3 plans hain: Starter, Pro aur Agency. Demo book karein?', next: 'n_demo_q' },
      { id: 'n_demo_q', type: 'choice', text: 'Demo schedule karein?', saveAs: 'wantsDemo',
        options: [ { label: 'Haan', value: 'yes', next: 'n_handoff' }, { label: 'Abhi nahi', value: 'no', next: 'n_end' } ], fallbackNext: 'n_handoff' },
      { id: 'n_handoff', type: 'handoff', text: 'Bohat khoob {{name}}! Main aap ko hamari team se connect kar raha hoon, woh abhi rabta karenge. 🙌' },
      { id: 'n_end', type: 'end', text: 'Theek hai {{name}}, jab bhi zaroorat ho "info" likh dein. Shukriya! 🙏' },
    ],
  };
}

/** Seed the example flow into a tenant (idempotent-ish: only if no flows exist). */
function seedExample(tid = 'default') {
  if (flows.list(tid).length) return { seeded: false, reason: 'flows already exist' };
  const f = flows.create(tid, exampleFlow());
  return { seeded: true, flow: f };
}

module.exports = {
  config: config.config,
  paths: config.paths,
  nodeTypes: config.nodeTypes,
  store, flows, sessions, engine, aiReply,
  handleMessage: engine.handleMessage,
  exampleFlow, seedExample,
  doctor: require('./doctor'),
};
