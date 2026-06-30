// routes/broadcastPreviewRoutes.js — Sending #3: broadcast dry-run.
//
// Wire-up (server.js):
//   const prev = require('./lib/sending/broadcastPreview');
//   prev.configure({
//     resolveAudience: (t) => require('./lib/broadcastHub').listTargets && [] /* or segment resolver */,
//     canSend:        (p) => require('./lib/compliance/consentLedger').canSend(p),
//     renderMessage:  (m, c) => require('./lib/templates/templateManager').renderInline(m, c).text,
//     capacity:       (tid) => require('./lib/channels/numberManager').stats(tid)
//   });
//   app.use('/api/broadcast/preview', require('./routes/broadcastPreviewRoutes'));
//
// Frontend calls this when the user clicks "Preview" before "Send".

const express = require('express');
const router = express.Router();

let prev;
try { prev = require('../lib/sending/broadcastPreview'); } catch { prev = null; }

// Body: { target, message, tenantId?, delaySec? }
router.post('/', (req, res) => {
  if (!prev) return res.status(503).json({ ok: false, error: 'Preview not available' });
  try { res.json({ ok: true, preview: prev.preview(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
