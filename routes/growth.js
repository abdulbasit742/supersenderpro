const express = require('express');

module.exports = function(loyaltyProgram, webhookDispatcher) {
  const router = express.Router();

  // ── Loyalty & Rewards ──────────────────────────────────────────────────
  // 1. Get loyalty tiers config
  router.get('/loyalty/tiers', (req, res) => {
    res.json({ success: true, tiers: loyaltyProgram.getTiers() });
  });

  // 2. Get a customer's wallet balance + tier
  router.get('/loyalty/:phone', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, wallet: loyaltyProgram.getBalance(storeId, req.params.phone) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 3. Earn points (by amount spent or explicit points)
  router.post('/loyalty/earn', (req, res) => {
    try {
      const { storeId = 'default_store', phone, amountSpent, points, reason } = req.body;
      if (!phone) return res.status(400).json({ success: false, error: 'phone is required' });
      const wallet = loyaltyProgram.earnPoints(storeId, phone, { amountSpent, points, reason });
      res.json({ success: true, wallet });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 4. Redeem points for a reward
  router.post('/loyalty/redeem', (req, res) => {
    try {
      const { storeId = 'default_store', phone, points, rewardName } = req.body;
      if (!phone || !points) return res.status(400).json({ success: false, error: 'phone and points are required' });
      const wallet = loyaltyProgram.redeemPoints(storeId, phone, points, rewardName);
      res.json({ success: true, wallet });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 5. Transaction history
  router.get('/loyalty/:phone/transactions', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, transactions: loyaltyProgram.getTransactions(storeId, req.params.phone) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 6. Leaderboard
  router.get('/loyalty-leaderboard', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, leaderboard: loyaltyProgram.getLeaderboard(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // ── Outbound Event Webhooks ────────────────────────────────────────────
  // 7. Supported event types
  router.get('/connect/webhook-events', (req, res) => {
    res.json({ success: true, events: webhookDispatcher.getSupportedEvents() });
  });

  // 8. List registered webhooks
  router.get('/connect/webhooks', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, webhooks: webhookDispatcher.listWebhooks(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 9. Register a webhook
  router.post('/connect/webhooks', (req, res) => {
    try {
      const { storeId = 'default_store', url, events, secret } = req.body;
      if (!url) return res.status(400).json({ success: false, error: 'url is required' });
      const hook = webhookDispatcher.registerWebhook(storeId, url, events, secret);
      res.json({ success: true, webhook: hook });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 10. Toggle a webhook active/inactive
  router.put('/connect/webhooks/:id/toggle', (req, res) => {
    try {
      const storeId = req.body.storeId || 'default_store';
      const hook = webhookDispatcher.setActive(storeId, req.params.id, req.body.active !== false);
      res.json({ success: true, webhook: hook });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 11. Delete a webhook
  router.delete('/connect/webhooks/:id', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, ...webhookDispatcher.deleteWebhook(storeId, req.params.id) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 12. Manually dispatch a test event
  router.post('/connect/webhooks/dispatch', async (req, res) => {
    try {
      const { storeId = 'default_store', event, payload } = req.body;
      if (!event) return res.status(400).json({ success: false, error: 'event is required' });
      const result = await webhookDispatcher.dispatch(storeId, event, payload || {});
      res.json({ success: true, ...result });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  // 13. Delivery logs
  router.get('/connect/webhook-logs', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      res.json({ success: true, logs: webhookDispatcher.getDeliveryLogs(storeId) });
    } catch (err) { res.status(500).json({ success: false, error: err.message }); }
  });

  return router;
};
