// routes/aiSuiteSelfTestRoutes.js
// Self-mountable Express router to trigger the AI-suite self-test on demand.
// Mount in server.js with a single line:
//     app.use('/api/ai-suite/selftest', require('./routes/aiSuiteSelfTestRoutes'));
//
// NOTE: this forks child node processes; gate it behind admin auth in prod.

const express = require('express');
const router = express.Router();
const selfTest = require('../lib/aiSuite/selfTest');

// GET /api/ai-suite/selftest/list  (which smoke tests exist)
router.get('/list', (req, res) => {
  try { res.json({ success: true, tests: selfTest.discover(req.query.filter) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// POST /api/ai-suite/selftest/run   Body: { filter?, timeoutMs?, concurrency? }
router.post('/run', async (req, res) => {
  try {
    const { filter, timeoutMs, concurrency } = req.body || {};
    const result = await selfTest.run({ filter, timeoutMs: timeoutMs || 30000, concurrency: concurrency || 4 });
    res.status(result.ok ? 200 : 207).json({ success: true, ...result });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = router;
