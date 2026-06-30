const express = require('express');
const geo = require('../lib/geoAnalytics');
module.exports = function () {
  const router = express.Router();
  router.get('/geo/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, snapshot: geo.buildSnapshot(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/geo/all', (req, res) => { try { res.json({ success: true, snapshot: geo.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
