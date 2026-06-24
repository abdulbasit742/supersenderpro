'use strict';

/**
 * quickReplyStore.js  (WATI-style canned responses)
 * Predefined replies agents/bots can insert by shortcut, e.g. "/price".
 * Stored under data/quick_replies.json.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = process.env.CAMPAIGN_DATA_DIR || path.join(__dirname, '..', 'data');
const STORE_FILE = path.join(DATA_DIR, 'quick_replies.json');

function ensureStore() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STORE_FILE)) fs.writeFileSync(STORE_FILE, JSON.stringify({ replies: [] }, null, 2));
}
function readAll() {
  ensureStore();
  try { const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8') || '{}'); if (!Array.isArray(d.replies)) d.replies = []; return d; }
  catch { return { replies: [] }; }
}
function writeAll(d) {
  ensureStore();
  const tmp = STORE_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(d, null, 2));
  fs.renameSync(tmp, STORE_FILE);
}
function newId() { return 'qr_' + crypto.randomBytes(6).toString('hex'); }

function normShortcut(s) {
  s = String(s || '').trim().toLowerCase();
  if (!s) return '';
  return s.startsWith('/') ? s : '/' + s;
}

function createReply(input = {}) {
  const d = readAll();
  const now = new Date().toISOString();
  const r = {
    id: newId(),
    shortcut: normShortcut(input.shortcut),
    title: String(input.title || '').slice(0, 120),
    body: String(input.body || ''),
    createdAt: now,
    updatedAt: now,
  };
  d.replies.push(r);
  writeAll(d);
  return r;
}
function listReplies() { return readAll().replies; }
function getReply(id) { return readAll().replies.find((r) => r.id === id) || null; }
function findByShortcut(shortcut) {
  const sc = normShortcut(shortcut);
  return readAll().replies.find((r) => r.shortcut === sc) || null;
}
function updateReply(id, patch = {}) {
  const d = readAll();
  const i = d.replies.findIndex((r) => r.id === id);
  if (i === -1) return null;
  if (patch.shortcut != null) patch.shortcut = normShortcut(patch.shortcut);
  d.replies[i] = { ...d.replies[i], ...patch, updatedAt: new Date().toISOString() };
  writeAll(d);
  return d.replies[i];
}
function deleteReply(id) {
  const d = readAll();
  const n = d.replies.length;
  d.replies = d.replies.filter((r) => r.id !== id);
  writeAll(d);
  return d.replies.length < n;
}

module.exports = {
  STORE_FILE, normShortcut, createReply, listReplies, getReply,
  findByShortcut, updateReply, deleteReply,
};
