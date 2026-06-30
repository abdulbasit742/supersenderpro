// routes/conversationQARoutes.js
// Feature #100 - AI Conversation QA Scorer router (self-mountable).
// Mount in server.js:  app.use('/api/conversation-qa', require('./routes/conversationQARoutes'));

'use strict';

const express = require('express');
const router = express.Router();
const qa = require('../lib/conversationQA/qaScorer');

// POST /score - deterministic score only (no model call)
router.post('/score', (req, res) => {
  try {
    const result = qa.scoreConversation(req.body || {});
    res.json({ ok: true, result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// POST /score-and-coach - score + optional Ollama coaching, persists by default
router.post('/score-and-coach', async (req, res) => {
  try {
    const { conversation, ...opts } = req.body || {};
    const result = await qa.scoreAndCoach(conversation || req.body, opts);
    res.json({ ok: true, result });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// GET /scores - list stored scores (filterable)
router.get('/scores', (req, res) => {
  const { tenantId, minOverall, grade } = req.query;
  res.json({ ok: true, scores: qa.listScores({ tenantId, minOverall: minOverall != null ? Number(minOverall) : undefined, grade }) });
});

// GET /aggregate - team/tenant QA rollup
router.get('/aggregate', (req, res) => {
  const { tenantId, grade } = req.query;
  res.json({ ok: true, summary: qa.aggregate({ tenantId, grade }) });
});

module.exports = router;
