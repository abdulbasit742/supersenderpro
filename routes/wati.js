const express = require('express');
const competitorParity = require('../lib/competitorParity');
const path = require('path');
const fs = require('fs');

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

  // 11. Cost Billing Analytics
  router.get('/wati/costs', (req, res) => {
    try {
      const tenantId = req.query.tenantId || 'default-tenant';
      const analytics = competitorParity.getCostAnalytics(tenantId);
      res.json({ success: true, ...analytics });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/wati/costs/log', (req, res) => {
    try {
      const { tenantId = 'default-tenant', category = 'service', currency = 'USD', country = 'PK' } = req.body || {};
      const costEntry = competitorParity.logConversationCost(tenantId, category, currency, country);
      res.json({ success: true, costEntry });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 12. Interactive templates
  router.get('/wati/templates', (req, res) => {
    try {
      const tenantId = req.query.tenantId || 'default-tenant';
      const templatesFile = path.join(__dirname, '../data/interactive_templates.json');
      let templates = [];
      try {
        templates = JSON.parse(fs.readFileSync(templatesFile, 'utf8')).templates || [];
      } catch {}
      const filtered = templates.filter(t => !tenantId || t.tenantId === tenantId);
      res.json({ success: true, templates: filtered });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/wati/templates', (req, res) => {
    try {
      const { tenantId = 'default-tenant', name, type, bodyText, options = [] } = req.body || {};
      if (!name || !type || !bodyText) {
        return res.status(400).json({ success: false, error: 'name, type and bodyText are required' });
      }
      const template = competitorParity.createInteractiveTemplate(tenantId, name, type, bodyText, options);
      res.json({ success: true, template });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 13. Ad Leads & Attribution
  router.get('/wati/ad-leads', (req, res) => {
    try {
      const tenantId = req.query.tenantId || 'default-tenant';
      const metricsFile = path.join(__dirname, '../data/competitor_metrics.json');
      let leads = [];
      try {
        leads = JSON.parse(fs.readFileSync(metricsFile, 'utf8')).adAttribution || [];
      } catch {}
      const filtered = leads.filter(l => !tenantId || l.tenantId === tenantId);
      res.json({ success: true, leads: filtered });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/wati/ad-lead', (req, res) => {
    try {
      const { tenantId = 'default-tenant', adId, sourcePlatform, referralData = {} } = req.body || {};
      if (!adId || !sourcePlatform) {
        return res.status(400).json({ success: false, error: 'adId and sourcePlatform are required' });
      }
      const lead = competitorParity.trackAdLead(tenantId, adId, sourcePlatform, referralData);
      res.json({ success: true, lead });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 14. Visual Chatbot Flows
  router.get('/wati/flows', (req, res) => {
    try {
      const tenantId = req.query.tenantId || 'default-tenant';
      const flows = competitorParity.listChatbotFlows(tenantId);
      res.json({ success: true, flows });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.post('/wati/flows', (req, res) => {
    try {
      const tenantId = req.query.tenantId || 'default-tenant';
      const flow = req.body || {};
      if (!flow.id || !flow.name) {
        return res.status(400).json({ success: false, error: 'id and name are required' });
      }
      const savedFlow = competitorParity.saveChatbotFlow(tenantId, flow);
      res.json({ success: true, flow: savedFlow });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  router.delete('/wati/flows/:id', (req, res) => {
    try {
      const tenantId = req.query.tenantId || 'default-tenant';
      const deleted = competitorParity.deleteChatbotFlow(tenantId, req.params.id);
      res.json({ success: true, deleted });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ========================================================================
  // NEW ADVANCED COMPETITOR ENDPOINTS & PLUGGABLE ALGORITHMS
  // ========================================================================

  // 15. Shared Inbox Presence & Agent Collision Check
  router.post('/wati/presence/register', (req, res) => {
    try {
      const { tenantId = 'default-tenant', chatId, agentId, action = 'viewing' } = req.body;
      if (!chatId || !agentId) {
        return res.status(400).json({ success: false, error: 'chatId and agentId are required.' });
      }
      const presenceReport = competitorParity.registerPresence(tenantId, chatId, agentId, action);
      res.json({ success: true, ...presenceReport });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 16. Click-to-WhatsApp Ads RoAS Campaign Analysis
  router.get('/wati/ads/campaign/:adId/roas', (req, res) => {
    try {
      const tenantId = req.query.tenantId || 'default-tenant';
      const adId = req.params.adId;
      const analysis = competitorParity.getAdCampaignRoas(tenantId, adId);
      res.json({ success: true, analysis });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 17. Predictive Churn Risk Analytics Endpoint
  router.post('/wati/algorithms/churn-predict', (req, res) => {
    try {
      const { phone, lastActiveDays, totalMessages, failedPayments } = req.body;
      if (!phone) {
        return res.status(400).json({ success: false, error: 'phone is required' });
      }
      const churnReport = competitorParity.predictChurnRisk(phone, { lastActiveDays, totalMessages, failedPayments });
      res.json({ success: true, churnReport });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 18. Dynamic Pricing Multi-Armed Bandit Optimizer
  router.post('/wati/algorithms/pricing-optimize', (req, res) => {
    try {
      const { productId, basePrice, stock, demandVelocity } = req.body;
      if (!productId || !basePrice || stock === undefined) {
        return res.status(400).json({ success: false, error: 'productId, basePrice, and stock are required' });
      }
      const priceReport = competitorParity.computeDynamicPricing(productId, basePrice, stock, { demandVelocity });
      res.json({ success: true, priceReport });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 19. Advanced Pluggable Algorithm Pipeline Hub
  router.post('/wati/algorithms/pipeline/run', (req, res) => {
    try {
      const { algorithmId, payload = {} } = req.body;
      if (!algorithmId) {
        return res.status(400).json({ success: false, error: 'algorithmId is required' });
      }
      const executionResult = competitorParity.runAlgorithmicPipeline(algorithmId, payload);
      res.json({ success: true, executionResult });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  
  // ========================================================================
  // GLOBAL ADVANCED COMPETITOR ENDPOINTS
  // ========================================================================

  // 20. Charles-Style "Chat-Out" Pre-filled checkout carts (Competitor: Charles)
  router.post('/wati/checkout/chat-out', (req, res) => {
    try {
      const { productId, qty = 1, discountCode = '' } = req.body;
      if (!productId) {
        return res.status(400).json({ success: false, error: 'productId is required.' });
      }
      const chatOut = competitorParity.createChatOutLink(productId, qty, discountCode);
      res.json({ success: true, chatOut });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 21. AiSensy-Style Smart Retargeting Broadcast (Competitor: AiSensy)
  router.post('/wati/campaigns/retarget', (req, res) => {
    try {
      const { tenantId = 'default-tenant', parentCampaignId, followUpTemplateId } = req.body;
      if (!parentCampaignId || !followUpTemplateId) {
        return res.status(400).json({ success: false, error: 'parentCampaignId and followUpTemplateId are required.' });
      }
      const result = competitorParity.triggerRetargetingBroadcast(tenantId, parentCampaignId, followUpTemplateId);
      res.json(result);
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 22. QuickReply AI-Style eCommerce Abandoned Cart Recovery Trigger (Competitor: QuickReply AI)
  router.post('/wati/cart-recovery', (req, res) => {
    try {
      const { tenantId = 'default-tenant', phone, cartItems = [] } = req.body;
      if (!phone || !cartItems.length) {
        return res.status(400).json({ success: false, error: 'phone and cartItems are required.' });
      }
      const recoveryFlow = competitorParity.generateCartRecoveryFlow(tenantId, phone, cartItems);
      res.json({ success: true, recoveryFlow });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 23. GoHighLevel-Style CRM Stage Transition alert triggers (Competitor: GoHighLevel)
  router.post('/wati/crm/transition', (req, res) => {
    try {
      const { tenantId = 'default-tenant', leadId, phone, previousStage, newStage } = req.body;
      if (!leadId || !phone || !previousStage || !newStage) {
        return res.status(400).json({ success: false, error: 'leadId, phone, previousStage, and newStage are required.' });
      }
      const transitionReport = competitorParity.handleCrmStageTransition(tenantId, leadId, phone, previousStage, newStage);
      res.json({ success: true, transitionReport });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 24. WANotifier-Style Real-time Google Sheet data synchronization (Competitor: WANotifier)
  router.post('/wati/sync/sheets', (req, res) => {
    try {
      const { tenantId = 'default-tenant', sheetId, rowData } = req.body;
      if (!sheetId || !rowData) {
        return res.status(400).json({ success: false, error: 'sheetId and rowData are required.' });
      }
      const syncReport = competitorParity.syncToGoogleSheets(tenantId, sheetId, rowData);
      res.json({ success: true, syncReport });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

    
  // ========================================================================
  // NEW ADVANCED FEATURE ENDPOINTS (Sentiment, Drip, Anti-Ban, CLV, FAQ, Loyalty)
  // ========================================================================

  // 25. AI Sentiment Analysis & Auto-Escalation
  router.post('/wati/sentiment/analyze', (req, res) => {
    try {
      const { tenantId = 'default-tenant', phone, message } = req.body;
      if (!phone || !message) {
        return res.status(400).json({ success: false, error: 'phone and message are required.' });
      }
      const result = competitorParity.analyzeSentiment(tenantId, phone, message);
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 26. Smart Drip Campaign Sequencer
  router.post('/wati/drip/create', (req, res) => {
    try {
      const { tenantId = 'default-tenant', name, steps } = req.body;
      if (!name || !Array.isArray(steps) || !steps.length) {
        return res.status(400).json({ success: false, error: 'name and a non-empty steps array are required.' });
      }
      const sequence = competitorParity.createDripSequence(tenantId, name, steps);
      res.json({ success: true, sequence });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 27. Anti-Ban Broadcast Throttle Guard
  router.get('/wati/anti-ban/throttle', (req, res) => {
    try {
      const accountAgeDays = parseInt(req.query.accountAgeDays || '30', 10);
      const dailySentSoFar = parseInt(req.query.dailySentSoFar || '0', 10);
      const throttle = competitorParity.computeAntiBanThrottle(accountAgeDays, dailySentSoFar);
      res.json({ success: true, throttle });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 28. Customer Lifetime Value (CLV) Predictor
  router.post('/wati/analytics/clv', (req, res) => {
    try {
      const clv = competitorParity.predictCustomerLifetimeValue(req.body || {});
      res.json({ success: true, clv });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 29. Smart FAQ Auto-Responder with Confidence Scoring
  router.post('/wati/faq/answer', (req, res) => {
    try {
      const { question, faqs = [] } = req.body;
      if (!question) {
        return res.status(400).json({ success: false, error: 'question is required.' });
      }
      const answer = competitorParity.answerFromFAQ(question, faqs);
      res.json({ success: true, answer });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // 30. Loyalty Points & Rewards Engine
  router.post('/wati/loyalty/award', (req, res) => {
    try {
      const { tenantId = 'default-tenant', phone, points, reason = 'purchase' } = req.body;
      if (!phone || points === undefined) {
        return res.status(400).json({ success: false, error: 'phone and points are required.' });
      }
      const result = competitorParity.awardLoyaltyPoints(tenantId, phone, points, reason);
      res.json({ success: true, result });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

    return router;
};
