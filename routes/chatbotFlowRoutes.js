// routes/chatbotFlowRoutes.js
// Feature #92 - Visual Chatbot Flow Builder routes.
// Self-mountable: app.use(require('./routes/chatbotFlowRoutes'))
// No new dependencies; uses express (already in repo).

'use strict';

const express = require('express');
const router = express.Router();
const flow = require('../lib/chatbotFlow/flowBuilder');

function tenantOf(req) {
  return req.headers['x-tenant-id'] || (req.body && req.body.tenantId) || (req.query && req.query.tenantId);
}

router.get('/api/chatbot-flow/health', (req, res) => {
  res.json(flow.health());
});

router.post('/api/chatbot-flow/flows', (req, res) => {
  try {
    const f = flow.defineFlow(tenantOf(req), req.body || {});
    res.json({ ok: true, flow: f });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/api/chatbot-flow/flows', (req, res) => {
  try {
    res.json({ ok: true, flows: flow.listFlows(tenantOf(req)) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/api/chatbot-flow/flows/:id', (req, res) => {
  try {
    const f = flow.getFlow(tenantOf(req), req.params.id);
    if (!f) return res.status(404).json({ ok: false, error: 'not found' });
    res.json({ ok: true, flow: f });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.delete('/api/chatbot-flow/flows/:id', (req, res) => {
  try {
    res.json({ ok: flow.deleteFlow(tenantOf(req), req.params.id) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Start or advance a contact through a flow.
// body: { flowId, contact, reply?, aiPhrasing? }
router.post('/api/chatbot-flow/run', async (req, res) => {
  try {
    const { flowId, contact, reply, aiPhrasing } = req.body || {};
    const out = await flow.run(tenantOf(req), flowId, contact, reply, { aiPhrasing: !!aiPhrasing });
    res.json({ ok: true, result: out });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.post('/api/chatbot-flow/reset', (req, res) => {
  try {
    const { flowId, contact } = req.body || {};
    res.json({ ok: flow.resetSession(tenantOf(req), flowId, contact) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
