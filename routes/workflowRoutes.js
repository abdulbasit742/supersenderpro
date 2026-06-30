// routes/workflowRoutes.js — Workflow Builder #1: if-this-then-that automation.
//
// Wire-up (server.js) — register action handlers that call the real departments, then mount:
//   const wf = require('./lib/workflows/workflowEngine');
//   wf.registerAction('send_message', async (p, ctx) => waClient.sendMessage(`${p.to||ctx.phone}@c.us`, p.text));
//   wf.registerAction('add_tag',      async (p, ctx) => customer360.upsertProfile(ctx.phone, { tags:[p.tag] }));
//   wf.registerAction('enroll_drip',  async (p, ctx) => dripEngine.enrollContact(p.campaignId, { phone: ctx.phone }));
//   wf.registerAction('open_dunning', async (p, ctx) => dunning.openCase({ phone: ctx.phone }, p.planId));
//   app.use('/api/workflows', require('./routes/workflowRoutes'));
//
// Then emit events from the relevant flows:
//   on verified payment: wf.emit('payment_received', { phone, amount, planId });
//   on new order:        wf.emit('order', { phone, amount, orderId });

const express = require('express');
const router = express.Router();

let wf;
try { wf = require('../lib/workflows/workflowEngine'); } catch { wf = null; }

function ensure(res) {
  if (!wf) { res.status(503).json({ ok: false, error: 'Workflow engine not available' }); return false; }
  return true;
}

// List workflows (optionally by trigger).
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, workflows: wf.listWorkflows(req.query.trigger) });
});

// Available action types + condition operators (for building a UI).
router.get('/meta', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, actions: wf.registeredActions(), operators: wf.VALID_OPS });
});

// Create. Body: { name, trigger, match?, conditions?, actions:[{type,params}] }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, workflow: wf.createWorkflow(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/runs', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, runs: wf.recentRuns(Number(req.query.limit) || 50) });
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

// Manually fire an event (testing). Body: { event, ctx }
router.post('/emit', async (req, res) => {
  if (!ensure(res)) return;
  const { event, ctx } = req.body || {};
  if (!event) return res.status(400).json({ ok: false, error: 'event required' });
  try { res.json({ ok: true, result: await wf.emit(event, ctx || {}) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
