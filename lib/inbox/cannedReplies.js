'use strict';
/**
 * cannedReplies.js — Inbox Feature #2: quick "canned" responses for human agents.
 *
 * In the unified inbox (#inbox1), agents answer the same questions all day. Canned replies let them
 * save a response once with a /shortcut and drop it in one tap — optionally personalised with merge
 * fields ({{name}}) via the template manager (#templates1).
 *
 * Storage: JSON (data/canned_replies.json).
 */

const fs = require('fs');
const path = require('path');

let templates = null;
try { templates = require('../templates/templateManager'); } catch { templates = null; }

const DATA_FILE = path.join(__dirname, '..', '..', 'data', 'canned_replies.json');

function load() {
  try { return fs.existsSync(DATA_FILE) ? JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')) : { replies: [] }; }
  catch { return { replies: [] }; }
}
function save(d) {
  try { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }
  catch { /* best-effort */ }
}
const nowIso = () => new Date().toISOString();
const normShortcut = (s) => '/' + String(s || '').replace(/^\//, '').trim().toLowerCase().replace(/\s+/g, '-');

function createReply(opts = {}) {
  if (!opts.shortcut) throw new Error('shortcut required (e.g. "hours")');
  if (!opts.body) throw new Error('body required');
  const data = load();
  const sc = normShortcut(opts.shortcut);
  if (data.replies.some(r => r.shortcut === sc)) throw new Error(`shortcut ${sc} already exists`);
  const reply = {
    id: `CAN-${Date.now()}-${Math.random().toString(16).slice(2,6)}`,
    shortcut: sc,
    title: opts.title || sc,
    body: opts.body,
    category: opts.category || 'general',
    usageCount: 0,
    createdAt: nowIso()
  };
  data.replies.push(reply);
  save(data);
  return reply;
}

function updateReply(id, patch = {}) {
  const data = load();
  const r = data.replies.find(x => x.id === id);
  if (!r) return null;
  if (patch.shortcut !== undefined) r.shortcut = normShortcut(patch.shortcut);
  if (patch.title !== undefined) r.title = patch.title;
  if (patch.body !== undefined) r.body = patch.body;
  if (patch.category !== undefined) r.category = patch.category;
  save(data);
  return r;
}

function deleteReply(id) {
  const data = load();
  const before = data.replies.length;
  data.replies = data.replies.filter(r => r.id !== id);
  save(data);
  return { deleted: before - data.replies.length };
}

function listReplies(category) {
  const data = load();
  return category ? data.replies.filter(r => r.category === category) : data.replies;
}

/** Search by shortcut prefix or text (for the agent's autocomplete as they type "/"). */
function search(q) {
  const query = String(q || '').toLowerCase().replace(/^\//, '');
  const data = load();
  if (!query) return data.replies;
  return data.replies.filter(r =>
    r.shortcut.includes(query) || (r.title || '').toLowerCase().includes(query) || r.body.toLowerCase().includes(query)
  );
}

/**
 * Resolve a reply by id or shortcut and render it with contact data (merge fields).
 * @returns {Object|null} { text, shortcut }
 */
function render(idOrShortcut, data = {}) {
  const store = load();
  const sc = idOrShortcut && idOrShortcut.startsWith('/') ? normShortcut(idOrShortcut) : null;
  const reply = store.replies.find(r => r.id === idOrShortcut || (sc && r.shortcut === sc));
  if (!reply) return null;
  let text = reply.body;
  if (templates && typeof templates.renderInline === 'function') {
    try { text = templates.renderInline(reply.body, data).text; } catch { /* keep raw */ }
  } else {
    text = reply.body.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => (data[k] != null ? String(data[k]) : ''));
  }
  // bump usage
  reply.usageCount = (reply.usageCount || 0) + 1;
  save(store);
  return { text, shortcut: reply.shortcut };
}

module.exports = { createReply, updateReply, deleteReply, listReplies, search, render };
