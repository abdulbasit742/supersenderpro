// routes/qualityGuardRoutes.js — Sending #6: message quality / ban-risk check.
//
// Wire-up (server.js):
//   app.use('/api/quality', require('./routes/qualityGuardRoutes'));
//
// In the compose/broadcast path, score before sending:
//   const q = require('./lib/sending/qualityGuard').analyze(message);
//   if (q.block) return res.status(400).json({ ok:false, error:'message too spammy', ...q });

const express = require('express');
const router = express.Router();

let guard;
try { guard = require('../lib/sending/qualityGuard'); } catch { guard = null; }

// Score a draft. Body: { message, blockThreshold? }
router.post('/check', (req, res) => {
  if (!guard) return res.status(503).json({ ok: false, error: 'Quality guard not available' });
  const { message, blockThreshold } = req.body || {};
  res.json({ ok: true, ...guard.analyze(message, { blockThreshold }) });
});

module.exports = router;
