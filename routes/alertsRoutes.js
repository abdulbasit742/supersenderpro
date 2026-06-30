const express = require('express');
const anomalies = require('../lib/anomalies');

// Anomaly Alerts API. Read-mostly; `scan` recomputes + persists deduped alerts,
// `acknowledge` marks one read. No external calls here (WhatsApp push lives in
// the batch, behind a dry-run flag).
//
// Mount in server.js next to the other `/api` route mounts:
//   // ALERTS HOOK
//   app.use('/api', require('./routes/alertsRoutes')());
module.exports = function () {
  const router = express.Router();

  // Current alert feed (deduped, newest first).
  router.get('/alerts', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const includeAcknowledged = req.query.includeAcknowledged !== 'false';
      res.json({ success: true, alerts: anomalies.listAlerts(storeId, { includeAcknowledged }) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // Run a scan now (recompute from latest data).
  router.post('/alerts/scan', (req, res) => {
    try {
      const storeId = (req.body && req.body.storeId) || req.query.storeId || 'default_store';
      res.json({ success: true, ...anomalies.scan(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // Acknowledge (dismiss) an alert.
  router.post('/alerts/:key/ack', (req, res) => {
    try {
      const a = anomalies.acknowledge(req.params.key);
      if (!a) return res.status(404).json({ success: false, error: 'not found' });
      res.json({ success: true, alert: a });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
