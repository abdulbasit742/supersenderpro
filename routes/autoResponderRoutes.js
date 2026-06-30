// routes/autoResponderRoutes.js — Inbound #3: business-hours auto-responder.
//
// Wire-up (server.js) — call onInbound BEFORE the AI in the message router:
//   const auto = require('./lib/inbound/autoResponder');
//   // inside messageRouter.handleInbound, near the top:
//   //   const a = auto.onInbound(phone); if (a.reply) { sendReply(a.reply); /* still record + emit */ }
//   app.use('/api/autoresponder', require('./routes/autoResponderRoutes'));

const express = require('express');
const router = express.Router();

let auto;
try { auto = require('../lib/inbound/autoResponder'); } catch { auto = null; }

function ensure(res) {
  if (!auto) { res.status(503).json({ ok: false, error: 'Auto-responder not available' }); return false; }
  return true;
}

// Current open/closed + config.
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, open: auto.isOpen() });
});

// Update config. Body: { greeting?, awayMessage?, openHour?, closeHour?, awayThrottleHours? }
router.post('/config', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, config: auto.configure(req.body || {}) });
});

// Simulate an inbound to see what would auto-reply. Body: { phone }
router.post('/test', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...auto.onInbound((req.body || {}).phone) });
});

module.exports = router;
