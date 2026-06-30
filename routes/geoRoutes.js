const express = require('express');
const geo = require('../lib/geoAnalytics');

// Geographic Analytics API. Fully read-only. Dashboard falls back to the static
// batch snapshot, so this is only for on-demand queries.
//
// Mount in server.js next to the other `/api` route mounts:
//   // GEO HOOK
//   app.use('/api', require('./routes/geoRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/geo/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: geo.buildSnapshot(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/geo/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: geo.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
