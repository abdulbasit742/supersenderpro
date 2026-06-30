// routes/workflowRoutes.js — Workflow Builder API.
//
// Wire-up (server.js), AFTER registering action handlers:
//   const wf = require('./lib/workflowEngine');
//   wf.registerAction('send_message', async (cfg, ctx) => waClient.sendMessage(ctx.contact.phone, cfg.text));
//   wf.registerAction('add_tag', async (cfg, ctx) => crm.addTag(ctx.contact.id, cfg.tag));
//   wf.registerAction('broadcast', async (cfg) => broadcastHub.sendToAll({ message: cfg.message, targets: cfg.targets }));
//   wf.registerAction('trigger_n8n', async (cfg, ctx) => n8nBridge.triggerWorkflow(cfg.kind, ctx));
//   app.use('/api/workflows', require('./routes/workflowRoutes'));
//
// Then fire events from anywhere business logic happens:
//   wf.emit('order_created', { contact, order });

const express = require('express');
const router = express.Router();

let wf;
try { wf = require('../lib/workflowEngine'); } catch { wf = null; }

function ensure(res) {
  if (!wf) { res.status(503).json({ ok: false, error: 'Workflow engine not available' }); return false; }
  return true;
}

// List workflows (optionally by store).
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, workflows: wf.listWorkflows(req.query.storeId) });
});

// Which action verbs are currently wired (for the builder UI).
router.get('/actions', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, actions: wf.getRegisteredActions() });
});

// Recent run history (for a "what fired" panel).
router.get('/runs', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, runs: wf.getRuns(Number(req.query.limit) || 50) });
});

// Create. Body: { name, trigger, conditions?, actions:[{type,config}], active?, storeId? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try {
    res.json({ ok: true, workflow: wf.createWorkflow(req.body || {}) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const w = wf.getWorkflow(req.params.id);
  if (!w) return res.status(404).json({ ok: false, error: 'Workflow not found' });
  res.json({ ok: true, workflow: w });
});

router.put('/:id', (req, res) => {
  if (!ensure(res)) return;
  const w = wf.updateWorkflow(req.params.id, req.body || {});
  if (!w) return res.status(404).json({ ok: false, error: 'Workflow not found' });
  res.json({ ok: true, workflow: w });
});

router.delete('/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...wf.deleteWorkflow(req.params.id) });
});

// Manual test-fire: emit an event with a sample context to see which workflows run.
// Body: { event, context? }
router.post('/emit', async (req, res) => {
  if (!ensure(res)) return;
  const { event, context } = req.body || {};
  if (!event) return res.status(400).json({ ok: false, error: 'event is required' });
  try {
    const result = await wf.emit(event, context || {});
    res.json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
