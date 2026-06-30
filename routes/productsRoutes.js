const express = require('express');
const products = require('../lib/productAnalytics');

// Product/SKU Performance API. Fully read-only. Dashboard falls back to the
// static batch snapshot, so this is only for on-demand queries.
//
// Mount in server.js next to the other `/api` route mounts:
//   // PRODUCTS HOOK
//   app.use('/api', require('./routes/productsRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/products/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: products.buildSnapshot(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/products/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: products.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
