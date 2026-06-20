// routes/groupCommerceRoutes.js - Express Router endpoints for Group Commerce OS
const express = require('express');
const router = express.Router();

const store = require('../lib/groupCommerce/store');
const groupRegistry = require('../lib/groupCommerce/groupRegistry');
const commandRouter = require('../lib/groupCommerce/commandRouter');
const messageAnalyzer = require('../lib/groupCommerce/messageAnalyzer');
const catalog = require('../lib/groupCommerce/catalog');
const ecommerceBridge = require('../lib/groupCommerce/ecommerceBridge');
const relayPlanner = require('../lib/groupCommerce/relayPlanner');
const agentRegistry = require('../lib/groupCommerce/agentRegistry');
const pauseManager = require('../lib/groupCommerce/pauseManager');
const flowNodes = require('../lib/groupCommerce/flowNodes');
const matchingEngine = require('../lib/groupCommerce/matchingEngine');
const priceIntelligence = require('../lib/groupCommerce/priceIntelligence');
const leaderboard = require('../lib/groupCommerce/leaderboard');
const scheduler = require('../lib/groupCommerce/scheduler');
const orderBook = require('../lib/groupCommerce/orderBook');
const fraudScoring = require('../lib/groupCommerce/fraudScoring');
const analytics = require('../lib/groupCommerce/analytics');

// 1. GET /api/group-commerce/status - General system health and environment state
router.get('/status', (req, res) => {
  res.json({
    success: true,
    status: 'online',
    enabled: process.env.GROUP_COMMERCE_ENABLED !== 'false',
    dryRun: process.env.GROUP_COMMERCE_DRY_RUN !== 'false',
    storePath: process.env.GROUP_COMMERCE_STORE_PATH || 'data/group-commerce.json',
    defaultPauseMinutes: parseInt(process.env.GROUP_COMMERCE_DEFAULT_PAUSE_MINUTES, 10) || 5,
    maxPauseMinutes: parseInt(process.env.GROUP_COMMERCE_MAX_PAUSE_MINUTES, 10) || 10,
    liveActions: process.env.GROUP_COMMERCE_LIVE_GROUP_ACTIONS === 'true',
    availableFlowNodes: {
      triggers: flowNodes.triggers.length,
      actions: flowNodes.actions.length
    }
  });
});

// 2. GET /api/group-commerce/groups - List all registered groups
router.get('/groups', (req, res) => {
  try {
    const groups = groupRegistry.listGroups();
    res.json({ success: true, groups });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 3. POST /api/group-commerce/groups - Register a new group
router.post('/groups', (req, res) => {
  try {
    const group = req.body;
    if (!group.groupId) {
      return res.status(400).json({ success: false, error: 'groupId is required' });
    }
    const registered = groupRegistry.registerGroup(group);
    res.status(201).json({ success: true, group: registered });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 4. GET /api/group-commerce/groups/:id - Get a specific group registry entry
router.get('/groups/:id', (req, res) => {
  try {
    const group = groupRegistry.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    res.json({ success: true, group });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 5. PUT /api/group-commerce/groups/:id - Update group settings
router.put('/groups/:id', (req, res) => {
  try {
    const group = groupRegistry.getGroup(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, error: 'Group not found' });
    }
    const updated = groupRegistry.updateGroupSettings(req.params.id, req.body);
    res.json({ success: true, group: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 6. POST /api/group-commerce/groups/:id/command - Run administrative/group command
router.post('/groups/:id/command', (req, res) => {
  const { id } = req.params;
  const { sender, command } = req.body;
  if (!sender || !command) {
    return res.status(400).json({ success: false, error: 'sender and command are required' });
  }
  try {
    const result = commandRouter.executeCommand(id, sender, command);

    // Log history entry
    store.addHistoryEntry({
      groupId: id,
      type: 'command',
      message: command,
      sender,
      actionTaken: result.actionTaken,
      dryRun: result.dryRun
    });

    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 7. POST /api/group-commerce/groups/:id/analyze-message - Run semantic text analysis
router.post('/groups/:id/analyze-message', (req, res) => {
  const { id } = req.params;
  const { sender, messageText } = req.body;
  if (!messageText) {
    return res.status(400).json({ success: false, error: 'messageText is required' });
  }
  try {
    const analysis = messageAnalyzer.analyzeMessage(messageText);

    // Log history
    store.addHistoryEntry({
      groupId: id,
      type: 'incoming_message',
      message: messageText,
      sender: sender || 'anonymous',
      analyzed: analysis,
      actionTaken: 'analyzed',
      dryRun: true
    });

    res.json({ success: true, analysis });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 8. GET /api/group-commerce/groups/:id/catalog - View virtual catalog for a group
router.get('/groups/:id/catalog', (req, res) => {
  try {
    const items = catalog.listGroupCatalog(req.params.id);
    res.json({ success: true, catalog: items });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 9. POST /api/group-commerce/groups/:id/catalog - Manually add/modify catalog item
router.post('/groups/:id/catalog', (req, res) => {
  const { id } = req.params;
  const item = req.body;
  if (!item.sku) {
    return res.status(400).json({ success: false, error: 'sku is required' });
  }
  try {
    const updated = catalog.addOrUpdateItem(id, item);
    res.json({ success: true, catalogItem: updated });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 10. POST /api/group-commerce/groups/:id/ecommerce-preview - Simulate ecommerce connections
router.post('/groups/:id/ecommerce-preview', (req, res) => {
  const { id } = req.params;
  const { type, payload } = req.body; // type: 'sync_product', 'create_draft', 'create_order', 'sync_stock'
  try {
    let result = null;
    if (type === 'sync_product') {
      result = ecommerceBridge.syncProductToGroupCatalog(id, payload.productId);
    } else if (type === 'create_draft') {
      result = ecommerceBridge.createProductDraft(id, payload);
    } else if (type === 'create_order') {
      result = ecommerceBridge.createOrderDraft(id, payload);
    } else if (type === 'sync_stock') {
      result = ecommerceBridge.syncStockUpdate(id, payload.sku, payload.stock);
    } else {
      result = catalog.exportToEcommercePreview(id);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 11. POST /api/group-commerce/groups/:id/relay-preview - Channel broadcasting sync
router.post('/groups/:id/relay-preview', (req, res) => {
  const { id } = req.params;
  const { type, payload } = req.body; // type: 'channel', 'seller_offer', 'market_digest'
  try {
    let result = null;
    if (type === 'channel') {
      result = relayPlanner.planGroupToChannelRelay(id);
    } else if (type === 'seller_offer') {
      result = relayPlanner.planSellerRelay(id, payload);
    } else {
      result = relayPlanner.planMarketDigest(id);
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 12. GET /api/group-commerce/agents - List registered automation AI Agents
router.get('/agents', (req, res) => {
  res.json({ success: true, agents: agentRegistry.listAgents() });
});

// 13. POST /api/group-commerce/groups/:id/agents - Process AI agent classification/reply suggestion
router.post('/groups/:id/agents', (req, res) => {
  const { id } = req.params;
  const { agentId, messageText } = req.body;
  if (!agentId || !messageText) {
    return res.status(400).json({ success: false, error: 'agentId and messageText are required' });
  }
  try {
    const result = agentRegistry.processAgentDecision(id, agentId, messageText);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 14. GET /api/group-commerce/history - Retreive masked audit logs
router.get('/history', (req, res) => {
  try {
    const historyData = store.readHistory();
    res.json({ success: true, history: historyData.history });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 15. POST /api/group-commerce/groups/:id/match - Match a buyer request to active sellers
router.post('/groups/:id/match', (req, res) => {
  const { id } = req.params;
  const { buyerRequest } = req.body;
  if (!buyerRequest) {
    return res.status(400).json({ success: false, error: 'buyerRequest is required' });
  }
  try {
    const result = matchingEngine.matchBuyerToSellers(id, buyerRequest);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 16. GET /api/group-commerce/groups/:id/price-intel/:sku - Price analytics for a SKU
router.get('/groups/:id/price-intel/:sku', (req, res) => {
  try {
    const result = priceIntelligence.analyzeSku(req.params.id, req.params.sku);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 17. GET /api/group-commerce/groups/:id/market-overview - Aggregate market stats
router.get('/groups/:id/market-overview', (req, res) => {
  try {
    const result = priceIntelligence.marketOverview(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 18. GET /api/group-commerce/groups/:id/leaderboard - Seller trust leaderboard
router.get('/groups/:id/leaderboard', (req, res) => {
  try {
    const result = leaderboard.buildLeaderboard(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 19. POST /api/group-commerce/groups/:id/schedule-broadcast - Plan a scheduled catalog broadcast
router.post('/groups/:id/schedule-broadcast', (req, res) => {
  try {
    const result = scheduler.planScheduledBroadcast(req.params.id, req.body || {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 20. POST /api/group-commerce/groups/:id/orders - Create a new order draft
router.post('/groups/:id/orders', (req, res) => {
  try {
    const result = orderBook.createOrder(req.params.id, req.body || {});
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 21. GET /api/group-commerce/groups/:id/orders - List all orders for a group
router.get('/groups/:id/orders', (req, res) => {
  try {
    const result = orderBook.listOrders(req.params.id);
    res.json({ success: true, orders: result });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 22. PUT /api/group-commerce/groups/:id/orders/:orderId - Update order status
router.put('/groups/:id/orders/:orderId', (req, res) => {
  try {
    const result = orderBook.updateStatus(req.params.id, req.params.orderId, req.body.status);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 23. GET /api/group-commerce/groups/:id/orders/summary - Order book summary stats
router.get('/groups/:id/orders/summary', (req, res) => {
  try {
    const result = orderBook.summary(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 24. POST /api/group-commerce/groups/:id/score-fraud - Score a message for scam risk
router.post('/groups/:id/score-fraud', (req, res) => {
  try {
    const result = fraudScoring.scoreMessage(req.body.messageText || '');
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 25. GET /api/group-commerce/groups/:id/analytics - Group activity statistics
router.get('/groups/:id/analytics', (req, res) => {
  try {
    const result = analytics.activityStats(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// 26. GET /api/group-commerce/groups/:id/daily-digest - Generate daily market digest
router.get('/groups/:id/daily-digest', (req, res) => {
  try {
    const result = analytics.dailyDigest(req.params.id);
    res.json(result);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

module.exports = router;
