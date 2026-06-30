// routes/batchRunnerRoutes.js — Sending #5: resumable batch broadcasts.
//
// Wire-up (server.js) — send via guarded sender (+ number pool), tick on an interval:
//   const batch = require('./lib/sending/batchRunner');
//   batch.setSender(async (to, text, media) => {
//     const r = await guardedSend(`${to}@c.us`, text); return { sent: !!(r && r.sent !== false) };
//   });
//   require('node-cron').schedule('* * * * *', () => batch.tick().catch(()=>{}));
//   app.use('/api/broadcast-jobs', require('./routes/batchRunnerRoutes'));

const express = require('express');
const router = express.Router();

let batch;
try { batch = require('../lib/sending/batchRunner'); } catch { batch = null; }

function ensure(res) {
  if (!batch) { res.status(503).json({ ok: false, error: 'Batch runner not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, jobs: batch.listJobs() });
});

// Create. Body: { recipients:[...], message, mediaPath?, batchSize?, campaignId? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, job: batch.createJob(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const j = batch.getJob(req.params.id);
  if (!j) return res.status(404).json({ ok: false, error: 'Job not found' });
  res.json({ ok: true, job: j });
});

// Pause/resume/cancel. Body: { status: 'running'|'paused'|'cancelled' }
router.post('/:id/status', (req, res) => {
  if (!ensure(res)) return;
  const j = batch.setStatus(req.params.id, (req.body || {}).status);
  if (!j) return res.status(404).json({ ok: false, error: 'Job not found' });
  res.json({ ok: true, job: j });
});

// Manual tick (testing).
router.post('/tick', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, result: await batch.tick() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
