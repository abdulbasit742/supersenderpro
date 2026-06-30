// routes/tenantWebhookRoutes.js — Integrations #1: tenant outbound webhooks.
//
// Wire-up (server.js) — bridge platform events to tenant webhooks alongside the workflow engine:
//   const tw = require('./lib/integrations/tenantWebhooks');
//   // wherever you emit workflow events, also fan to tenant webhooks:
//   //   workflow.emit('payment_received', ctx); tw.emit('payment_received', ctx);
//   app.use('/api/integrations/webhooks', require('./routes/tenantWebhookRoutes'));

const express = require('express');
const router = express.Router();

let tw;
try { tw = require('../lib/integrations/tenantWebhooks'); } catch { tw = null; }

function ensure(res) {
  if (!tw) { res.status(503).json({ ok: false, error: 'Tenant webhooks not available' }); return false; }
  return true;
}

// Supported events (for a UI).
router.get('/events', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, events: tw.supportedEvents() });
});

// List subscriptions. Query: ?tenantId=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, subscriptions: tw.listSubs(req.query.tenantId) });
});

// Subscribe. Body: { tenantId, url, events?, secret? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, subscription: tw.subscribe(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Unsubscribe.
router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...tw.unsubscribe(req.params.id) });
});

// Test-fire an event (manual). Body: { event, ctx }
router.post('/emit', async (req, res) => {
  if (!ensure(res)) return;
  const { event, ctx } = req.body || {};
  if (!event) return res.status(400).json({ ok: false, error: 'event required' });
  try { res.json({ ok: true, result: await tw.emit(event, ctx || {}) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
