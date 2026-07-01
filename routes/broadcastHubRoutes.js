// routes/broadcastHubRoutes.js — REST surface for the one-click broadcast hub.
//
// Wire-up (in server.js, AFTER the WhatsApp client is created):
//   const broadcastHub = require('./lib/broadcastHub');
//   broadcastHub.setWhatsAppClient(waClient);        // same client the rest of the app uses
//   app.use('/api/broadcast', require('./routes/broadcastHubRoutes'));
//
// Frontend (lovable-app) just needs a button that POSTs to /api/broadcast/send with
//   { message, mediaPath?, targets: { all: true } }   // or { kinds: [...] } / { ids: [...] }

const express = require('express');
const router = express.Router();

let hub;
try { hub = require('../lib/broadcastHub'); } catch (e) { hub = null; }

function ensureHub(res) {
  if (!hub) { res.status(503).json({ ok: false, error: 'Broadcast hub not available' }); return false; }
  return true;
}

// List everything we can send to, grouped by kind. Powers the recipient picker.
router.get('/targets', async (req, res) => {
  if (!ensureHub(res)) return;
  try {
    const targets = await hub.listTargets();
    res.json({
      ok: true,
      counts: {
        chats: targets.chats.length,
        groups: targets.groups.length,
        channels: targets.channels.length
      },
      ...targets
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// One-click broadcast.
// Body: { message, mediaPath?, targets?: { all?:bool, kinds?:string[], ids?:string[] }, delayMs? }
router.post('/send', async (req, res) => {
  if (!ensureHub(res)) return;
  const { message, mediaPath, targets, delayMs } = req.body || {};
  if (!message && !mediaPath) {
    return res.status(400).json({ ok: false, error: 'message or mediaPath is required' });
  }
  try {
    const result = await hub.sendToAll({
      message,
      mediaPath,
      targets: targets || { all: true },
      delayMs
    });
    res.json({ ok: true, ...result });
  } catch (e) {
    // e.g. "WhatsApp client is not connected"
    res.status(503).json({ ok: false, error: e.message });
  }
});

// Recent broadcast runs (for a history panel).
router.get('/log', (req, res) => {
  if (!ensureHub(res)) return;
  try {
    res.json({ ok: true, runs: hub.getBroadcastLog(Number(req.query.limit) || 50) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
