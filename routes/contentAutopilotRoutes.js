// routes/contentAutopilotRoutes.js
// REST surface for the Social Content Autopilot.
// Mount in server.js:  app.use('/api/content-autopilot', require('./routes/contentAutopilotRoutes'));
const express = require('express');
const router = express.Router();
let ap; try { ap = require('../lib/contentAutopilot'); } catch (e) { ap = null; }

function guard(res) {
  if (!ap) { res.status(503).json({ ok: false, error: 'Content Autopilot module not loaded' }); return false; }
  return true;
}

// Health + counts per queue folder.
router.get('/status', (req, res) => {
  if (!guard(res)) return;
  res.json({ ok: true, ...ap.status() });
});

// Generate AI content -> queue one job per platform.
// body: { topic, platforms:["instagram",...], tone, mediaPath, scheduledAt }
router.post('/generate', async (req, res) => {
  if (!guard(res)) return;
  try {
    const jobs = await ap.generateContent(req.body || {});
    res.json({ ok: true, created: jobs.length, jobs });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// List jobs by status folder. ?status=queued|posted|failed|generated|inbox
router.get('/queue', (req, res) => {
  if (!guard(res)) return;
  const status = (req.query.status || 'queued').toString();
  res.json({ ok: true, status, jobs: ap.listJobs(status) });
});

// Schedule a queued job. body: { id, when (ISO) }
router.post('/schedule', (req, res) => {
  if (!guard(res)) return;
  try {
    const { id, when } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
    res.json({ ok: true, job: ap.scheduleJob(id, when) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Publish all due jobs now. Safe to call from cron / n8n on a schedule.
router.post('/publish', async (req, res) => {
  if (!guard(res)) return;
  try {
    res.json({ ok: true, ...(await ap.publishDue()) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
