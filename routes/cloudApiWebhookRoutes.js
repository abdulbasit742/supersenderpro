// routes/cloudApiWebhookRoutes.js — Inbound #2: WhatsApp Cloud API webhook.
//
// Wire-up (server.js) — connect to the same message router as the unofficial engine:
//   const cloud = require('./lib/inbound/cloudApiWebhook');
//   const router = require('./lib/inbound/messageRouter');
//   cloud.setHandler((m) => router.handleInbound(m));
//   // raw body needed for signature verification:
//   app.use('/webhooks/whatsapp', express.json({ verify: (req,_res,buf) => { req.rawBody = buf; } }),
//           require('./routes/cloudApiWebhookRoutes'));
//
// In Meta's dashboard, set the callback URL to https://yourdomain/webhooks/whatsapp and the verify
// token to process.env.WHATSAPP_VERIFY_TOKEN.

const express = require('express');
const router = express.Router();

let cloud;
try { cloud = require('../lib/inbound/cloudApiWebhook'); } catch { cloud = null; }

function ensure(res) {
  if (!cloud) { res.status(503).json({ ok: false, error: 'Cloud API webhook not available' }); return false; }
  return true;
}

// GET verification handshake (Meta).
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  const v = cloud.verifyChallenge(req.query);
  if (v.ok) return res.status(200).send(v.challenge);
  res.sendStatus(403);
});

// POST inbound messages.
router.post('/', async (req, res) => {
  if (!ensure(res)) return;
  // verify signature if app secret configured
  if (!cloud.verifySignature(req.rawBody || JSON.stringify(req.body || {}), req.headers['x-hub-signature-256'])) {
    return res.sendStatus(401);
  }
  // Always 200 fast so Meta doesn't retry; process async-ish.
  res.sendStatus(200);
  try { await cloud.handlePayload(req.body || {}); } catch { /* logged elsewhere */ }
});

module.exports = router;
