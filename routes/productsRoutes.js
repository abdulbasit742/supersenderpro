const express = require('express');
const products = require('../lib/productAnalytics');
module.exports = function () {
  const router = express.Router();
  router.get('/products/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, snapshot: products.buildSnapshot(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/products/all', (req, res) => { try { res.json({ success: true, snapshot: products.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
