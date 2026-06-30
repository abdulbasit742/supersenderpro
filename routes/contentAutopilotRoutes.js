// routes/contentAutopilotRoutes.js
// REST surface for the Social Content Autopilot.
// Mount in server.js:  app.use('/api/content-autopilot', require('./routes/contentAutopilotRoutes'));
const express = require('express');
const router = express.Router();
let ap; try { ap = require('../lib/contentAutopilot'); } catch (e) { ap = null; }
let sched; try { sched = require('../lib/contentAutopilot/scheduler'); } catch (e) { sched = null; }
let vhook; try { vhook = require('../lib/contentAutopilot/videoHook'); } catch (e) { vhook = null; }

function guard(res) {
  if (!ap) { res.status(503).json({ ok: false, error: 'Content Autopilot module not loaded' }); return false; }
  return true;
}

// Health + counts per queue folder.
router.get('/status', (req, res) => {
  if (!guard(res)) return;
  res.json({ ok: true, ...ap.status(), scheduler: sched ? sched.status() : null });
});

// Generate AI content -> queue one job per platform.
// body: { topic, platforms:["instagram",...], tone, mediaPath, mediaUrl, scheduledAt }
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

// Publish all due jobs now (manual trigger; scheduler does this automatically).
router.post('/publish', async (req, res) => {
  if (!guard(res)) return;
  try { res.json({ ok: true, ...(await ap.publishDue()) }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// Publish one job immediately by id. body: { id }
router.post('/publish-now', async (req, res) => {
  if (!guard(res)) return;
  try {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ ok: false, error: 'id is required' });
    res.json({ ok: true, ...(await ap.publishNow(id)) });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

// --- scheduler (the autopilot loop) ---------------------------------------
router.post('/scheduler/start', (req, res) => {
  if (!sched) return res.status(503).json({ ok: false, error: 'scheduler not loaded' });
  res.json(sched.start((req.body && req.body.minutes) || undefined));
});
router.post('/scheduler/stop', (req, res) => {
  if (!sched) return res.status(503).json({ ok: false, error: 'scheduler not loaded' });
  res.json(sched.stop());
});
router.get('/scheduler/status', (req, res) => {
  if (!sched) return res.status(503).json({ ok: false, error: 'scheduler not loaded' });
  res.json({ ok: true, ...sched.status() });
});

// --- video hook (GPU pipeline glue) ---------------------------------------
// List finished videos your GPU pipeline dropped in inbox/.
router.get('/media/ready', (req, res) => {
  if (!vhook) return res.status(503).json({ ok: false, error: 'video hook not loaded' });
  res.json({ ok: true, media: vhook.listReadyMedia() });
});
// Attach an inbox video to a queued job. body: { id, fileName }
router.post('/media/attach', (req, res) => {
  if (!vhook || !ap) return res.status(503).json({ ok: false, error: 'modules not loaded' });
  try {
    const { id, fileName } = req.body || {};
    if (!id || !fileName) return res.status(400).json({ ok: false, error: 'id and fileName are required' });
    res.json({ ok: true, job: vhook.attachMediaToJob(ap, id, fileName) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
