const express = require('express');
const rfm = require('../lib/rfm');

// RFM Segmentation API. Read-only. Phones are masked in member lists.
//
// Mount in server.js next to the other `/api` route mounts:
//   // RFM HOOK
//   app.use('/api', require('./routes/rfmRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/rfm/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: rfm.buildSnapshot(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/rfm/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: rfm.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // Members of a named segment (masked) for targeting.
  router.get('/rfm/segment/:name', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, segment: req.params.name, members: rfm.segmentMembers(storeId, req.params.name) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
