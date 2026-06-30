const express = require('express');
const clv = require('../lib/clv');

// Predictive CLV API. Fully read-only; phones masked.
//
// Mount in server.js next to the other `/api` route mounts:
//   // CLV HOOK
//   app.use('/api', require('./routes/clvRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/clv/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const horizonMonths = Math.min(36, Math.max(3, parseInt(req.query.horizon, 10) || 12));
      res.json({ success: true, snapshot: clv.buildSnapshot(storeId, Date.now(), { horizonMonths }) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/clv/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: clv.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
