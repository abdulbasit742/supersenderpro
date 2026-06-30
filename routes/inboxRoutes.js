// routes/inboxRoutes.js — Inbox #1: unified conversation inbox.
//
// Wire-up (server.js):
//   const inbox = require('./lib/inbox/inbox');
//   // keep inbox in sync: in the inbound router, also call inbox.recordInbound(phone, text, {name});
//   // and whenever you send, call inbox.recordOutbound(phone, text);
//   app.use('/api/inbox', require('./routes/inboxRoutes'));
//
// The reply endpoint here records the outbound + (if wired) sends via the guarded sender.

const express = require('express');
const router = express.Router();

let inbox;
try { inbox = require('../lib/inbox/inbox'); } catch { inbox = null; }

// Optional: a guarded sender so replies actually go out. setSender from server.js.
let sender = null;
router.setSender = (fn) => { sender = typeof fn === 'function' ? fn : null; };

function ensure(res) {
  if (!inbox) { res.status(503).json({ ok: false, error: 'Inbox not available' }); return false; }
  return true;
}

// List threads. Query: ?status=&assigneeId=&unreadOnly=&search=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  const filter = { status: req.query.status, assigneeId: req.query.assigneeId, unreadOnly: req.query.unreadOnly === 'true', search: req.query.search };
  res.json({ ok: true, threads: inbox.listThreads(filter), counts: inbox.counts() });
});

// One thread (full history). Marks read.
router.get('/:phone', (req, res) => {
  if (!ensure(res)) return;
  const t = inbox.getThread(req.params.phone);
  if (!t) return res.status(404).json({ ok: false, error: 'No thread' });
  inbox.markRead(req.params.phone);
  res.json({ ok: true, thread: t });
});

// Human reply. Body: { text }. Records outbound and sends if a sender is wired.
router.post('/:phone/reply', async (req, res) => {
  if (!ensure(res)) return;
  const text = (req.body || {}).text;
  if (!text) return res.status(400).json({ ok: false, error: 'text required' });
  try {
    let sendResult = null;
    if (sender) sendResult = await sender(req.params.phone, text);
    const t = inbox.recordOutbound(req.params.phone, text, { via: 'human' });
    res.json({ ok: true, thread: t, sendResult });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Assign to a team member. Body: { assigneeId }
router.post('/:phone/assign', (req, res) => {
  if (!ensure(res)) return;
  const t = inbox.assign(req.params.phone, (req.body || {}).assigneeId);
  if (!t) return res.status(404).json({ ok: false, error: 'No thread' });
  res.json({ ok: true, thread: t });
});

// Open/close. Body: { status: 'open'|'closed' }
router.post('/:phone/status', (req, res) => {
  if (!ensure(res)) return;
  const t = inbox.setStatus(req.params.phone, (req.body || {}).status);
  if (!t) return res.status(404).json({ ok: false, error: 'No thread' });
  res.json({ ok: true, thread: t });
});

module.exports = router;
