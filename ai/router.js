// router.js – placeholder router for AI endpoints
const express = require('express');
const router = express.Router();
const { processPrompt } = require('../ai/aiBrain');

// POST /ai/prompt – receives a JSON body { prompt: "..." }
router.post('/prompt', async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
    const response = await processPrompt(prompt);
    res.json({ response });
  } catch (e) {
    console.error('[AI Router] Error:', e);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
