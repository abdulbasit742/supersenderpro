const express = require('express');
const engagement = require('../lib/engagement');
module.exports = function () {
  const router = express.Router();
  router.get('/engagement/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, snapshot: engagement.buildSnapshot(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/engagement/all', (req, res) => { try { res.json({ success: true, snapshot: engagement.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
