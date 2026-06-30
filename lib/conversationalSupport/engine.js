'use strict';
/**
 * lib/conversationalSupport/engine.js - the orchestrator. One entry point: handleMessage().
 *
 * Flow per inbound message:
 *   1. load/create the conversation, record the inbound turn
 *   2. if already escalated -> stay silent (a human owns it), just log
 *   3. classify intent (LLM -> keyword fallback)
 *   4. escalation rules -> handoff if needed
 *   5. order intent -> order slot-filling; else compose a grounded answer
 *   6. record the prepared reply. DRY-RUN (default) = prepared but NOT sent (delivered=false).
 */
const { config } = require('./config');
const kb = require('./knowledgeBase');
const conversations = require('./conversations');
const brain = require('./brain');
const escalation = require('./escalation');
const orderFlow = require('./orderFlow');
const { nowISO } = require('./util');

function result(convo, reply, extra) {
  return Object.assign({
    conversationId: convo.id,
    status: convo.status,
    mode: convo.mode,
    reply,
    delivered: false, // set true only by a real send adapter when not in dry-run
    dryRun: config.dryRun,
    at: nowISO(),
  }, extra || {});
}

async function handleMessage(tid, message, opts) {
  tid = tid || 'default';
  const dryRun = (opts && opts.forceDryRun) ? true : config.dryRun;
  const text = (message && message.text) || '';
  const convo = conversations.getOrStart(tid, message || {});
  if (message && message.name && !convo.vars.name) { convo.vars.name = message.name; convo.contact.name = message.name; }
  conversations.appendTurn(convo, 'user', text);

  // Already with a human: don't auto-reply, just keep the transcript.
  if (convo.status === 'escalated') {
    conversations.save(tid, convo);
    return result(convo, null, { handledBy: 'human', note: 'conversation is with a human agent' });
  }

  // If mid-order, continue the order flow (unless the customer explicitly asks for a human).
  const wantsHuman = brain.keywordClassify(text, tid).intent === 'human';
  if (convo.mode === 'order' && !wantsHuman) {
    const step = await orderFlow.step(tid, convo, text, { dryRun });
    convo.fallbackStreak = 0;
    conversations.appendTurn(convo, 'agent', step.reply, { intent: 'order' });
    conversations.save(tid, convo);
    return result(convo, step.reply, { intent: 'order', orderPlaced: step.placed });
  }

  // Classify.
  const cls = await brain.classify(text, convo.history, tid);

  // Escalation check (explicit / low confidence).
  let decision = escalation.decide({ intent: cls.intent, confidence: cls.confidence, grounded: true, fallbackStreak: convo.fallbackStreak });
  if (decision.escalate) {
    convo.status = 'escalated';
    const ho = escalation.enqueue(tid, convo, decision.reason);
    const s = kb.settings(tid);
    const reply = s.fallbackMessage || 'Main aap ko hamari team se connect kar raha hoon. Woh jald rabta karenge. 🙌';
    conversations.appendTurn(convo, 'agent', reply, { intent: cls.intent, escalated: true, reason: decision.reason });
    conversations.save(tid, convo);
    return result(convo, reply, { intent: cls.intent, escalated: true, reason: decision.reason, handoffId: ho.id });
  }

  // Start order flow.
  if (cls.intent === 'order') {
    convo.mode = 'order';
    const step = await orderFlow.step(tid, convo, text, { dryRun });
    convo.fallbackStreak = 0;
    conversations.appendTurn(convo, 'agent', step.reply, { intent: 'order' });
    conversations.save(tid, convo);
    return result(convo, step.reply, { intent: 'order', orderPlaced: step.placed });
  }

  // FAQ / smalltalk / unknown -> grounded answer.
  const ans = await brain.answer(text, convo.history, tid);
  // Re-evaluate escalation now that we know whether we could ground it.
  if (!ans.grounded) {
    convo.fallbackStreak = (convo.fallbackStreak || 0) + 1;
    decision = escalation.decide({ intent: cls.intent, confidence: cls.confidence, grounded: false, fallbackStreak: convo.fallbackStreak });
    if (decision.escalate) {
      convo.status = 'escalated';
      const ho = escalation.enqueue(tid, convo, decision.reason);
      const reply = ans.text || kb.settings(tid).fallbackMessage;
      conversations.appendTurn(convo, 'agent', reply, { intent: cls.intent, escalated: true, reason: decision.reason });
      conversations.save(tid, convo);
      return result(convo, reply, { intent: cls.intent, escalated: true, reason: decision.reason, handoffId: ho.id });
    }
  } else {
    convo.fallbackStreak = 0;
  }
  conversations.appendTurn(convo, 'agent', ans.text, { intent: cls.intent, source: ans.source });
  conversations.save(tid, convo);
  return result(convo, ans.text, { intent: cls.intent, source: ans.source, confidence: cls.confidence });
}

module.exports = { handleMessage };
