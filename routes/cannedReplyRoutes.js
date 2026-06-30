// routes/cannedReplyRoutes.js — Inbox #2: canned replies.
//
// Wire-up (server.js):
//   app.use('/api/inbox/canned', require('./routes/cannedReplyRoutes'));
//
// In the inbox UI: as an agent types '/', call /search?q=, show matches, on pick call /:idOrShortcut/render
// with the contact's data to get personalised text, then send it.

const express = require('express');
const router = express.Router();

let canned;
try { canned = require('../lib/inbox/cannedReplies'); } catch { canned = null; }

function ensure(res) {
  if (!canned) { res.status(503).json({ ok: false, error: 'Canned replies not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, replies: canned.listReplies(req.query.category) });
});

// Autocomplete search. Query: ?q=
router.get('/search', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, replies: canned.search(req.query.q || '') });
});

// Create. Body: { shortcut, body, title?, category? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, reply: canned.createReply(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  const r = canned.updateReply(req.params.id, req.body || {});
  if (!r) return res.status(404).json({ ok: false, error: 'Reply not found' });
  res.json({ ok: true, reply: r });
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...canned.deleteReply(req.params.id) });
});

// Render with contact data. Body: { data: {...} }. :ref can be an id or /shortcut.
router.post('/:ref/render', (req, res) => {
  if (!ensure(res)) return;
  const out = canned.render(req.params.ref, (req.body || {}).data || {});
  if (!out) return res.status(404).json({ ok: false, error: 'Reply not found' });
  res.json({ ok: true, ...out });
});

module.exports = router;
