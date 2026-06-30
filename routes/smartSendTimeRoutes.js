// routes/smartSendTimeRoutes.js — Sending #3: smart send time.
//
// Wire-up (server.js) — record engagement from the inbound router, use when scheduling:
//   const sst = require('./lib/sending/smartSendTime');
//   // in messageRouter on inbound: sst.recordEngagement(phone);
//   // when scheduling a drip/broadcast to a contact: const { atMs } = sst.nextSendTime(phone);
//   app.use('/api/send-time', require('./routes/smartSendTimeRoutes'));

const express = require('express');
const router = express.Router();

let sst;
try { sst = require('../lib/sending/smartSendTime'); } catch { sst = null; }

function ensure(res) {
  if (!sst) { res.status(503).json({ ok: false, error: 'Smart send time not available' }); return false; }
  return true;
}

// Best hour + next send time for a contact.
router.get('/:phone', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, bestHour: sst.bestHour(req.params.phone), next: sst.nextSendTime(req.params.phone) });
});

// Record an engagement (usually called internally, exposed for testing). Body: { phone }
router.post('/engagement', (req, res) => {
  if (!ensure(res)) return;
  sst.recordEngagement((req.body || {}).phone);
  res.json({ ok: true });
});

// Config. Body: { defaultHour?, quietStartHour?, quietEndHour? }
router.post('/config', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, config: sst.configure(req.body || {}) });
});

module.exports = router;
