// routes/menuFlowRoutes.js — Flows #1: menu chatbot.
//
// Wire-up (server.js) — put the flow IN FRONT of the AI agent in the message router:
//   const flows = require('./lib/flows/menuFlow');
//   // in messageRouter handling: if flows.inFlow(phone) -> flows.advance(phone, text)
//   //   else const f = flows.matchFlow(text); if (f) flows.start(phone, f.id); else AI agent
//   flows.setActionHook((action, ctx) => {
//     if (action === 'human') return require('./lib/inbox/inbox').recordInbound(ctx.phone, '[menu: talk to human]'), 'Connecting you to our team.';
//     if (action === 'catalog') return 'Here is our catalog: ...';
//   });
//   app.use('/api/flows', require('./routes/menuFlowRoutes'));

const express = require('express');
const router = express.Router();

let flows;
try { flows = require('../lib/flows/menuFlow'); } catch { flows = null; }

function ensure(res) {
  if (!flows) { res.status(503).json({ ok: false, error: 'Flows not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, flows: flows.listFlows() });
});

// Create. Body: { name, startNode, nodes, triggerKeywords?, active? }
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

// Simulate: start a flow for a phone. Body: { phone, flowId }
router.post('/start', (req, res) => {
  if (!ensure(res)) return;
  const { phone, flowId } = req.body || {};
  const out = flows.start(phone, flowId);
  if (!out) return res.status(404).json({ ok: false, error: 'Flow not found' });
  res.json({ ok: true, ...out });
});

// Simulate: advance with input. Body: { phone, input }
router.post('/advance', async (req, res) => {
  if (!ensure(res)) return;
  const { phone, input } = req.body || {};
  const out = await flows.advance(phone, input);
  if (!out) return res.status(404).json({ ok: false, error: 'Contact not in a flow' });
  res.json({ ok: true, ...out });
});

module.exports = router;
