const express = require('express');
const reengage = require('../lib/reEngagement');

// Automated Re-Engagement / Win-Back API. Same read-only-by-default posture as
// the other route modules; the only state-changing call (execute) honours the
// REENGAGE_LIVE flag and won't send anything in dry-run.
//
// Mount in server.js next to the other `/api` route mounts:
//   // REENGAGEMENT HOOK
//   app.use('/api', require('./routes/reEngagementRoutes')());
module.exports = function () {
  const router = express.Router();

  // Preview today's win-back plan (sends nothing).
  router.get('/reengage/plan', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, campaign: reengage.plan(storeId, req.app.locals.settings || {}) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // List recent campaigns.
  router.get('/reengage/campaigns', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, campaigns: reengage.listCampaigns(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // Get one campaign.
  router.get('/reengage/campaigns/:id', (req, res) => {
    try {
      const c = reengage.getCampaign(req.params.id);
      if (!c) return res.status(404).json({ success: false, error: 'not found' });
      res.json({ success: true, campaign: c });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // Execute a campaign. Dry-run unless REENGAGE_LIVE=true (or ?force=true).
  router.post('/reengage/campaigns/:id/execute', (req, res) => {
    try {
      const force = req.body && req.body.force === true;
      res.json({ success: true, campaign: reengage.execute(req.params.id, { force }) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
