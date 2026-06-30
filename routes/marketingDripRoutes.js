// routes/marketingDripRoutes.js — Marketing Automation #2: drip campaigns.
//
// Wire-up (server.js):
//   const dripEngine = require('./lib/marketing/dripEngine');
//   // route each drip message through the broadcast hub / WA client:
//   dripEngine.setSender(async (contact, { text, mediaPath }) =>
//     broadcastHub.sendToAll({ message: text, mediaPath, targets: { ids: [contact.phone] } }));
//   const dripRouter = require('./routes/marketingDripRoutes');
//   dripRouter.setSegmentResolver((segmentId) => resolveSegmentToContacts(segmentId)); // optional
//   app.use('/api/marketing/drips', dripRouter);
//
//   // run the executor every minute:
//   require('node-cron').schedule('* * * * *', () => dripEngine.tick().catch(()=>{}));

const express = require('express');
const router = express.Router();

let engine;
try { engine = require('../lib/marketing/dripEngine'); } catch { engine = null; }

// Optional: resolve a segmentId -> contacts[] so you can enroll a whole segment in one call.
let segmentResolver = null;
router.setSegmentResolver = (fn) => { segmentResolver = typeof fn === 'function' ? fn : null; };

function ensure(res) {
  if (!engine) { res.status(503).json({ ok: false, error: 'Drip engine not available' }); return false; }
  return true;
}

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, drips: engine.listDrips(req.query.storeId) });
});

// Create a drip. Body: { storeId?, name, steps:[...], segmentId?, status? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { storeId, name, steps, segmentId, status } = req.body || {};
    const drip = engine.createDrip(storeId, name, steps, { segmentId, status });
    res.json({ ok: true, drip });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const drip = engine.getDrip(req.params.id);
  if (!drip) return res.status(404).json({ ok: false, error: 'Drip not found' });
  res.json({ ok: true, drip, stats: engine.getStats(drip.id) });
});

// Activate / pause / draft a drip.
router.post('/:id/status', (req, res) => {
  if (!ensure(res)) return;
  const drip = engine.setDripStatus(req.params.id, (req.body || {}).status);
  if (!drip) return res.status(404).json({ ok: false, error: 'Drip not found' });
  res.json({ ok: true, drip });
});

// Enroll contacts. Body: { contacts:[...] } OR { segmentId } (uses the injected resolver).
router.post('/:id/enroll', (req, res) => {
  if (!ensure(res)) return;
  try {
    let contacts = (req.body && req.body.contacts) || null;
    if (!contacts && req.body && req.body.segmentId) {
      if (!segmentResolver) return res.status(400).json({ ok: false, error: 'No segment resolver wired; pass contacts directly' });
      contacts = segmentResolver(req.body.segmentId) || [];
    }
    if (!Array.isArray(contacts) || !contacts.length) {
      return res.status(400).json({ ok: false, error: 'Provide contacts[] or a resolvable segmentId' });
    }
    res.json({ ok: true, ...engine.enroll(req.params.id, contacts) });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

// Stop a contact (unsubscribe / converted).
router.post('/:id/stop', (req, res) => {
  if (!ensure(res)) return;
  const phone = (req.body || {}).phone;
  if (!phone) return res.status(400).json({ ok: false, error: 'phone is required' });
  res.json({ ok: true, ...engine.stopContact(req.params.id, phone) });
});

// Stats + runs for a drip.
router.get('/:id/stats', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, stats: engine.getStats(req.params.id) });
});

// Manual trigger of the executor (useful for testing without waiting for cron).
router.post('/tick', async (req, res) => {
  if (!ensure(res)) return;
  try {
    res.json({ ok: true, ...(await engine.tick()) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
