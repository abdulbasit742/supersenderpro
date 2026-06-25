const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const { v4: uuid } = require('uuid');
const fs = require('fs'), path = require('path');

const MSG_FILE = path.join(__dirname, '../../../data/inbox_messages.json');
const CONTACT_FILE = path.join(__dirname, '../../../data/inbox_contacts.json');

function loadMsgs() { try { return JSON.parse(fs.readFileSync(MSG_FILE, 'utf8')); } catch(e) { return []; } }
function saveMsgs(d) { fs.writeFileSync(MSG_FILE, JSON.stringify(d.slice(0, 10000), null, 2)); }
function loadContacts() { try { return JSON.parse(fs.readFileSync(CONTACT_FILE, 'utf8')); } catch(e) { return {}; } }
function saveContacts(d) { fs.writeFileSync(CONTACT_FILE, JSON.stringify(d, null, 2)); }

function updateContact(phone, lastMsg) {
  const contacts = loadContacts();
  if (!contacts[phone]) contacts[phone] = { phone, firstSeen: new Date().toISOString(), messageCount: 0, unread: 0 };
  contacts[phone].lastMessage = lastMsg.body;
  contacts[phone].lastMessageAt = lastMsg.createdAt;
  contacts[phone].messageCount = (contacts[phone].messageCount || 0) + 1;
  if (!lastMsg.fromMe) contacts[phone].unread = (contacts[phone].unread || 0) + 1;
  saveContacts(contacts);
}

// GET /api/inbox/contacts — list contacts sorted by last message
router.get('/contacts', requireAuth, asyncHandler(async (req, res) => {
  const contacts = loadContacts();
  const list = Object.values(contacts).sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
  const search = req.query.q;
  const filtered = search ? list.filter(c => c.phone.includes(search) || (c.name || '').toLowerCase().includes(search.toLowerCase())) : list;
  res.json({ total: filtered.length, unreadTotal: list.reduce((s, c) => s + (c.unread || 0), 0), contacts: filtered.slice(0, Number(req.query.limit || 50)) });
}));

// GET /api/inbox/contacts/:phone/messages — message thread for a contact
router.get('/contacts/:phone/messages', requireAuth, asyncHandler(async (req, res) => {
  const msgs = loadMsgs().filter(m => m.phone === req.params.phone);
  // Mark as read
  const contacts = loadContacts();
  if (contacts[req.params.phone]) { contacts[req.params.phone].unread = 0; saveContacts(contacts); }
  res.json({ phone: req.params.phone, count: msgs.length, messages: msgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)) });
}));

// POST /api/inbox/messages — store a message (called by WA bot on receive/send)
router.post('/messages', asyncHandler(async (req, res) => {
  const { phone, body, fromMe = false, type = 'text', session, mediaUrl, quotedId } = req.body || {};
  if (!phone || !body) return res.status(400).json({ error: 'phone and body required' });
  const msg = { id: uuid(), phone, body, fromMe, type, session: session || 'default', mediaUrl: mediaUrl || null, quotedId: quotedId || null, createdAt: new Date().toISOString(), delivered: fromMe, read: fromMe };
  const msgs = loadMsgs(); msgs.push(msg); saveMsgs(msgs);
  updateContact(phone, msg);
  req.app.get && req.app.get('io') && req.app.get('io').emit('inbox:message', msg);
  res.status(201).json(msg);
}));

// GET /api/inbox/stats — inbox statistics
router.get('/stats', requireAuth, asyncHandler(async (req, res) => {
  const msgs = loadMsgs();
  const contacts = loadContacts();
  const today = new Date().toISOString().slice(0, 10);
  const todayMsgs = msgs.filter(m => m.createdAt.startsWith(today));
  const totalUnread = Object.values(contacts).reduce((s, c) => s + (c.unread || 0), 0);
  res.json({ totalMessages: msgs.length, totalContacts: Object.keys(contacts).length, totalUnread, todayMessages: todayMsgs.length, todayInbound: todayMsgs.filter(m => !m.fromMe).length, todayOutbound: todayMsgs.filter(m => m.fromMe).length });
}));

// GET /api/inbox/search — search messages
router.get('/search', requireAuth, asyncHandler(async (req, res) => {
  const q = req.query.q || '';
  if (!q) return res.status(400).json({ error: 'q param required' });
  const msgs = loadMsgs().filter(m => m.body.toLowerCase().includes(q.toLowerCase()));
  res.json({ query: q, count: msgs.length, messages: msgs.slice(0, 50) });
}));

// PATCH /api/inbox/contacts/:phone/read — mark all as read
router.patch('/contacts/:phone/read', requireAuth, asyncHandler(async (req, res) => {
  const contacts = loadContacts();
  if (contacts[req.params.phone]) { contacts[req.params.phone].unread = 0; saveContacts(contacts); }
  res.json({ success: true, phone: req.params.phone });
}));

// DELETE /api/inbox/contacts/:phone — clear conversation
router.delete('/contacts/:phone', requireAuth, asyncHandler(async (req, res) => {
  const msgs = loadMsgs().filter(m => m.phone !== req.params.phone);
  saveMsgs(msgs);
  const contacts = loadContacts();
  delete contacts[req.params.phone];
  saveContacts(contacts);
  res.json({ success: true });
}));

module.exports = router;
