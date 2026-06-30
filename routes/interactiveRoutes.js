// routes/interactiveRoutes.js — WhatsApp #2: interactive messages.
//
// Wire-up (server.js):
//   app.use('/api/whatsapp/interactive', require('./routes/interactiveRoutes'));
//
// Build a payload then POST it to the Cloud API (or send via your engine):
//   const payload = require('./lib/whatsapp/interactiveMessages').buttons({ to, body, buttons:[...] });
//   await postToCloudApi(payload);

const express = require('express');
const router = express.Router();

let im;
try { im = require('../lib/whatsapp/interactiveMessages'); } catch { im = null; }

function ensure(res) {
  if (!im) { res.status(503).json({ ok: false, error: 'Interactive messages not available' }); return false; }
  return true;
}

// Build a reply-buttons payload. Body: { to, body, buttons:[{id,title}], header?, footer? }
router.post('/buttons', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, payload: im.buttons(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Build a list-menu payload. Body: { to, body, buttonText, sections:[...], header?, footer? }
router.post('/list', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, payload: im.list(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
