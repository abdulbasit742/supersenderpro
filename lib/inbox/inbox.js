'use strict';
/**
 * inbox.js — Inbox Feature #1: the unified conversation inbox.
 *
 * The AI support agent handles most messages, but humans need a place to see and reply to live
 * conversations — especially escalations. This is that shared inbox: one thread per contact with the
 * full back-and-forth, unread counts, assignment to a team member, and open/closed status.
 *
 * Kept in sync by the inbound router (recordInbound) and any send path (recordOutbound). The AI
 * agent and a human can both write to the same thread, so handoffs are seamless.
 *
 * Storage: JSON (data/inbox.json).
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'inbox.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { threads: {} }; }
  catch { return { threads: {} }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normPhone = (v) => String(v || '').replace(/[^\d]/g, '');

function ensureThread(data, phone, name) {
  if (!data.threads[phone]) {
    data.threads[phone] = {
      phone, name: name || '',
      status: 'open',            // open | closed
      assigneeId: null,
      unread: 0,
      lastMessageAt: null,
      lastPreview: '',
      messages: [],
      createdAt: nowIso()
    };
  }
  return data.threads[phone];
}

function push(phone, dir, text, meta = {}) {
  const p = normPhone(phone);
  if (!p) throw new Error('phone required');
  const data = load();
  const t = ensureThread(data, p, meta.name);
  const msg = { dir, text: text || '', at: meta.at || nowIso(), via: meta.via || (dir === 'out' ? 'agent' : 'customer') };
  t.messages.push(msg);
  if (t.messages.length > 500) t.messages = t.messages.slice(-500);
  t.lastMessageAt = msg.at;
  t.lastPreview = String(text || '').slice(0, 80);
  if (dir === 'in') { t.unread = (t.unread || 0) + 1; t.status = 'open'; }
  if (meta.name && !t.name) t.name = meta.name;
  save(data);
  return t;
}

function recordInbound(phone, text, meta = {}) { return push(phone, 'in', text, meta); }
function recordOutbound(phone, text, meta = {}) { return push(phone, 'out', text, { ...meta, via: meta.via || 'agent' }); }

function markRead(phone) {
  const data = load();
  const t = data.threads[normPhone(phone)];
  if (!t) return null;
  t.unread = 0;
  save(data);
  return t;
}
function assign(phone, assigneeId) {
  const data = load();
  const t = data.threads[normPhone(phone)];
  if (!t) return null;
  t.assigneeId = assigneeId || null;
  save(data);
  return t;
}
function setStatus(phone, status) {
  const data = load();
  const t = data.threads[normPhone(phone)];
  if (!t) return null;
  t.status = status === 'closed' ? 'closed' : 'open';
  save(data);
  return t;
}

function getThread(phone) { return load().threads[normPhone(phone)] || null; }

/** List threads for the inbox view. Sorted by most recent. Filters: status, assigneeId, unreadOnly. */
function listThreads(filter = {}) {
  let rows = Object.values(load().threads);
  if (filter.status) rows = rows.filter(t => t.status === filter.status);
  if (filter.assigneeId) rows = rows.filter(t => t.assigneeId === filter.assigneeId);
  if (filter.unreadOnly) rows = rows.filter(t => (t.unread || 0) > 0);
  if (filter.search) {
    const q = String(filter.search).toLowerCase();
    rows = rows.filter(t => (t.name || '').toLowerCase().includes(q) || t.phone.includes(q.replace(/[^\d]/g, '')));
  }
  rows.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  // list view: omit full message arrays for speed
  return rows.map(({ messages, ...rest }) => ({ ...rest, messageCount: messages.length }));
}

function counts() {
  const rows = Object.values(load().threads);
  return {
    open: rows.filter(t => t.status === 'open').length,
    closed: rows.filter(t => t.status === 'closed').length,
    unreadThreads: rows.filter(t => (t.unread || 0) > 0).length,
    totalUnread: rows.reduce((s, t) => s + (t.unread || 0), 0)
  };
}

module.exports = { recordInbound, recordOutbound, markRead, assign, setStatus, getThread, listThreads, counts };
