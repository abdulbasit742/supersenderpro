'use strict';
/**
 * lib/conversationalSupport/escalation.js - decides when to hand a conversation to a human and
 * keeps a per-tenant handoff queue your dashboard / staff portal can claim from.
 */
const { paths, config } = require('./config');
const store = require('./store');
const { id, nowISO, norm } = require('./util');

const read = (tid) => store.readJSON(paths.handoffs(tid), { handoffs: [] });
const write = (tid, d) => store.writeJSON(paths.handoffs(tid), d);

/**
 * Decide whether to escalate. Returns { escalate:bool, reason }.
 *   - explicit: classifier said 'human'
 *   - lowConfidence: intent confidence under threshold
 *   - notGrounded: agent could not ground an answer
 *   - repeatedFallback: too many low-quality turns in a row
 */
function decide({ intent, confidence, grounded, fallbackStreak }) {
  if (intent === 'human') return { escalate: true, reason: 'explicit' };
  if (grounded === false) return { escalate: true, reason: 'not_grounded' };
  if (typeof confidence === 'number' && confidence < config.escalateBelowConfidence) return { escalate: true, reason: 'low_confidence' };
  if ((fallbackStreak || 0) >= config.escalateAfterFallbacks) return { escalate: true, reason: 'repeated_fallback' };
  return { escalate: false, reason: '' };
}

/** Add a handoff to the queue (idempotent per open conversation). */
function enqueue(tid, convo, reason) {
  const data = read(tid);
  const open = data.handoffs.find((h) => h.conversationId === convo.id && h.status === 'open');
  if (open) return open;
  const item = {
    id: id('ho'), conversationId: convo.id,
    contact: { phone: (convo.contact && convo.contact.phone) || '', name: (convo.contact && convo.contact.name) || '' },
    reason: reason || 'unspecified', status: 'open', assignedAgent: null,
    lastMessage: (convo.history && convo.history.length) ? convo.history[convo.history.length - 1].text : '',
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  data.handoffs.push(item); write(tid, data);
  return item;
}

function listQueue(tid, status) {
  let h = read(tid).handoffs;
  if (status) h = h.filter((x) => x.status === status);
  return h.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

function claim(tid, handoffId, agent) {
  const data = read(tid);
  const h = data.handoffs.find((x) => x.id === handoffId);
  if (!h) return null;
  h.status = 'claimed'; h.assignedAgent = agent || 'agent'; h.updatedAt = nowISO();
  write(tid, data); return h;
}

function resolve(tid, handoffId) {
  const data = read(tid);
  const h = data.handoffs.find((x) => x.id === handoffId);
  if (!h) return null;
  h.status = 'resolved'; h.updatedAt = nowISO();
  write(tid, data); return h;
}

module.exports = { decide, enqueue, listQueue, claim, resolve };
