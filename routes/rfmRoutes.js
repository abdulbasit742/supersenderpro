const express = require('express');
const rfm = require('../lib/rfm');
module.exports = function () {
  const router = express.Router();
  router.get('/rfm/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, snapshot: rfm.buildSnapshot(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/rfm/all', (req, res) => { try { res.json({ success: true, snapshot: rfm.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/rfm/segment/:name', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, segment: req.params.name, members: rfm.segmentMembers(storeId, req.params.name) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
