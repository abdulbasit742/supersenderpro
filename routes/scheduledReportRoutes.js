// routes/scheduledReportRoutes.js — Reports #1: scheduled owner digests.
//
// Wire-up (server.js):
//   const reports = require('./lib/reports/scheduledReports');
//   reports.setDashboardProvider(() => require('./lib/analytics/ownerDashboard').getDashboard());
//   reports.setSender(guardedSend); // send guard #1
//   require('node-cron').schedule('0 * * * *', () => reports.tick().catch(()=>{}));
//   app.use('/api/reports', require('./routes/scheduledReportRoutes'));

const express = require('express');
const router = express.Router();

let reports;
try { reports = require('../lib/reports/scheduledReports'); } catch { reports = null; }

function ensure(res) {
  if (!reports) { res.status(503).json({ ok: false, error: 'Reports not available' }); return false; }
  return true;
}

// List scheduled reports.
router.get('/', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, reports: reports.listReports() });
});

// Schedule. Body: { ownerPhone, frequency:'daily'|'weekly', label? }
router.post('/', (req, res) => {
  if (!ensure(res)) return;
  try { res.json({ ok: true, report: reports.scheduleReport(req.body || {}) }); }
  catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Toggle active. Body: { active }
router.post('/:id/active', (req, res) => {
  if (!ensure(res)) return;
  const r = reports.setActive(req.params.id, (req.body || {}).active);
  if (!r) return res.status(404).json({ ok: false, error: 'Report not found' });
  res.json({ ok: true, report: r });
});

// Send now (also previews the digest text).
router.post('/:id/send', async (req, res) => {
  if (!ensure(res)) return;
  const out = await reports.sendNow(req.params.id);
  if (!out) return res.status(404).json({ ok: false, error: 'Report not found' });
  res.json({ ok: true, ...out });
});

module.exports = router;
