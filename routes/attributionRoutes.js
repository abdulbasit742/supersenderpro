const express = require('express');
const attribution = require('../lib/attribution');
module.exports = function () {
  const router = express.Router();
  router.get('/attribution/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, snapshot: attribution.buildSnapshot(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/attribution/all', (req, res) => { try { res.json({ success: true, snapshot: attribution.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
