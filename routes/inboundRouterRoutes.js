// routes/inboundRouterRoutes.js — Inbound #1: unified message router.
//
// Wire-up (server.js) — connect the engines, then call the router from your WA message handler:
//   const router = require('./lib/inbound/messageRouter');
//   const c360 = require('./lib/crm/customer360');
//   router.configure({
//     recordEvent:   (p, ev) => c360.recordEvent(p, ev),
//     profileExists: (p) => !!c360.getProfile(p),
//     captureLead:   (payload) => require('./lib/leads/leadCapture').capture(payload),
//     aiSupport:     (p, t) => require('./lib/support/aiSupportAgent').handleMessage(p, t),
//     emitEvent:     (e, ctx) => require('./lib/workflows/workflowEngine').emit(e, ctx),
//     setOptStatus:  (p, on) => c360.upsertProfile(p, { optedIn: on })
//   });
//   // in the whatsapp-web.js 'message' handler:
//   const result = await router.handleInbound({ phone: from, text: body, name });
//   if (result.reply) await waClient.sendMessage(`${from}@c.us`, result.reply);
//
//   app.use('/api/inbound', require('./routes/inboundRouterRoutes')); // for testing/integrations

const express = require('express');
const router = express.Router();

let messageRouter;
try { messageRouter = require('../lib/inbound/messageRouter'); } catch { messageRouter = null; }

// Process an inbound message. Body: { phone, text, name?, source? }
router.post('/message', async (req, res) => {
  if (!messageRouter) return res.status(503).json({ ok: false, error: 'Inbound router not available' });
  const { phone, text, name, source } = req.body || {};
  try {
    const result = await messageRouter.handleInbound({ phone, text, name, source });
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
