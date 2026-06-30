// routes/weeklyReportRoutes.js — Reports #2: weekly digest.
//
// Wire-up (server.js):
//   const weekly = require('./lib/reports/weeklyDigest');
//   weekly.setDashboardProvider(() => require('./lib/analytics/ownerDashboard').getDashboard());
//   weekly.setSender(guardedSend);
//   require('node-cron').schedule('0 9 * * 1', () => weekly.sendNow(process.env.OWNER_PHONE).catch(()=>{})); // Mon 9am
//   app.use('/api/reports/weekly', require('./routes/weeklyReportRoutes'));

const express = require('express');
const router = express.Router();

let weekly;
try { weekly = require('../lib/reports/weeklyDigest'); } catch { weekly = null; }

function ensure(res) {
  if (!weekly) { res.status(503).json({ ok: false, error: 'Weekly report not available' }); return false; }
  return true;
}

router.get('/preview', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, text: weekly.build() });
});

router.post('/send', async (req, res) => {
  if (!ensure(res)) return;
  const ownerPhone = (req.body || {}).ownerPhone || process.env.OWNER_PHONE;
  try { res.json({ ok: true, ...(await weekly.sendNow(ownerPhone)) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

module.exports = router;
