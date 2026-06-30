const express = require('express');
const digest = require('../lib/insightsDigest');
const exporter = require('../lib/insightsDigest/reportExporter');
module.exports = function () {
  const router = express.Router();
  router.get('/digest', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, digest: digest.buildDigest(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/digest/all', (req, res) => { try { res.json({ success: true, digest: digest.buildAllDigest() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/digest/report', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; const d = digest.buildDigest(storeId); const fmt = (req.query.format || 'html').toLowerCase(); const stamp = d.generatedAt.slice(0, 10); if (fmt === 'csv') { res.setHeader('Content-Type', 'text/csv'); res.setHeader('Content-Disposition', `attachment; filename="founder-report-${storeId}-${stamp}.csv"`); return res.send(exporter.toCSV(d)); } res.setHeader('Content-Type', 'text/html'); res.send(exporter.toHTML(d)); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
