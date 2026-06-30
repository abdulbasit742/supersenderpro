const express = require('express');
const basket = require('../lib/basketAnalysis');
module.exports = function () {
  const router = express.Router();
  router.get('/basket/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, snapshot: basket.buildSnapshot(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/basket/all', (req, res) => { try { res.json({ success: true, snapshot: basket.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/basket/recommend/:product', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, product: req.params.product, alsoBought: basket.recommendFor(storeId, req.params.product) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
