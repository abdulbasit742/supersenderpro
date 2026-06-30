'use strict';
/**
 * lib/conversationalSupport/sessions.js - tenant-scoped conversation memory per contact.
 * Keeps a short rolling history (LLM context) + the live order-taking draft. TTL-expired.
 */
const { paths, config } = require('./config');
const store = require('./store');

const now = () => Date.now();
const ttlMs = () => config.sessionTtlHours * 3600 * 1000;

function all(tid) { return store.readJSON(paths.sessions(tid), { sessions: [] }).sessions; }
function persist(tid, sessions) { return store.writeJSON(paths.sessions(tid), { sessions }).sessions; }

function getByPhone(tid, phone) { return all(tid).find((s) => s.contact && s.contact.phone === phone) || null; }

function upsert(tid, contact) {
  const sessions = all(tid);
  let s = sessions.find((x) => x.contact && x.contact.phone === contact.phone);
  if (s) {
    if (contact.name && !s.contact.name) s.contact.name = contact.name;
    s.updatedAt = new Date().toISOString();
  } else {
    s = {
      id: 'cs_' + now().toString(36) + Math.random().toString(36).slice(2, 6),
      contact: { phone: contact.phone, name: contact.name || null },
      status: 'active', intent: null, unknownStreak: 0, order: null, history: [],
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    sessions.push(s);
  }
  persist(tid, sessions);
  return s;
}

function update(tid, phone, patch) {
  const sessions = all(tid);
  const s = sessions.find((x) => x.contact && x.contact.phone === phone);
  if (!s) return null;
  Object.assign(s, patch, { updatedAt: new Date().toISOString() });
  persist(tid, sessions);
  return s;
}

function pushHistory(tid, phone, role, text) {
  const sessions = all(tid);
  const s = sessions.find((x) => x.contact && x.contact.phone === phone);
  if (!s) return null;
  s.history.push({ role, text: String(text || '').slice(0, 1000), at: new Date().toISOString() });
  if (s.history.length > config.historyLimit) s.history = s.history.slice(-config.historyLimit);
  s.updatedAt = new Date().toISOString();
  persist(tid, sessions);
  return s;
}

function reset(tid, phone) { return update(tid, phone, { status: 'active', intent: null, unknownStreak: 0, order: null, history: [] }); }

function list(tid, status) { const items = all(tid); return status ? items.filter((s) => s.status === status) : items; }

function cleanupExpired(tid) {
  const sessions = all(tid);
  const cutoff = now() - ttlMs();
  const kept = sessions.filter((s) => new Date(s.updatedAt).getTime() >= cutoff);
  const removed = sessions.length - kept.length;
  if (removed) persist(tid, kept);
  return removed;
}

module.exports = { getByPhone, upsert, update, pushHistory, reset, list, cleanupExpired };
