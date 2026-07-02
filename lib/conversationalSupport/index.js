'use strict';
/**
 * lib/conversationalSupport/index.js - 24/7 WhatsApp Conversational AI Support agent (Feature #1).
 *
 * Answers questions, takes orders, and escalates to a human when needed. AI runs through the
 * self-hosted llmHub (Ollama-first); a deterministic FAQ/keyword layer keeps it working when no
 * model is reachable. Safe by default: CONV_SUPPORT_DRY_RUN=true prepares replies without sending.
 *
 * Wire the API with: node scripts/wire-conversational-support.js
 */
const config = require('./config');
const store = require('./store');
const kb = require('./knowledgeBase');
const conversations = require('./conversations');
const brain = require('./brain');
const escalation = require('./escalation');
const orderFlow = require('./orderFlow');
const engine = require('./engine');
const analytics = require('./analytics');

/** Seed a starter knowledge base (FAQs + a couple of demo products) for onboarding/tests. */
function seedExample(tid = 'default') {
 const existing = kb.listProducts(tid);
 if (existing.length) return { seeded: false, reason: 'products already exist' };
 kb.addProduct(tid, { name: 'Starter Pack', sku: 'SP-001', price: 1500, desc: 'Entry bundle', inStock: true });
 kb.addProduct(tid, { name: 'Pro Pack', sku: 'PP-002', price: 3500, desc: 'Most popular', inStock: true });
 return { seeded: true, products: kb.listProducts(tid).length, faqs: kb.listFaqs(tid).length };
}

module.exports = {
 config: config.config,
 paths: config.paths,
 intents: config.intents,
 store, kb, conversations, brain, escalation, orderFlow, engine, analytics,
 handleMessage: engine.handleMessage,
 seedExample,
 doctor: require('./doctor'),
};
