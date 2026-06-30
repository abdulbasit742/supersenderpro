const express = require('express');
const analytics = require('../lib/analyticsInsights');

// Analytics & Insights live API. Mirrors the read-only style of the other route
// modules. To wire it into the (still-monolithic) server.js, add next to the
// other `app.use('/api', ...)` mounts:
//
//   // ANALYTICS INSIGHTS HOOK
//   app.use('/api', require('./routes/analyticsInsightsRoutes')());
//
// The dashboard works without this too — it falls back to the static snapshot
// written by scripts/analytics-batch.js. The live API is just for on-demand,
// always-fresh queries once server.js is modularised (roadmap Phase 3).
module.exports = function () {
  const router = express.Router();

  // Full workspace-wide snapshot (all stores aggregated + primary store detail).
  router.get('/analytics-insights/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: analytics.buildAllSnapshot() });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Full snapshot for a single store.
  router.get('/analytics-insights/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: analytics.buildStoreSnapshot(storeId) });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // Section endpoints for lighter, targeted fetches.
  const section = (name) => (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, [name]: analytics.buildStoreSnapshot(storeId)[name] });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  };
  router.get('/analytics-insights/revenue', section('revenue'));
  router.get('/analytics-insights/conversion', section('conversion'));
  router.get('/analytics-insights/channels', section('channels'));
  router.get('/analytics-insights/churn', section('churn'));

  return router;
};
