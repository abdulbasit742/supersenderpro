const express = require('express');
const cohorts = require('../lib/cohorts');

// Cohort Retention + LTV API. Fully read-only. Dashboard falls back to the
// static batch snapshot, so this is only for on-demand queries.
//
// Mount in server.js next to the other `/api` route mounts:
//   // COHORTS HOOK
//   app.use('/api', require('./routes/cohortsRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/cohorts/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: cohorts.buildSnapshot(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/cohorts/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: cohorts.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
