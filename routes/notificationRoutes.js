// routes/notificationRoutes.js — Notifications #1: preferences + delivery.
//
// Wire-up (server.js) — give it channel senders, then route system alerts through it:
//   const notifier = require('./lib/notifications/notifier');
//   notifier.setChannelSender('whatsapp', async (to, subj, body) => guardedSend(`${to}@c.us`, `*${subj}*\n${body}`));
//   notifier.setChannelSender('email', async (to, subj, body) => sendEmail(to, subj, body));
//   app.use('/api/notifications', require('./routes/notificationRoutes'));
//   // then e.g. health monitor alert -> notifier.notify(ownerId, 'system_health', { subject, body, urgent:true })

const express = require('express');
const router = express.Router();

let notifier;
try { notifier = require('../lib/notifications/notifier'); } catch { notifier = null; }

function ensure(res) {
  if (!notifier) { res.status(503).json({ ok: false, error: 'Notifier not available' }); return false; }
  return true;
}

// Get prefs (+ available event types/channels for a settings UI).
router.get('/:userId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, prefs: notifier.getPrefs(req.params.userId), eventTypes: notifier.EVENT_TYPES, channels: notifier.CHANNELS });
});

// Update prefs. Body: partial prefs (whatsapp, email, subscriptions, quiet hours...).
router.put('/:userId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, prefs: notifier.setPrefs(req.params.userId, req.body || {}) });
});

// Test notification. Body: { type, subject?, body?, urgent? }
router.post('/:userId/test', async (req, res) => {
  if (!ensure(res)) return;
  const { type, subject, body, urgent } = req.body || {};
  try { res.json({ ok: true, ...(await notifier.notify(req.params.userId, type || 'system_health', { subject, body, urgent })) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
