const express = require('express');

module.exports = function(leadScoring, businessHours, cxScore) {
  const router = express.Router();

  // ── Predictive Lead Scoring ────────────────────────────────────────────
  // 1. Score a single lead
  router.get('/intelligence/lead-score/:phone', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const result = leadScoring.computeLeadScore(storeId, req.params.phone);
      if (!result) return res.status(404).json({ success: false, error: 'Lead not found' });
      res.json({ success: true, lead: result });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 2. Ranked list of all leads by score
  router.get('/intelligence/lead-scores', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const limit = parseInt(req.query.limit || '100', 10);
      res.json({ success: true, leads: leadScoring.scoreAllLeads(storeId).slice(0, limit) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 3. Hot leads only
  router.get('/intelligence/hot-leads', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const threshold = parseInt(req.query.threshold || '70', 10);
      res.json({ success: true, hotLeads: leadScoring.getHotLeads(storeId, threshold) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 4. Persist score onto a lead profile
  router.post('/intelligence/lead-score/sync', (req, res) => {
    try {
      const { storeId = 'default_store', phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
      res.json({ success: true, lead: leadScoring.syncLeadScore(storeId, phone) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 5. Score distribution summary
  router.get('/intelligence/lead-score-distribution', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, ...leadScoring.getScoreDistribution(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // ── Business Hours & Away Message ──────────────────────────────────────
  // 6. Get config
  router.get('/intelligence/business-hours', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, config: businessHours.getConfig(storeId), status: businessHours.getStatus(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 7. Update config
  router.post('/intelligence/business-hours', (req, res) => {
    try {
      const { storeId = 'default_store', ...updates } = req.body;
      res.json({ success: true, config: businessHours.setConfig(storeId, updates) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 8. Live open/closed status
  router.get('/intelligence/business-hours/status', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, status: businessHours.getStatus(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 9. Trigger away-message handling for an inbound contact
  router.post('/intelligence/business-hours/handle-inbound', async (req, res) => {
    try {
      const { storeId = 'default_store', phone } = req.body;
      if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
      res.json({ success: true, result: await businessHours.handleInbound(storeId, phone) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // ── AI Conversation Quality (CX) Score ─────────────────────────────────
  // 10. Score a single conversation
  router.get('/intelligence/cx-score/:phone', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const result = cxScore.scoreConversation(storeId, req.params.phone);
      if (!result) return res.status(404).json({ success: false, error: 'Conversation not found' });
      res.json({ success: true, cx: result });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 11. Store-wide CX overview
  router.get('/intelligence/cx-overview', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, ...cxScore.getStoreCXOverview(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
