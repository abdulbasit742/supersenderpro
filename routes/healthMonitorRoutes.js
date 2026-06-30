// routes/healthMonitorRoutes.js — Ops #1: health endpoints.
//
// Wire-up (server.js) — register checks for the things that actually matter + alert the owner:
//   const health = require('./lib/health/healthMonitor');
//   health.registerCheck('whatsapp', async () => ({ ok: !!(waClients.get('default')?.isReady) }));
//   health.registerCheck('ai', async () => ({ ok: await pingOllama() }));
//   health.registerCheck('queue', async () => require('./lib/queueManager').getQueueHealth());
//   health.setNotifier(async (status, summary) =>
//     guardedSend(`${process.env.OWNER_PHONE}@c.us`, `⚠️ System ${status.toUpperCase()} — check dashboard`));
//   require('node-cron').schedule('*/5 * * * *', () => health.runAll().catch(()=>{})); // every 5 min
//   app.use('/healthz', require('./routes/healthMonitorRoutes'));

const express = require('express');
const router = express.Router();

let health;
try { health = require('../lib/health/healthMonitor'); } catch { health = null; }

// Fast: returns the last rollup. 200 if ok/degraded, 503 if down (so load balancers can act).
router.get('/', (req, res) => {
  if (!health) return res.status(503).json({ ok: false, status: 'unknown' });
  const snap = health.lastSnapshot();
  const code = snap.status === 'down' ? 503 : 200;
  res.status(code).json({ ok: snap.status !== 'down', ...snap });
});

// Full: run all checks now.
router.get('/run', async (req, res) => {
  if (!health) return res.status(503).json({ ok: false, status: 'unknown' });
  const snap = await health.runAll();
  const code = snap.status === 'down' ? 503 : 200;
  res.status(code).json({ ok: snap.status !== 'down', ...snap });
});

module.exports = router;
