const express = require('express');
const sendTime = require('../lib/sendTime');

// Send-Time Optimization API. Fully read-only. Dashboard falls back to the
// static batch snapshot, so this is only for on-demand queries.
//
// Mount in server.js next to the other `/api` route mounts:
//   // SENDTIME HOOK
//   app.use('/api', require('./routes/sendTimeRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/send-time/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: sendTime.buildSnapshot(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/send-time/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: sendTime.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
