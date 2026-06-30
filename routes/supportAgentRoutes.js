// routes/supportAgentRoutes.js
// Self-mountable Express router for the 24/7 Conversational Support Agent.
// Mount in server.js with a single line (no constructor args required):
//     app.use('/api/support-agent', require('./routes/supportAgentRoutes'));

const express = require('express');
const router = express.Router();
const supportAgent = require('../ai/agents/supportAgent');

// Best-effort human handoff. watiCopilot lives in the monolith and is optional
// here; we never let a handoff failure break the reply path.
let watiCopilot = null;
try { watiCopilot = require('../lib/watiCopilot'); } catch { /* optional */ }

// POST /api/support-agent/message
// Body: { storeId?, phone, message, customerName?, autoEscalate? }
router.post('/message', async (req, res) => {
  try {
    const { storeId = 'default_store', phone, message, customerName, autoEscalate = true } = req.body || {};
    if (!phone || !message) {
      return res.status(400).json({ success: false, error: 'phone and message are required' });
    }

    const result = await supportAgent.handleMessage({ storeId, phone, message, customerName });

    let handoff = null;
    if (result.shouldEscalate && autoEscalate && watiCopilot && typeof watiCopilot.escalateToHuman === 'function') {
      try {
        handoff = await watiCopilot.escalateToHuman(storeId, phone, result.escalationReason || 'Support agent handoff');
      } catch (e) {
        handoff = { success: false, error: e.message };
      }
    }

    res.json({ success: true, ...result, handoff });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/support-agent/simulate — stateless test (no memory writes side effects matter less).
router.post('/simulate', async (req, res) => {
  try {
    const { storeId = 'default_store', phone = 'sim-' + Date.now(), message } = req.body || {};
    if (!message) return res.status(400).json({ success: false, error: 'message is required' });
    const result = await supportAgent.handleMessage({ storeId, phone, message });
    supportAgent.resetConversation(storeId, phone);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/support-agent/conversations/:phone
router.get('/conversations/:phone', (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    res.json({ success: true, conversation: supportAgent.getConversation(storeId, req.params.phone) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/support-agent/conversations/:phone
router.delete('/conversations/:phone', (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    res.json({ success: true, ...supportAgent.resetConversation(storeId, req.params.phone) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/support-agent/conversations/:phone/mute  Body: { muted: bool }
router.post('/conversations/:phone/mute', (req, res) => {
  try {
    const storeId = req.body.storeId || 'default_store';
    const muted = req.body.muted !== false;
    res.json({ success: true, thread: supportAgent.setMuted(storeId, req.params.phone, muted) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/support-agent/kb
router.get('/kb', (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    res.json({ success: true, kb: supportAgent.getKnowledgeBase(storeId) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/support-agent/kb  Body: partial KB (faqs, products, about, tone, policies, model, ...)
router.put('/kb', (req, res) => {
  try {
    const storeId = req.body.storeId || req.query.storeId || 'default_store';
    const updates = { ...req.body };
    delete updates.storeId;
    res.json({ success: true, kb: supportAgent.setKnowledgeBase(storeId, updates) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/support-agent/health
router.get('/health', async (req, res) => {
  try {
    const storeId = req.query.storeId || 'default_store';
    res.json({ success: true, ...(await supportAgent.health(storeId)) });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
