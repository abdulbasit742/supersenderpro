const express = require('express');
const forecasting = require('../lib/forecasting');
module.exports = function () {
  const router = express.Router();
  router.get('/forecast/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; const horizon = Math.min(90, Math.max(7, parseInt(req.query.horizon, 10) || 30)); res.json({ success: true, snapshot: forecasting.buildSnapshot(storeId, horizon) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/forecast/all', (req, res) => { try { res.json({ success: true, snapshot: forecasting.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
