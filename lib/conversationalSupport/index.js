'use strict';
/**
 * lib/conversationalSupport/index.js - Roadmap feature #1: 24/7 Conversational AI / Support agent.
 *
 * A WhatsApp agent that (a) answers FAQs grounded in a tenant knowledge base, (b) takes orders
 * conversationally, and (c) escalates to a human when the customer asks or confidence is low.
 * AI runs on the self-hosted llmHub (Ollama-first) so cost is zero and data stays on-prem; if the
 * hub is down everything still works with deterministic replies.
 *
 * Safe by default: CONV_SUPPORT_DRY_RUN=true => prepares replies, never sends. Wire the API with:
 *   node scripts/wire-conversational-support.js   (or mount via lib/bootstrap/registerSubsystems)
 */
const config = require('./config');
const store = require('./store');
const kb = require('./knowledgeBase');
const sessions = require('./sessions');
const escalation = require('./escalation');
const orderTaking = require('./orderTaking');
const intent = require('./intent');
const llm = require('./llm');
const agent = require('./agent');

/** Seed a starter FAQ set for a tenant (idempotent: only if KB empty). */
function seedExample(tid = 'default') {
  if (kb.list(tid).length) return { seeded: false, reason: 'kb already has entries' };
  const items = [
    { q: 'What are your timings / business hours kya hain?', a: 'Hum Mon-Sat, 10am se 8pm tak available hain. Us ke baad message chhor dein, hum subah reply karenge.', tags: ['hours', 'timing', 'open', 'timings'] },
    { q: 'Delivery kitne din mein hoti hai? shipping time', a: 'Delivery 2-4 working days mein ho jati hai. Karachi/Lahore/Islamabad mein aksar 48 ghante.', tags: ['delivery', 'shipping', 'time', 'din'] },
    { q: 'Payment methods kya hain? COD available?', a: 'Cash on Delivery (COD), bank transfer, aur card sab available hain. COD pe chhota sa confirmation OTP aata hai.', tags: ['payment', 'cod', 'card'] },
    { q: 'Return ya refund policy kya hai?', a: '7 din ke andar unused item return kar sakte hain. Refund 3-5 working days mein process hota hai.', tags: ['return', 'refund', 'policy'] },
    { q: 'Aap kahan based hain? location address', a: 'Hamara head office Lahore mein hai, lekin hum poore Pakistan mein deliver karte hain.', tags: ['location', 'address', 'where'] },
  ];
  return { seeded: true, entries: kb.bulkAdd(tid, items) };
}

module.exports = {
  config: config.config,
  paths: config.paths,
  intents: config.intents,
  store, kb, sessions, escalation, orderTaking, intent, llm, agent,
  handle: agent.handle,
  seedExample,
  doctor: require('./doctor'),
};
