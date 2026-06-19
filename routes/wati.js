const express = require('express');

module.exports = function(watiBroadcast, watiCopilot) {
  const router = express.Router();

  // 1. Manually Opt-Out a contact (marketing blacklist)
  router.post('/wati/optout', (req, res) => {
    try {
      const { storeId = 'default_store', phone, reason = 'manual' } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: 'phone is required' });
      }

      const success = watiBroadcast.processOptOut(storeId, phone, 'STOP');
      res.json({ success: true, message: 'Contact successfully added to promotional blacklist.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 2. Manually Opt-In a contact
  router.post('/wati/optin', (req, res) => {
    try {
      const { storeId = 'default_store', phone } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: 'phone is required' });
      }

      const success = watiBroadcast.processOptIn(storeId, phone, 'START');
      res.json({ success: true, message: 'Contact successfully re-subscribed to promotional broadcasts.' });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 3. Get all campaigns
  router.get('/wati/campaigns', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const campaigns = watiBroadcast.getCampaigns(storeId);
      res.json({ success: true, campaigns });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 4. Create a promotional campaign
  router.post('/wati/campaigns', (req, res) => {
    try {
      const { storeId = 'default_store', name, segmentName, messageTemplate } = req.body;
      if (!name || !segmentName || !messageTemplate) {
        return res.status(400).json({ success: false, error: 'name, segmentName, and messageTemplate are required' });
      }

      const campaign = watiBroadcast.createCampaign(storeId, name, segmentName, messageTemplate);
      res.json({ success: true, campaign });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 5. Get campaign stats & details
  router.get('/wati/campaigns/:id', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const campaignId = req.params.id;
      const campaign = watiBroadcast.getCampaignDetails(storeId, campaignId);
      if (!campaign) {
        return res.status(404).json({ success: false, error: 'Campaign not found' });
      }
      res.json({ success: true, campaign });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 6. Execute campaign broadcast (Skipping unsubscribed contacts!)
  router.post('/wati/campaigns/:id/send', async (req, res) => {
    try {
      const storeId = req.body.storeId || 'default_store';
      const campaignId = req.params.id;
      const campaign = await watiBroadcast.sendCampaignBroadcast(storeId, campaignId);
      res.json({ success: true, campaign });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 7. Track status update webhook fallback
  router.post('/wati/campaigns/:id/track-status', (req, res) => {
    try {
      const storeId = req.body.storeId || 'default_store';
      const campaignId = req.params.id;
      const { phone, status } = req.body; // status: 'delivered' | 'read'
      if (!phone || !status) {
        return res.status(400).json({ success: false, error: 'phone and status are required' });
      }

      const campaign = watiBroadcast.updateMessageStatus(storeId, campaignId, phone, status);
      res.json({ success: true, campaign });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 8. Wati AI Copilot: Generate Thread Summary
  router.get('/wati/leads/:phone/summary', (req, res) => {
    try {
      const storeId = req.query.storeId || 'default_store';
      const phone = req.params.phone;
      const summary = watiCopilot.generateThreadSummary(storeId, phone);
      res.json(summary);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 9. Wati Smart Handoff: Mute bot, auto-route chat, send confirmation
  router.post('/wati/leads/:phone/escalate', async (req, res) => {
    try {
      const { storeId = 'default_store', reason = 'Agent Handoff Request' } = req.body;
      const phone = req.params.phone;

      const result = await watiCopilot.escalateToHuman(storeId, phone, reason);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 10. Unmute bot (re-enable auto replies)
  router.post('/wati/leads/:phone/unmute', (req, res) => {
    try {
      const storeId = req.body.storeId || 'default_store';
      const phone = req.params.phone;
      const result = watiCopilot.unmuteBot(storeId, phone);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
