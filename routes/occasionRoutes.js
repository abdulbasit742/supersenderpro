// routes/occasionRoutes.js — Marketing #7: birthday/anniversary campaigns.
//
// Wire-up (server.js):
//   const occ = require('./lib/marketing/occasionCampaigns');
//   occ.setSender(guardedSend);
//   require('node-cron').schedule('0 10 * * *', () => occ.sweep().catch(()=>{})); // daily 10am
//   app.use('/api/marketing/occasions', require('./routes/occasionRoutes'));

const express = require('express');
const router = express.Router();

let occ;
try { occ = require('../lib/marketing/occasionCampaigns'); } catch { occ = null; }

function ensure(res) {
  if (!occ) { res.status(503).json({ ok: false, error: 'Occasion campaigns not available' }); return false; }
  return true;
}

// Set a date. Body: { phone, name?, type, date }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, record: occ.setDate(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// List (optionally by contact). Query: ?phone=
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, dates: occ.listDates(req.query.phone) });
});

// Configure messages. Body: { birthday:{message}, anniversary:{message}, ... }
router.post('/config', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, config: occ.configure(req.body || {}) });
});

// Manual sweep (testing).
router.post('/sweep', async (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, result: await occ.sweep() }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

module.exports = router;
