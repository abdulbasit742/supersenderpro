'use strict';
/**
 * lib/conversationalSupport/agent.js - the 24/7 support brain. Orchestrates intent detection,
 * KB-grounded answers (KB grounds, LLM phrases), conversational order-taking, and human escalation.
 * DRY-RUN safe: it PREPARES a reply and never sends on its own - your webhook layer delivers.
 * Tenant-scoped throughout. `action` tells the caller what happened.
 */
const { config } = require('./config');
const sessions = require('./sessions');
const kb = require('./knowledgeBase');
const intentDetect = require('./intent');
const escalation = require('./escalation');
const orderTaking = require('./orderTaking');
const llm = require('./llm');

function greeting(name) {
  const who = name ? (' ' + name) : '';
  return 'Assalam o Alaikum' + who + '! \uD83D\uDC4B Main ' + config.botName + ' hoon. Main aap ke sawalat ka jawab de sakta hoon, order le sakta hoon, ya kisi insaan se baat karwa sakta hoon. Kaise madad karun?';
}

async function answerFAQ(tid, text, session) {
  const hits = kb.search(tid, text, 3);
  const best = hits[0];
  if (!best || best.confidence < config.minAnswerConfidence) return { reply: null, confident: false, hits };
  const grounding = hits.slice(0, 3).map((h, i) => (i + 1) + '. Q: ' + h.entry.q + '\n   A: ' + h.entry.a).join('\n');
  const histLine = (session.history || []).slice(-4).map((m) => m.role + ': ' + m.text).join('\n');
  const prompt = [
    'You are ' + config.botName + ', a friendly WhatsApp support agent for a Pakistani business.',
    'Answer in 2-4 short lines, in the customer\'s language (Roman Urdu/English mix is fine).',
    'Use ONLY the knowledge below. If it does not cover the question, say you will connect a human.',
    'Knowledge:\n' + grounding,
    histLine ? ('Recent chat:\n' + histLine) : '',
    'Customer: ' + text,
    'Reply:',
  ].filter(Boolean).join('\n\n');
  const phrased = await llm.generate(prompt);
  return { reply: phrased || best.entry.a, confident: true, hits };
}

/**
 * handle(tid, contact{phone,name}, text, opts) ->
 *   { reply, intent, action, escalated, order?, ticket?, confidence?, session, dryRun }
 * Never sends. opts.forceDryRun overrides config; opts.noLLM skips LLM classification (CI).
 */
async function handle(tid, contact, text, opts = {}) {
  if (!contact || !contact.phone) throw new Error('contact.phone is required');
  const dryRun = opts.forceDryRun !== undefined ? !!opts.forceDryRun : config.dryRun;

  const session = sessions.upsert(tid, contact);
  sessions.pushHistory(tid, contact.phone, 'user', text);

  const wantsHumanNow = intentDetect.ruleBased(text) === 'human';

  // Continue an in-flight order unless the customer explicitly asks for a human.
  if (session.order && session.order.stage && session.order.stage !== 'placed' && !wantsHumanNow) {
    const res = orderTaking.step(session.order, text, contact);
    if (res.done) {
      const placed = orderTaking.place(tid, res.draft, contact);
      sessions.update(tid, contact.phone, { order: null, intent: 'order', unknownStreak: 0 });
      const items = placed.order.items.map((i) => i.qty + ' x ' + i.name).join(', ');
      const reply = 'Shukriya! Aap ka order place ho gaya \u2705\nOrder #' + placed.order.id + '\n' + items + '\nDelivery: ' + placed.order.address + '\nHamari team jald confirm karegi.';
      sessions.pushHistory(tid, contact.phone, 'bot', reply);
      return { reply, intent: 'order', action: 'order_placed', escalated: false, order: placed.order, session: sessions.getByPhone(tid, contact.phone), dryRun };
    }
    sessions.update(tid, contact.phone, { order: res.draft, intent: 'order' });
    sessions.pushHistory(tid, contact.phone, 'bot', res.reply);
    return { reply: res.reply, intent: 'order', action: 'order_collecting', escalated: false, order: res.draft, session: sessions.getByPhone(tid, contact.phone), dryRun };
  }

  const { intent } = await intentDetect.detect(text, { allowLLM: !opts.noLLM });

  if (intent === 'human') {
    const ticket = escalation.create(tid, { contact, reason: 'customer_requested_human', transcript: session.history });
    sessions.update(tid, contact.phone, { status: 'handoff', intent, unknownStreak: 0 });
    const reply = 'Bilkul! Main aap ko hamari team se connect kar raha hoon. Woh jald aap se rabta karenge. \uD83D\uDE4C';
    sessions.pushHistory(tid, contact.phone, 'bot', reply);
    return { reply, intent, action: 'escalated', escalated: true, ticket, session: sessions.getByPhone(tid, contact.phone), dryRun };
  }

  if (intent === 'greeting') {
    const reply = greeting(contact.name || session.contact.name);
    sessions.update(tid, contact.phone, { intent, unknownStreak: 0 });
    sessions.pushHistory(tid, contact.phone, 'bot', reply);
    return { reply, intent, action: 'greeted', escalated: false, session: sessions.getByPhone(tid, contact.phone), dryRun };
  }

  if (intent === 'goodbye') {
    const reply = 'Shukriya! Jab bhi zaroorat ho, message kar dein. Allah Hafiz \uD83D\uDE4F';
    sessions.update(tid, contact.phone, { intent, unknownStreak: 0 });
    sessions.pushHistory(tid, contact.phone, 'bot', reply);
    return { reply, intent, action: 'closed', escalated: false, session: sessions.getByPhone(tid, contact.phone), dryRun };
  }

  if (intent === 'order') {
    const first = orderTaking.step(orderTaking.newDraft(), '', contact);
    sessions.update(tid, contact.phone, { order: first.draft, intent, unknownStreak: 0 });
    sessions.pushHistory(tid, contact.phone, 'bot', first.reply);
    return { reply: first.reply, intent, action: 'order_started', escalated: false, order: first.draft, session: sessions.getByPhone(tid, contact.phone), dryRun };
  }

  if (intent === 'track_order') {
    const orders = orderTaking.listOrders(tid).filter((o) => o.contact && o.contact.phone === contact.phone);
    const last = orders[orders.length - 1];
    const reply = last
      ? 'Aap ka latest order #' + last.id + ' ka status: ' + last.status + '. Tafseel ke liye "agent" likhein.'
      : 'Mujhe aap ke number par koi order nahi mila. Naya order karna ho to "order" likhein.';
    sessions.update(tid, contact.phone, { intent, unknownStreak: 0 });
    sessions.pushHistory(tid, contact.phone, 'bot', reply);
    return { reply, intent, action: 'order_status', escalated: false, session: sessions.getByPhone(tid, contact.phone), dryRun };
  }

  // FAQ / default: try the KB even for 'unknown' intent.
  const ans = await answerFAQ(tid, text, session);
  if (ans.confident && ans.reply) {
    sessions.update(tid, contact.phone, { intent: 'faq', unknownStreak: 0 });
    sessions.pushHistory(tid, contact.phone, 'bot', ans.reply);
    return { reply: ans.reply, intent: 'faq', action: 'answered', escalated: false, confidence: ans.hits[0] && ans.hits[0].confidence, session: sessions.getByPhone(tid, contact.phone), dryRun };
  }

  const streak = (session.unknownStreak || 0) + 1;
  if (streak >= config.maxUnknownTurns) {
    const ticket = escalation.create(tid, { contact, reason: 'low_confidence', transcript: session.history });
    sessions.update(tid, contact.phone, { status: 'handoff', intent: 'unknown', unknownStreak: 0 });
    const reply = 'Maaf kijiye, main is ka theek jawab nahi de paya. Main aap ko hamari team se connect kar raha hoon. \uD83D\uDE4C';
    sessions.pushHistory(tid, contact.phone, 'bot', reply);
    return { reply, intent: 'unknown', action: 'escalated', escalated: true, ticket, session: sessions.getByPhone(tid, contact.phone), dryRun };
  }
  sessions.update(tid, contact.phone, { intent: 'unknown', unknownStreak: streak });
  const reply = 'Mujhe yeh samajh nahi aaya. Aap order karna chahte hain, koi sawal hai, ya kisi insaan se baat karni hai? ("order" / sawal likhein / "agent")';
  sessions.pushHistory(tid, contact.phone, 'bot', reply);
  return { reply, intent: 'unknown', action: 'clarify', escalated: false, session: sessions.getByPhone(tid, contact.phone), dryRun };
}

module.exports = { handle, greeting, answerFAQ };
