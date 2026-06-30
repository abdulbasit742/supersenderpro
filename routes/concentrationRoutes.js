const express = require('express');
const concentration = require('../lib/concentration');

// Revenue Concentration API. Fully read-only.
//
// Mount in server.js next to the other `/api` route mounts:
//   // CONCENTRATION HOOK
//   app.use('/api', require('./routes/concentrationRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/concentration/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: concentration.buildSnapshot(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/concentration/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: concentration.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
