const express = require('express');
const cohorts = require('../lib/cohorts');
module.exports = function () {
  const router = express.Router();
  router.get('/cohorts/snapshot', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, snapshot: cohorts.buildSnapshot(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/cohorts/all', (req, res) => { try { res.json({ success: true, snapshot: cohorts.buildAllSnapshot() }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
