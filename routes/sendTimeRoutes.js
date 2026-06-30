const express = require('express');
const sendTime = require('../lib/sendTime');
module.exports = function () {
  const router = express.Router();
  router.get('/send-time/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, snapshot: sendTime.buildSnapshot(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/send-time/all', (req, res) => { try { res.json({ success: true, snapshot: sendTime.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
