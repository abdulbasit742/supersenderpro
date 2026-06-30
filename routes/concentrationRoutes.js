const express = require('express');
const concentration = require('../lib/concentration');
module.exports = function () {
  const router = express.Router();
  router.get('/concentration/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, snapshot: concentration.buildSnapshot(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/concentration/all', (req, res) => { try { res.json({ success: true, snapshot: concentration.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
