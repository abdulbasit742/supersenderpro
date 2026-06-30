// routes/insightsRoutes.js — Analytics & Insights department.
//
// Wire-up (server.js): inject loaders that read your existing data, then mount.
//   const insights = require('./lib/insights/insightsEngine');
//   insights.setLoaders({
//     orders:    () => orders,      // the in-memory arrays server.js already keeps
//     customers: () => customers,
//     messages:  () => inbox
//   });
//   app.use('/api/insights', require('./routes/insightsRoutes'));
//
// All endpoints accept optional ?from=ISO&to=ISO to scope by date.

const express = require('express');
const router = express.Router();

let insights;
try { insights = require('../lib/insights/insightsEngine'); } catch { insights = null; }

function ensure(res) {
  if (!insights) { res.status(503).json({ ok: false, error: 'Insights engine not available' }); return false; }
  return true;
}
function range(req) { return { from: req.query.from, to: req.query.to }; }

// One-call founder dashboard (everything below in a single payload).
router.get('/dashboard', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...insights.dashboard(range(req)) });
});

router.get('/revenue', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, revenue: insights.revenue(range(req)) });
});

router.get('/customers', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, customers: insights.customerBreakdown(range(req)) });
});

router.get('/channels', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, channels: insights.channelPerformance(range(req)) });
});

router.get('/conversion', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, conversion: insights.conversion(range(req)) });
});

module.exports = router;
