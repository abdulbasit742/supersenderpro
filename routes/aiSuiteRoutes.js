// routes/aiSuiteRoutes.js
// Self-mountable Express router for the AI Suite control panel + aggregator.
// Mount in server.js with a single line:
//     app.use('/api/ai-suite', require('./routes/aiSuiteRoutes'));
// Then open /api/ai-suite/panel in a browser.
//
// Tip: to mount the ENTIRE suite at once, use the mounter instead:
//     require('./lib/aiSuite/aiSuite').mountAll(app);

const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();
const suite = require('../lib/aiSuite/aiSuite');

// GET /api/ai-suite/health   (aggregated health across the suite)
router.get('/health', async (req, res) => {
  try { res.json({ success: true, ...(await suite.aggregateHealth()) }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/ai-suite/features  (registry list)
router.get('/features', (req, res) => {
  try { res.json({ success: true, features: suite.listFeatures() }); }
  catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// GET /api/ai-suite/panel  (serve the control panel HTML)
router.get('/panel', (req, res) => {
  const p = path.join(__dirname, '..', 'public', 'ai-suite.html');
  if (!fs.existsSync(p)) return res.status(404).send('control panel not found');
  res.setHeader('Content-Type', 'text/html');
  fs.createReadStream(p).pipe(res);
});

module.exports = router;
