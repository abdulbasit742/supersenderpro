// routes/aiSupportRoutes.js — Support #1: AI customer support agent.
//
// Wire-up (server.js):
//   const support = require('./lib/support/aiSupportAgent');
//   support.setProfileFetcher((phone) => require('./lib/crm/customer360').getProfile(phone));
//   support.setEventEmitter((e,ctx) => require('./lib/workflows/workflowEngine').emit(e,ctx));
//   // optional: support.setKbLookup((q) => searchYourFaqs(q));
//   app.use('/api/support', require('./routes/aiSupportRoutes'));
//
// On an inbound WhatsApp message, call POST /api/support/message and, if !escalated, send reply back
// via the WA client. If escalated, route to a human / notify the owner.

const express = require('express');
const router = express.Router();

let support;
try { support = require('../lib/support/aiSupportAgent'); } catch { support = null; }

function ensure(res) {
  if (!support) { res.status(503).json({ ok: false, error: 'AI support not available' }); return false; }
  return true;
}

// Handle an inbound message. Body: { phone, message }
router.post('/message', async (req, res) => {
  if (!ensure(res)) return;
  const { phone, message } = req.body || {};
  try {
    const out = await support.handleMessage(phone, message);
    res.json({ ok: true, ...out });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Threads (optionally by status: open|escalated|resolved).
router.get('/threads', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, threads: support.listThreads({ status: req.query.status }) });
});
router.get('/threads/:phone', (req, res) => {
  if (!ensure(res)) return;
  const t = support.getThread(req.params.phone);
  if (!t) return res.status(404).json({ ok: false, error: 'No thread' });
  res.json({ ok: true, thread: t });
});
router.post('/threads/:phone/resolve', (req, res) => {
  if (!ensure(res)) return;
  const t = support.resolveThread(req.params.phone);
  if (!t) return res.status(404).json({ ok: false, error: 'No thread' });
  res.json({ ok: true, thread: t });
});

module.exports = router;
