'use strict';
/**
 * lib/conversationalSupport/conversations.js - per-contact conversation state for the support agent.
 *
 * A conversation tracks: contact, status (active|escalated|closed), mode (chat|order),
 * an in-progress order (slots), running message history, and a fallback counter used by the
 * escalation rules. One conversation per phone per tenant (latest wins).
 */
const { paths, config } = require('./config');
const store = require('./store');
const { id, nowISO, hoursAgo, norm } = require('./util');

const read = (tid) => store.readJSON(paths.conversations(tid), { conversations: [] });
const write = (tid, d) => store.writeJSON(paths.conversations(tid), d);

function getByPhone(tid, phone) {
  const p = norm(phone);
  return read(tid).conversations.find((c) => norm(c.contact && c.contact.phone) === p) || null;
}

function getOrStart(tid, contact) {
  const existing = getByPhone(tid, contact && contact.phone);
  if (existing && existing.status !== 'closed') return existing;
  const data = read(tid);
  const convo = {
    id: id('conv'), tenantId: tid,
    contact: { phone: (contact && contact.phone) || '', name: (contact && contact.name) || '' },
    status: 'active', mode: 'chat',
    order: null,
    vars: { name: (contact && contact.name) || '' },
    fallbackStreak: 0,
    history: [],
    assignedAgent: null,
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  // close any prior conversation for this phone, then push the new one
  const p = norm(contact && contact.phone);
  data.conversations.forEach((c) => { if (norm(c.contact && c.contact.phone) === p) c.status = 'closed'; });
  data.conversations.push(convo);
  write(tid, data);
  return convo;
}

function appendTurn(convo, role, text, meta) {
  convo.history = convo.history || [];
  convo.history.push(Object.assign({ role, text: String(text || ''), at: nowISO() }, meta || {}));
  const max = config.maxHistoryTurns * 2; // user+agent per turn
  if (convo.history.length > max) convo.history = convo.history.slice(-max);
  return convo;
}

function save(tid, convo) {
  const data = read(tid);
  const i = data.conversations.findIndex((c) => c.id === convo.id);
  convo.updatedAt = nowISO();
  if (i >= 0) data.conversations[i] = convo; else data.conversations.push(convo);
  write(tid, data);
  return convo;
}

function reset(tid, phone) {
  const data = read(tid);
  const p = norm(phone);
  const before = data.conversations.length;
  data.conversations = data.conversations.filter((c) => norm(c.contact && c.contact.phone) !== p);
  write(tid, data);
  return data.conversations.length < before;
}

function list(tid, status) {
  let c = read(tid).conversations;
  if (status) c = c.filter((x) => x.status === status);
  return c.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/** Mark stale active conversations as 'closed' based on sessionTtlHours; returns count. */
function cleanupExpired(tid) {
  const data = read(tid);
  let n = 0;
  data.conversations.forEach((c) => {
    if (c.status === 'active' && hoursAgo(c.updatedAt) > config.sessionTtlHours) { c.status = 'closed'; n++; }
  });
  if (n) write(tid, data);
  return n;
}

module.exports = { getByPhone, getOrStart, appendTurn, save, reset, list, cleanupExpired };
