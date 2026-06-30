const express = require('express');
const engagement = require('../lib/engagement');

// Messaging Engagement API. Fully read-only.
//
// Mount in server.js next to the other `/api` route mounts:
//   // ENGAGEMENT HOOK
//   app.use('/api', require('./routes/engagementRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/engagement/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: engagement.buildSnapshot(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/engagement/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: engagement.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
