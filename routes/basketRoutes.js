const express = require('express');
const basket = require('../lib/basketAnalysis');

// Market-Basket / Product Affinity API. Fully read-only.
//
// Mount in server.js next to the other `/api` route mounts:
//   // BASKET HOOK
//   app.use('/api', require('./routes/basketRoutes')());
module.exports = function () {
  const router = express.Router();

  router.get('/basket/snapshot', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, snapshot: basket.buildSnapshot(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  router.get('/basket/all', (req, res) => {
    try {
      res.json({ success: true, snapshot: basket.buildAllSnapshot() });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // "Customers who bought :product also bought..." for live cross-sell prompts.
  router.get('/basket/recommend/:product', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, product: req.params.product, alsoBought: basket.recommendFor(storeId, req.params.product) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
