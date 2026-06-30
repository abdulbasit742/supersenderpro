const express = require('express');
const attribution = require('../lib/attribution');

// Multi-touch Attribution API. Fully read-only. Falls back to the static batch
// snapshot on the dashboard side, so this is only needed for on-demand queries.
//
// Mount in server.js next to the other `/api` route mounts:
//   // ATTRIBUTION HOOK
//   app.use('/api', require('./routes/attributionRoutes')());
module.exports = function () {
  const router = express.Router();

  // Full attribution snapshot for one store (all 5 models).
  router.get('/attribution/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: attribution.buildSnapshot(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // Workspace-wide (all stores).
  router.get('/attribution/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: attribution.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // A single model's channel + campaign breakdown.
  router.get('/attribution/model/:model', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const snap = attribution.buildSnapshot(storeId);
      const m = snap.models[req.params.model];
      if (!m) return res.status(404).json({ success: false, error: 'unknown model', models: attribution.MODELS });
      res.json({ success: true, model: req.params.model, ...m });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
