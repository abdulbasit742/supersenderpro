const express = require('express');
const anomalies = require('../lib/anomalies');
module.exports = function () {
  const router = express.Router();
  router.get('/alerts', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; const includeAcknowledged = req.query.includeAcknowledged !== 'false'; res.json({ success: true, alerts: anomalies.listAlerts(storeId, { includeAcknowledged }) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.post('/alerts/scan', (req, res) => { try { const storeId = (req.body && req.body.storeId) || req.query.storeId || 'default_store'; res.json({ success: true, ...anomalies.scan(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.post('/alerts/:key/ack', (req, res) => { try { const a = anomalies.acknowledge(req.params.key); if (!a) return res.status(404).json({ success: false, error: 'not found' }); res.json({ success: true, alert: a }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
