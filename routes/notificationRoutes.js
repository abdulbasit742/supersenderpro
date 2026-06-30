// routes/notificationRoutes.js — Notify #1: notification preferences.
//
// Wire-up (server.js) — give it channels, then route internal alerts through it:
//   const notify = require('./lib/notifications/notifications');
//   notify.setChannelSender('whatsapp', (to, subject, body) => guardedSend(`${to}@c.us`, body));
//   notify.setChannelSender('email', (to, subject, body) => sendEmail(to, subject, body));
//   app.use('/api/notifications', require('./routes/notificationRoutes'));
//   // e.g. health monitor notifier -> notify.notify(ownerId, { type:'system_health', body, urgent:true })

const express = require('express');
const router = express.Router();

let notify;
try { notify = require('../lib/notifications/notifications'); } catch { notify = null; }

function ensure(res) {
  if (!notify) { res.status(503).json({ ok: false, error: 'Notifications not available' }); return false; }
  return true;
}

// Options for building a prefs UI.
router.get('/options', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, eventTypes: notify.EVENT_TYPES, channels: notify.CHANNELS });
});

// Get a user's prefs.
router.get('/:userId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, prefs: notify.getPrefs(req.params.userId) });
});

// Update prefs. Body: { channels?:{event:channel}, muted?, quietStartHour?, quietEndHour?, contact?:{phone,email} }
router.put('/:userId', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, prefs: notify.setPrefs(req.params.userId, req.body || {}) });
});

// Test a notification. Body: { type, body, urgent? }
router.post('/:userId/test', async (req, res) => {
  if (!ensure(res)) return;
  const { type, body, urgent } = req.body || {};
  const out = await notify.notify(req.params.userId, { type, body: body || 'Test notification', urgent });
  res.json({ ok: true, ...out });
});

module.exports = router;
