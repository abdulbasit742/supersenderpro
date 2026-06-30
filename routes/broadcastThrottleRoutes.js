'use strict';
/**
 * Self-mountable router for the Broadcast Throttle / Safe-Send Queue.
 * Mount with:  app.use('/api/broadcast-throttle', require('./routes/broadcastThrottleRoutes'));
 * Does NOT touch server.js.
 */
const express = require('express');
const router = express.Router();
const tq = require('../lib/broadcastThrottle/throttleQueue');

// Optional integrations with sibling features. Loaded lazily + safely so this
// router works even if those modules are absent.
function safeRequire(p) {
  try {
    return require(p);
  } catch (_) {
    return null;
  }
}
const consent = safeRequire('../lib/consent/consentStore');
const numberHealth = safeRequire('../lib/numberHealth/numberHealth');
const sendTime = safeRequire('../lib/sendTime/sendTime');

function buildHooks() {
  return {
    isConsented: consent && consent.isConsented ? (p) => consent.isConsented(p) : null,
    numberHealthOk: numberHealth && numberHealth.isHealthy ? (p) => numberHealth.isHealthy(p) : null,
    inSendWindow: sendTime && sendTime.inWindow ? (p, ts) => sendTime.inWindow(p, ts) : null,
    send: null // real WhatsApp send is wired by the host app; dry-run otherwise
  };
}

router.post('/enqueue', (req, res) => {
  const { recipients, payload, template, priority } = req.body || {};
  if (!Array.isArray(recipients) || !recipients.length) {
    return res.status(400).json({ error: 'recipients[] required' });
  }
  const result = tq.enqueue(recipients, { payload, template, priority }, buildHooks());
  res.json(result);
});

router.post('/dispatch', async (req, res) => {
  const { dryRun, max, caps } = req.body || {};
  try {
    const result = await tq.dispatch({ dryRun, max, caps }, buildHooks());
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message ? e.message : e) });
  }
});

router.get('/stats', (req, res) => {
  res.json(tq.stats());
});

router.post('/reset', (req, res) => {
  tq.reset();
  res.json({ ok: true });
});

module.exports = router;
