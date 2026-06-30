// routes/numberManagerRoutes.js — Channels #1: multi-number manager.
//
// Wire-up (server.js):
//   app.use('/api/channels/numbers', require('./routes/numberManagerRoutes'));
//   // when sending in bulk, pick a number first, then record:
//   const nm = require('./lib/channels/numberManager');
//   const num = nm.pickNumber(tenantId); if (!num) // all capped -> defer
//   await sendFromNumber(num.phone, to, text); nm.recordSend(num.id, 1);

const express = require('express');
const router = express.Router();

let nm;
try { nm = require('../lib/channels/numberManager'); } catch { nm = null; }

function ensure(res) {
  if (!nm) { res.status(503).json({ ok: false, error: 'Number manager not available' }); return false; }
  return true;
}

// List numbers for a tenant. Query: ?tenantId=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, numbers: nm.listNumbers(req.query.tenantId), stats: nm.stats(req.query.tenantId) });
});

// Register. Body: { tenantId, phone, label?, dailyCap? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, number: nm.registerNumber(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Change status. Body: { status: warming|active|paused|banned }
router.post('/:id/status', (req, res) => {
  if (!ensure(res)) return;
  try {
    const n = nm.setStatus(req.params.id, (req.body || {}).status);
    if (!n) return res.status(404).json({ ok: false, error: 'Number not found' });
    res.json({ ok: true, number: n });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Pick the best number to send from. Query: ?tenantId=
router.get('/pick', (req, res) => {
  if (!ensure(res)) return;
  const n = nm.pickNumber(req.query.tenantId);
  if (!n) return res.status(409).json({ ok: false, error: 'no number with capacity right now' });
  res.json({ ok: true, number: n });
});

module.exports = router;
