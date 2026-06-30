// routes/workflowRoutes.js — Workflow Builder department.
//
// Wire-up (server.js): register action handlers once, then mount + emit events from the app.
//   const wf = require('./lib/workflows/workflowEngine');
//   wf.registerAction('send_whatsapp', async (p, ctx) => waClient.sendMessage(p.to || ctx.contact, p.text));
//   wf.registerAction('add_to_segment', async (p, ctx) => segmentEngine.createSegment(...));
//   wf.registerAction('award_points', async (p, ctx) => loyalty.earn(ctx.contact, p.amount));
//   wf.registerAction('start_drip', async (p, ctx) => drip.enrollContact(p.campaignId, { phone: ctx.contact }));
//   app.use('/api/workflows', require('./routes/workflowRoutes'));
// Then anywhere: wf.emit('order.paid', { order, contact: order.customerPhone });

const express = require('express');
const router = express.Router();

let wf;
try { wf = require('../lib/workflows/workflowEngine'); } catch { wf = null; }

function ensure(res) {
  if (!wf) { res.status(503).json({ ok: false, error: 'Workflow engine not available' }); return false; }
  return true;
}

// List registered action types (for building the workflow UI).
router.get('/actions', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, actions: wf.registeredActions() });
});

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, workflows: wf.listWorkflows(req.query.trigger) });
});

// Create. Body: { name?, trigger, conditions?, match?, actions:[{type,params}], haltOnError? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, workflow: wf.createWorkflow(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const w = wf.getWorkflow(req.params.id);
  if (!w) return res.status(404).json({ ok: false, error: 'Workflow not found' });
  res.json({ ok: true, workflow: w });
});

router.post('/:id/active', (req, res) => {
  if (!ensure(res)) return;
  const w = wf.setActive(req.params.id, (req.body || {}).active);
  if (!w) return res.status(404).json({ ok: false, error: 'Workflow not found' });
  res.json({ ok: true, workflow: w });
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...wf.deleteWorkflow(req.params.id) });
});

// Manually fire an event (great for testing a workflow). Body: { event, ctx }
router.post('/emit', async (req, res) => {
  if (!ensure(res)) return;
  const { event, ctx } = req.body || {};
  if (!event) return res.status(400).json({ ok: false, error: 'event is required' });
  try { res.json({ ok: true, ...(await wf.emit(event, ctx || {})) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
