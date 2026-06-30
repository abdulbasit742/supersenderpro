// routes/sendGuardRoutes.js — Sending #1: anti-ban send guard status.
//
// Wire-up (server.js) — wrap the WA sender ONCE and make everything use the guarded version:
//   const guard = require('./lib/sending/sendGuard');
//   guard.setOptOutCheck((phone) => {
//     const p = require('./lib/crm/customer360').getProfile(phone);
//     return !p || p.optedIn !== false; // don't send to opted-out
//   });
//   const guardedSend = guard.wrap(async (to, text) => waClient.sendMessage(to, text));
//   // hand guardedSend to broadcastHub / dripEngine / dunning / support instead of raw waClient
//   app.use('/api/sending', require('./routes/sendGuardRoutes'));

const express = require('express');
const router = express.Router();

let guard;
try { guard = require('../lib/sending/sendGuard'); } catch { guard = null; }

function ensure(res) {
  if (!guard) { res.status(503).json({ ok: false, error: 'Send guard not available' }); return false; }
  return true;
}

// Usage snapshot for a number. /api/sending/usage/:phone
router.get('/usage/:phone', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, usage: guard.usage(req.params.phone) });
});

// Update guard config. Body: { perHour?, perDay?, minDelayMs?, maxDelayMs?, quietStartHour?, quietEndHour? }
router.post('/config', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, config: guard.configure(req.body || {}) });
});

// Dry check: would a send go through right now? Query: ?phone=&text=
router.get('/check', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, verdict: guard.check(req.query.phone || '', req.query.text || '') });
});

module.exports = router;
