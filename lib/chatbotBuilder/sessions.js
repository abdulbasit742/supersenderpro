'use strict';
/**
 * lib/chatbotBuilder/sessions.js - per-contact conversation state for running flows.
 * A session tracks which flow + node a contact is on, captured variables, and whether
 * the engine is awaiting the contact's reply to a question/choice node.
 */
const cfg = require('./config');
const { paths, config } = cfg;
const store = require('./store');
const { nowISO, id, hoursAgo, norm } = require('./util');

const read = (tid) => store.readJSON(paths.sessions(tid), { sessions: [] });
const write = (tid, d) => store.writeJSON(paths.sessions(tid), d);

function getByPhone(tid, phone) {
  const p = norm(phone);
  return read(tid).sessions.find((s) => norm(s.contact && s.contact.phone) === p) || null;
}

function start(tid, contact, flow) {
  const data = read(tid);
  const p = norm(contact && contact.phone);
  data.sessions = data.sessions.filter((s) => norm(s.contact && s.contact.phone) !== p);
  const session = {
    id: id('sess'), tenantId: tid,
    contact: { phone: (contact && contact.phone) || '', name: (contact && contact.name) || '' },
    flowId: flow.id, nodeId: flow.startNodeId, awaiting: false,
    vars: { name: (contact && contact.name) || '' },
    status: 'active', history: [],
    createdAt: nowISO(), updatedAt: nowISO(),
  };
  data.sessions.push(session);
  write(tid, data);
  return session;
}

function save(tid, session) {
  const data = read(tid);
  const i = data.sessions.findIndex((s) => s.id === session.id);
  session.updatedAt = nowISO();
  if (i >= 0) data.sessions[i] = session; else data.sessions.push(session);
  write(tid, data);
  return session;
}

function reset(tid, phone) {
  const data = read(tid);
  const p = norm(phone);
  const before = data.sessions.length;
  data.sessions = data.sessions.filter((s) => norm(s.contact && s.contact.phone) !== p);
  write(tid, data);
  return data.sessions.length < before;
}

function list(tid, status) {
  let s = read(tid).sessions;
  if (status) s = s.filter((x) => x.status === status);
  return s.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
}

/** Mark expired active sessions as 'expired' based on sessionTtlHours; returns count. */
function cleanupExpired(tid) {
  const data = read(tid);
  let n = 0;
  data.sessions.forEach((s) => {
    if (s.status === 'active' && hoursAgo(s.updatedAt) > config.sessionTtlHours) { s.status = 'expired'; n++; }
  });
  if (n) write(tid, data);
  return n;
}

module.exports = { getByPhone, start, save, reset, list, cleanupExpired };
