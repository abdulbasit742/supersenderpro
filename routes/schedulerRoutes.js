// routes/schedulerRoutes.js — Sending #2: outbound scheduler.
//
// Wire-up (server.js) — give it a sender that uses the GUARDED send + broadcast hub:
//   const scheduler = require('./lib/sending/scheduler');
//   const guard = require('./lib/sending/sendGuard');
//   const guardedSend = guard.wrap(async (to, text) => waClient.sendMessage(to, text));
//   const hub = require('./lib/broadcastHub');
//   scheduler.setSender(async (job) => {
//     if (job.kind === 'broadcast') return hub.sendToAll({ message: job.message, mediaPath: job.mediaPath, targets: job.targets || { all: true } });
//     return guardedSend(`${String(job.to).replace(/@.*/,'')}@c.us`, job.message);
//   });
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

// Schedule. Body: { kind, runAt, message, mediaPath?, to?, targets?, repeat? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, job: scheduler.schedule(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// List. Query: ?status=scheduled|sent|failed|cancelled
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, jobs: scheduler.list({ status: req.query.status }) });
});

// Cancel.
router.post('/:id/cancel', (req, res) => {
  if (!ensure(res)) return;
  const job = scheduler.cancel(req.params.id);
  if (!job) return res.status(404).json({ ok: false, error: 'Job not found' });
  res.json({ ok: true, job });
});

// Manual tick (testing).
router.post('/tick', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, result: await scheduler.tick() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
