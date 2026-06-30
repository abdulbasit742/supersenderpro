// routes/marketingSegmentBroadcastRoutes.js — Marketing Automation #3: broadcast to a segment.
//
// Wire-up (server.js), after broadcastHub has its WA client and segments have a contact loader:
//   const segBroadcast = require('./lib/marketing/segmentBroadcast');
//   segBroadcast.setContactLoader((storeId) => loadCrmContacts(storeId));
//   app.use('/api/marketing/segment-broadcast', require('./routes/marketingSegmentBroadcastRoutes'));
//
// Frontend: pick a segment, type a message, hit send. One click -> everyone in that segment.

const express = require('express');
const router = express.Router();

let sb;
try { sb = require('../lib/marketing/segmentBroadcast'); } catch { sb = null; }

function ensure(res) {
  if (!sb) { res.status(503).json({ ok: false, error: 'Segment broadcast not available' }); return false; }
  return true;
}

// Preview: who/how many would get it. Query: ?storeId=&limit=
router.get('/:segmentId/preview', (req, res) => {
  if (!ensure(res)) return;
  try {
    const out = sb.previewSegmentBroadcast(req.params.segmentId, req.query.storeId, Number(req.query.limit) || 100);
    if (!out.segment) return res.status(404).json({ ok: false, error: 'Segment not found' });
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Send. Body: { message, mediaPath?, storeId?, delayMs? }
router.post('/:segmentId/send', async (req, res) => {
  if (!ensure(res)) return;
  const { message, mediaPath, storeId, delayMs } = req.body || {};
  try {
    const result = await sb.broadcastToSegment({
      segmentId: req.params.segmentId,
      message, mediaPath, storeId, delayMs
    });
    res.json(result);
  } catch (e) {
    // surfaces "WhatsApp client is not connected", "segment not found", etc.
    res.status(400).json({ ok: false, error: e.message });
  }
});

module.exports = router;
