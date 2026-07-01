// routes/reportsRoutes.js — Reports #1: owner daily digest.
//
// Wire-up (server.js):
//   const digest = require('./lib/reports/dailyDigest');
//   const dash = require('./lib/analytics/ownerDashboard');
//   digest.setDashboardProvider(() => dash.getDashboard());
//   digest.setSender(guardedSend); // anti-ban guard #1
//   app.use('/api/reports', require('./routes/reportsRoutes'));
//
//   // schedule it every morning at 8am (scheduler #2 or node-cron):
//   require('node-cron').schedule('0 8 * * *', () => digest.sendNow(process.env.OWNER_PHONE).catch(()=>{}));

const express = require('express');
const router = express.Router();

let digest;
try { digest = require('../lib/reports/dailyDigest'); } catch { digest = null; }

function ensure(res) {
  if (!digest) { res.status(503).json({ ok: false, error: 'Reports not available' }); return false; }
  return true;
}

// Preview today's digest text (no send).
router.get('/daily/preview', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, text: digest.build() });
});

// Send the digest now. Body: { ownerPhone }
router.post('/daily/send', async (req, res) => {
  if (!ensure(res)) return;
  const ownerPhone = (req.body || {}).ownerPhone || process.env.OWNER_PHONE;
  try { res.json({ ok: true, ...(await digest.sendNow(ownerPhone)) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
