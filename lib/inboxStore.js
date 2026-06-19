'use strict';

/**
 * lib/inboxStore.js — WATI-style shared team inbox.
 * Conversations with messages, agent assignment, status, tags, and notes.
 * Stored under data/inbox.json.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'inbox.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ conversations: [], agents: [] }, null, 2));
}
function readAll() {
  ensureStore();
  try {
    const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}');
    if (!Array.isArray(d.conversations)) d.conversations = [];
    if (!Array.isArray(d.agents)) d.agents = [];
    return d;
  } catch { return { conversations: [], agents: [] }; }
}
function writeAll(d) {
  ensureStore();
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, STORE_FILE);
}
function id(p) { return p + '_' + crypto.randomBytes(6).toString('hex'); }
function normNumber(n) { return String(n || '').replace(/[^\d]/g, ''); }

// ---- agents ----
function listAgents() { return readAll().agents; }
function createAgent(input = {}) {
  const d = readAll();
  const a = { id: id('agent'), name: String(input.name || 'Agent'), email: String(input.email || ''), active: input.active !== false, createdAt: new Date().toISOString() };
  d.agents.push(a); writeAll(d); return a;
}
function deleteAgent(aid) { const d = readAll(); const n = d.agents.length; d.agents = d.agents.filter((a) => a.id !== aid); writeAll(d); return d.agents.length < n; }

// ---- conversations ----
function listConversations(filter = {}) {
  let list = readAll().conversations;
  if (filter.status) list = list.filter((c) => c.status === filter.status);
  if (filter.assignedTo) list = list.filter((c) => c.assignedTo === filter.assignedTo);
  if (filter.tag) list = list.filter((c) => (c.tags || []).includes(filter.tag));
  return list.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
}
function getConversation(cid) { return readAll().conversations.find((c) => c.id === cid) || null; }

/** Find an open conversation by contact number, or create one. */
function getOrCreateByContact(number, name) {
  const d = readAll();
  const num = normNumber(number);
  let c = d.conversations.find((x) => x.contact.number === num && x.status !== 'closed');
  if (c) { if (name && !c.contact.name) { c.contact.name = name; writeAll(d); } return c; }
  c = {
    id: id('conv'), contact: { number: num, name: name || '' },
    status: 'open', assignedTo: null, tags: [], note: '',
    messages: [], unread: 0, createdAt: new Date().toISOString(), lastMessageAt: new Date().toISOString(),
  };
  d.conversations.push(c); writeAll(d); return c;
}

function addMessage(cid, msg = {}) {
  const d = readAll();
  const c = d.conversations.find((x) => x.id === cid);
  if (!c) return null;
  const m = { id: id('msg'), direction: msg.direction === 'out' ? 'out' : 'in', text: String(msg.text || ''), agent: msg.agent || null, at: new Date().toISOString() };
  c.messages.push(m);
  c.lastMessageAt = m.at;
  if (m.direction === 'in') c.unread = (c.unread || 0) + 1;
  else if (c.status === 'open') c.status = 'pending'; // replied, awaiting customer
  writeAll(d);
  return m;
}

function patch(cid, fields = {}) {
  const d = readAll();
  const i = d.conversations.findIndex((x) => x.id === cid);
  if (i === -1) return null;
  d.conversations[i] = { ...d.conversations[i], ...fields };
  writeAll(d);
  return d.conversations[i];
}
function assign(cid, agentId) { return patch(cid, { assignedTo: agentId || null }); }
function setStatus(cid, status) { return ['open', 'pending', 'closed'].includes(status) ? patch(cid, { status }) : null; }
function setNote(cid, note) { return patch(cid, { note: String(note || '') }); }
function markRead(cid) { return patch(cid, { unread: 0 }); }
function addTag(cid, tag) {
  const c = getConversation(cid); if (!c) return null;
  return patch(cid, { tags: Array.from(new Set([...(c.tags || []), String(tag)])) });
}
function removeTag(cid, tag) {
  const c = getConversation(cid); if (!c) return null;
  return patch(cid, { tags: (c.tags || []).filter((t) => t !== tag) });
}

function counts() {
  const list = readAll().conversations;
  return {
    total: list.length,
    open: list.filter((c) => c.status === 'open').length,
    pending: list.filter((c) => c.status === 'pending').length,
    closed: list.filter((c) => c.status === 'closed').length,
    unassigned: list.filter((c) => !c.assignedTo && c.status !== 'closed').length,
    unread: list.reduce((s, c) => s + (c.unread || 0), 0),
  };
}

module.exports = {
  STORE_FILE, normNumber,
  listAgents, createAgent, deleteAgent,
  listConversations, getConversation, getOrCreateByContact,
  addMessage, assign, setStatus, setNote, markRead, addTag, removeTag, counts,
};
