const express = require('express');
const forecasting = require('../lib/forecasting');

// Revenue/Demand Forecast API. Fully read-only. Dashboard falls back to the
// static batch snapshot, so this is only for on-demand queries.
//
// Mount in server.js next to the other `/api` route mounts:
//   // FORECAST HOOK
//   app.use('/api', require('./routes/forecastRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/forecast/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const horizon = Math.min(90, Math.max(7, parseInt(req.query.horizon, 10) || 30));
      res.json({ success: true, snapshot: forecasting.buildSnapshot(storeId, horizon) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/forecast/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: forecasting.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
