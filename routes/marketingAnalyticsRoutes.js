// routes/marketingAnalyticsRoutes.js — Marketing Automation #5: reporting.
//
// Wire-up (server.js):
//   app.use('/api/marketing/analytics', require('./routes/marketingAnalyticsRoutes'));
//
// Record events from wherever sends/opens/clicks happen, e.g. when the drip executor or segment
// broadcast sends, call analytics.record({ campaignId, type:'sent', contact, segmentId }).

const express = require('express');
const router = express.Router();

let analytics;
try { analytics = require('../lib/marketing/campaignAnalytics'); } catch { analytics = null; }

function ensure(res) {
  if (!analytics) { res.status(503).json({ ok: false, error: 'Analytics engine not available' }); return false; }
  return true;
}

// Record one event. Body: { campaignId, type, contact?, segmentId?, revenue?, channel? }
router.post('/events', (req, res) => {
  if (!ensure(res)) return;
  try {
    res.json({ ok: true, event: analytics.record(req.body || {}) });
  } catch (e) { res.status(400).json({ ok: false, error: e.message }); }
});

// Record many. Body: { events: [...] }
router.post('/events/bulk', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, ...analytics.recordMany((req.body || {}).events || []) });
});

// Campaign report (rates + revenue).
router.get('/campaign/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, report: analytics.campaignReport(req.params.id) });
});

// Per-segment breakdown for a campaign.
router.get('/campaign/:id/by-segment', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, segments: analytics.campaignBySegment(req.params.id) });
});

// Segment rollup across all campaigns.
router.get('/segment/:id', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, report: analytics.segmentReport(req.params.id) });
});

// Overall summary. Query: ?from=ISO&to=ISO
router.get('/overview', (req, res) => {
  if (!ensure(res)) return;
  res.json({ ok: true, overview: analytics.overview({ from: req.query.from, to: req.query.to }) });
});

module.exports = router;
