// routes/webhookRetryRoutes.js — API #4: webhook retry queue.
//
// Wire-up (server.js) — deliver via the SSRF-safe dispatcher; enqueue on dispatch failure:
//   const retry = require('./lib/api/webhookRetry');
//   retry.setDeliver(async (item) => {
//     const r = await dispatcher.dispatchOne(item.url, item.event, item.payload); // returns {ok}
//     return { ok: r.ok };
//   });
//   require('node-cron').schedule('* * * * *', () => retry.tick().catch(()=>{}));
//   app.use('/api/webhook-retry', require('./routes/webhookRetryRoutes'));

const express = require('express');
const router = express.Router();

let retry;
try { retry = require('../lib/api/webhookRetry'); } catch { retry = null; }

function ensure(res) {
  if (!retry) { res.status(503).json({ ok: false, error: 'Webhook retry not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, stats: retry.stats() });
});

// Dead-letter list.
router.get('/dead', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, dead: retry.listDead(Number(req.query.limit) || 100) });
});

// Replay a dead item. 
router.post('/dead/:id/replay', (req, res) => {
  if (!ensure(res)) return;
  const item = retry.replayDead(req.params.id);
  if (!item) return res.status(404).json({ ok: false, error: 'Not found' });
  res.json({ ok: true, item });
});

// Manual tick (testing).
router.post('/tick', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, result: await retry.tick() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
