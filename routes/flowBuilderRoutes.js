// routes/flowBuilderRoutes.js — Bots #1: no-code chatbot flows.
//
// Wire-up (server.js) — let the inbound router try the bot BEFORE the AI agent:
//   const flows = require('./lib/bots/flowBuilder');
//   // inside messageRouter (or before aiReply): const r = flows.step({ phone, text });
//   //   if (r.active) { for (const m of r.messages) await guardedSend(`${phone}@c.us`, m); return; }
//   app.use('/api/bots/flows', require('./routes/flowBuilderRoutes'));

const express = require('express');
const router = express.Router();

let flows;
try { flows = require('../lib/bots/flowBuilder'); } catch { flows = null; }

function ensure(res) {
  if (!flows) { res.status(503).json({ ok: false, error: 'Flow builder not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, flows: flows.listFlows() });
});

// Create. Body: { name, trigger?, startNodeId, nodes }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, flow: flows.createFlow(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.post('/:id/active', (req, res) => {
  if (!ensure(res)) return;
  const f = flows.setActive(req.params.id, (req.body || {}).active);
  if (!f) return res.status(404).json({ ok: false, error: 'Flow not found' });
  res.json({ ok: true, flow: f });
});

// Test a step (simulate an inbound reply). Body: { phone, text }
router.post('/step', (req, res) => {
  if (!ensure(res)) return;
  const { phone, text } = req.body || {};
  res.json({ ok: true, ...flows.step({ phone, text }) });
});

// Reset a contact's session.
router.post('/reset', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...flows.resetSession((req.body || {}).phone) });
});

module.exports = router;
