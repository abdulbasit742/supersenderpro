// routes/schedulerRoutes.js — Sending #2: outbound scheduler.
//
// Wire-up (server.js) — use the GUARDED sender + segment broadcast, then run tick on a cron:
//   const scheduler = require('./lib/sending/scheduler');
//   scheduler.setMessageSender(guardedSend); // from send guard #1
//   scheduler.setBroadcastRunner(({segmentId,message,mediaPath}) =>
//     require('./lib/marketing/segmentBroadcast').broadcastToSegment({ segmentId, message, mediaPath }));
//   require('node-cron').schedule('* * * * *', () => scheduler.tick().catch(()=>{}));
//   app.use('/api/scheduler', require('./routes/schedulerRoutes'));

const express = require('express');
const router = express.Router();

let scheduler;
try { scheduler = require('../lib/sending/scheduler'); } catch { scheduler = null; }

function ensure(res) {
  if (!scheduler) { res.status(503).json({ ok: false, error: 'Scheduler not available' }); return false; }
  return true;
}

// Schedule a job. Body (message): { type:'message', runAt, recurring?, phone, text }
//                Body (broadcast): { type:'broadcast', runAt, recurring?, segmentId, message, mediaPath? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, job: scheduler.schedule(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, jobs: scheduler.list({ status: req.query.status, type: req.query.type }) });
});

router.post('/:id/cancel', (req, res) => {
  if (!ensure(res)) return;
  const j = scheduler.cancel(req.params.id);
  if (!j) return res.status(404).json({ ok: false, error: 'Job not found' });
  res.json({ ok: true, job: j });
});

// Manual tick (testing).
router.post('/tick', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, result: await scheduler.tick() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
