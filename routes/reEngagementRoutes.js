const express = require('express');
const reengage = require('../lib/reEngagement');
module.exports = function () {
  const router = express.Router();
  router.get('/reengage/plan', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, campaign: reengage.plan(storeId, req.app.locals.settings || {}) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/reengage/campaigns', (req, res) => { try { const storeId = req.query.storeId || 'default_store'; res.json({ success: true, campaigns: reengage.listCampaigns(storeId) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.get('/reengage/campaigns/:id', (req, res) => { try { const c = reengage.getCampaign(req.params.id); if (!c) return res.status(404).json({ success: false, error: 'not found' }); res.json({ success: true, campaign: c }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  router.post('/reengage/campaigns/:id/execute', (req, res) => { try { const force = req.body && req.body.force === true; res.json({ success: true, campaign: reengage.execute(req.params.id, { force }) }); } catch (e) { res.status(500).json({ success: false, error: e.message }); } });
  return router;
};
