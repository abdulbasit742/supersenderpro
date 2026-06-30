const express = require('express');
const digest = require('../lib/insightsDigest');
const exporter = require('../lib/insightsDigest/reportExporter');

// Unified Insights Digest API + report export. Fully read-only.
//
// Mount in server.js next to the other `/api` route mounts:
//   // DIGEST HOOK
//   app.use('/api', require('./routes/digestRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/digest', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, digest: digest.buildDigest(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/digest/all', (req, res) => {
    try {
      res.json({ success: true, digest: digest.buildAllDigest() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // Downloadable founder report: ?format=html (default) | csv
  router.get('/digest/report', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const d = digest.buildDigest(storeId);
      const fmt = (req.query.format || 'html').toLowerCase();
      const stamp = d.generatedAt.slice(0, 10);
      if (fmt === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="founder-report-${storeId}-${stamp}.csv"`);
        return res.send(exporter.toCSV(d));
      }
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `inline; filename="founder-report-${storeId}-${stamp}.html"`);
      res.send(exporter.toHTML(d));
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
