// routes/marketingDripRoutes.js — Marketing Automation #2: drip campaigns.
//
// Wire-up (server.js), AFTER the WA client exists:
//   const drip = require('./lib/marketing/dripEngine');
//   drip.setSender(async (contact, { text, mediaPath }) => {
//     const to = String(contact.phone).includes('@') ? contact.phone : `${contact.phone}@c.us`;
//     if (mediaPath) await waClient.sendMessage(to, await mediaFromPath(mediaPath), { caption: text });
//     else await waClient.sendMessage(to, text);
//   });
//   // run the executor every minute:
//   require('node-cron').schedule('* * * * *', () => drip.tick().catch(()=>{}));
//   const dripRouter = require('./routes/marketingDripRoutes');
//   dripRouter.setSegmentResolver((segmentId, storeId) => resolveSegmentContacts(segmentId, storeId));
//   app.use('/api/marketing/drips', dripRouter);

const express = require('express');
const router = express.Router();

let drip;
try { drip = require('../lib/marketing/dripEngine'); } catch { drip = null; }

// Optional resolver so /enroll-segment can pull a segment's contacts. Returns an array of contacts.
let segmentResolver = null;
router.setSegmentResolver = (fn) => { segmentResolver = typeof fn === 'function' ? fn : null; };

function ensure(res) {
  if (!drip) { res.status(503).json({ ok: false, error: 'Drip engine not available' }); return false; }
  return true;
}

// Create a drip. Body: { storeId?, name, steps:[...], segmentId? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try {
    const { storeId, name, steps, segmentId } = req.body || {};
    const camp = drip.createCampaign(storeId, name, steps, { segmentId });
    res.json({ ok: true, campaign: camp });
  } catch (e) {
    res.status(400).json({ ok: false, error: e.message });
  }
});

router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, campaigns: drip.listCampaigns(req.query.storeId) });
});

router.get('/:id', (req, res) => {
  if (!ensure(res)) return;
  const camp = drip.getCampaign(req.params.id);
  if (!camp) return res.status(404).json({ ok: false, error: 'Campaign not found' });
  res.json({ ok: true, campaign: camp, stats: drip.getStats(camp.id) });
});

// Pause/resume.
router.post('/:id/status', (req, res) => {
  if (!ensure(res)) return;
  const camp = drip.setCampaignStatus(req.params.id, (req.body || {}).status);
  if (!camp) return res.status(404).json({ ok: false, error: 'Campaign not found' });
  res.json({ ok: true, campaign: camp });
});

// Enroll explicit contacts. Body: { contacts: [{ phone, ... }] }
router.post('/:id/enroll', (req, res) => {
  if (!ensure(res)) return;
  const contacts = (req.body || {}).contacts || [];
  res.json({ ok: true, ...drip.enrollMany(req.params.id, contacts) });
});

// Enroll a whole segment (needs a segment resolver wired).
router.post('/:id/enroll-segment', (req, res) => {
  if (!ensure(res)) return;
  const camp = drip.getCampaign(req.params.id);
  if (!camp) return res.status(404).json({ ok: false, error: 'Campaign not found' });
  const segmentId = (req.body || {}).segmentId || camp.segmentId;
  if (!segmentId) return res.status(400).json({ ok: false, error: 'segmentId required' });
  if (!segmentResolver) return res.status(503).json({ ok: false, error: 'No segment resolver wired' });
  try {
    const contacts = segmentResolver(segmentId, camp.storeId) || [];
    res.json({ ok: true, segmentId, ...drip.enrollMany(camp.id, contacts) });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

router.get('/:id/enrollments', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, enrollments: drip.listEnrollments(req.params.id) });
});

// Manually trigger the executor once (useful for testing without waiting for the cron).
router.post('/tick', async (req, res) => {
  if (!ensure(res)) return;
  try {
    res.json({ ok: true, result: await drip.tick() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
