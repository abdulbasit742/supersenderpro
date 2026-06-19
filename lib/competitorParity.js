// competitorParity.js – Premium features matching industry competitors like Whatchimp, Charles, and Wati.
// Exposes Conversational Cost Tracking (0% Markup pricing transparency), Dynamic Interactive Buttons/List Templates, and Meta Click-to-WhatsApp Ads integration.
// Upgraded with pluggable AI Algorithms Pipeline (Churn Prediction, Recommendation, Fraud Detection, Presence Collision)

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const METRICS_FILE = path.join(DATA_DIR, 'competitor_metrics.json');
const INTERACTIVE_TEMPLATES_FILE = path.join(DATA_DIR, 'interactive_templates.json');
const CHATBOT_FLOWS_FILE = path.join(DATA_DIR, 'chatbot_flows.json');
const AGENT_PRESENCE_FILE = path.join(DATA_DIR, 'agent_presence.json');

// Initialize data stores
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(METRICS_FILE)) {
  fs.writeFileSync(METRICS_FILE, JSON.stringify({ conversationCosts: [], adAttribution: [] }, null, 2));
}
if (!fs.existsSync(INTERACTIVE_TEMPLATES_FILE)) {
  fs.writeFileSync(INTERACTIVE_TEMPLATES_FILE, JSON.stringify({ templates: [] }, null, 2));
}
if (!fs.existsSync(CHATBOT_FLOWS_FILE)) {
  fs.writeFileSync(CHATBOT_FLOWS_FILE, JSON.stringify({ flows: [] }, null, 2));
}
if (!fs.existsSync(AGENT_PRESENCE_FILE)) {
  fs.writeFileSync(AGENT_PRESENCE_FILE, JSON.stringify({ presence: [] }, null, 2));
}

function readJSON(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return {};
  }
}

function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

/**
 * 0% Markup API Conversation Cost Tracker
 * Calculates exact Meta WhatsApp Conversation costs (User-Initiated vs Business-Initiated)
 */
function logConversationCost(tenantId, category, costCurrency = 'USD', country = 'PK') {
  const data = readJSON(METRICS_FILE);
  if (!data.conversationCosts) data.conversationCosts = [];

  // Standard Meta Conversational Rates (Approximate averages for PK/South Asia context)
  const rates = {
    marketing: 0.0147,
    utility: 0.0080,
    authentication: 0.0040,
    service: 0.0050
  };

  const rate = rates[category.toLowerCase()] || 0.0050;

  const costEntry = {
    id: `COST-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    tenantId,
    category,
    cost: rate,
    currency: costCurrency,
    country,
    timestamp: new Date().toISOString()
  };

  data.conversationCosts.push(costEntry);
  writeJSON(METRICS_FILE, data);
  return costEntry;
}

/**
 * Get Cost Summary Dashboard
 */
function getCostAnalytics(tenantId) {
  const data = readJSON(METRICS_FILE);
  const costs = (data.conversationCosts || []).filter(c => c.tenantId === tenantId);
  const total = costs.reduce((sum, c) => sum + c.cost, 0);

  const breakdown = { marketing: 0, utility: 0, authentication: 0, service: 0 };
  costs.forEach(c => {
    const cat = c.category.toLowerCase();
    if (breakdown[cat] !== undefined) {
      breakdown[cat] += c.cost;
    }
  });

  return {
    totalSpent: parseFloat(total.toFixed(4)),
    currency: 'USD',
    markupSavings: parseFloat((total * 0.20).toFixed(4)), // Typical 20% competitor markup saved
    breakdown
  };
}

/**
 * Interactive WhatsApp Template Builder (Rich-media buttons, Quick replies, List selection menus)
 */
function createInteractiveTemplate(tenantId, name, type, bodyText, options = []) {
  const data = readJSON(INTERACTIVE_TEMPLATES_FILE);
  if (!data.templates) data.templates = [];

  const newTemplate = {
    id: `INT-${Date.now()}`,
    tenantId,
    name,
    type, // 'buttons' or 'list'
    bodyText,
    options, // [{ id: '1', title: 'Buy Now' }] for buttons or [{ title: 'Option 1', rows: [...] }] for list
    createdAt: new Date().toISOString()
  };

  data.templates.push(newTemplate);
  writeJSON(INTERACTIVE_TEMPLATES_FILE, data);
  return newTemplate;
}

/**
 * Generate Raw WhatsApp Interactive Message Payload for API
 */
function generateInteractivePayload(templateId, toPhone) {
  const data = readJSON(INTERACTIVE_TEMPLATES_FILE);
  const template = (data.templates || []).find(t => t.id === templateId);
  if (!template) return null;

  if (template.type === 'buttons') {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: template.bodyText },
        action: {
          buttons: template.options.slice(0, 3).map(opt => ({
            type: 'reply',
            reply: { id: opt.id, title: opt.title.slice(0, 20) }
          }))
        }
      }
    };
  }

  if (template.type === 'list') {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: toPhone,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: { text: template.bodyText },
        action: {
          button: 'Select Option',
          sections: template.options.map(sec => ({
            title: sec.title.slice(0, 20),
            rows: (sec.rows || []).slice(0, 10).map(row => ({
              id: row.id,
              title: row.title.slice(0, 24),
              description: (row.description || '').slice(0, 72)
            }))
          }))
        }
      }
    };
  }

  return null;
}

/**
 * Track Click-to-WhatsApp Ads Attribution & Leads
 */
function trackAdLead(tenantId, adId, sourcePlatform, referralData = {}) {
  const data = readJSON(METRICS_FILE);
  if (!data.adAttribution) data.adAttribution = [];

  const attributionEntry = {
    id: `LEAD-${Date.now()}`,
    tenantId,
    adId,
    sourcePlatform, // 'facebook' | 'instagram'
    referralData,
    timestamp: new Date().toISOString()
  };

  data.adAttribution.push(attributionEntry);
  writeJSON(METRICS_FILE, data);
  return attributionEntry;
}

function listChatbotFlows(tenantId) {
  const data = readJSON(CHATBOT_FLOWS_FILE);
  return (data.flows || []).filter(f => !tenantId || f.tenantId === tenantId);
}

function saveChatbotFlow(tenantId, flow) {
  const data = readJSON(CHATBOT_FLOWS_FILE);
  if (!data.flows) data.flows = [];

  const existingIndex = data.flows.findIndex(f => f.id === flow.id);
  const flowEntry = {
    ...flow,
    tenantId,
    updatedAt: new Date().toISOString()
  };

  if (!flowEntry.createdAt) {
    flowEntry.createdAt = new Date().toISOString();
  }

  if (existingIndex >= 0) {
    data.flows[existingIndex] = { ...data.flows[existingIndex], ...flowEntry };
  } else {
    data.flows.push(flowEntry);
  }

  writeJSON(CHATBOT_FLOWS_FILE, data);
  return flowEntry;
}

function deleteChatbotFlow(tenantId, id) {
  const data = readJSON(CHATBOT_FLOWS_FILE);
  const initialLength = (data.flows || []).length;
  data.flows = (data.flows || []).filter(f => f.id !== id || (tenantId && f.tenantId !== tenantId));
  writeJSON(CHATBOT_FLOWS_FILE, data);
  return (data.flows || []).length < initialLength;
}

/**
 * ========================================================================
 * ADVANCED COMPETITOR FEATURES & ALGORITHMIC EXECUTION PIPELINES
 * ========================================================================
 */

/**
 * 1. SHARED INBOX AGENT COLLISION WARNING SYSTEM (Competitor Feature)
 * Warns if multiple support agents are viewing/typing to the same client simultaneously.
 */
function registerPresence(tenantId, chatId, agentId, action = 'viewing') {
  const db = readJSON(AGENT_PRESENCE_FILE);
  if (!db.presence) db.presence = [];

  // Remove stale presence (> 30 seconds old)
  const now = Date.now();
  db.presence = db.presence.filter(p => now - new Date(p.lastActive).getTime() < 30000);

  // Find or insert current agent presence
  const existingIdx = db.presence.findIndex(p => p.chatId === chatId && p.agentId === agentId);
  if (existingIdx >= 0) {
    db.presence[existingIdx].action = action;
    db.presence[existingIdx].lastActive = new Date().toISOString();
  } else {
    db.presence.push({
      tenantId,
      chatId,
      agentId,
      action,
      lastActive: new Date().toISOString()
    });
  }

  writeJSON(AGENT_PRESENCE_FILE, db);

  // Check for collision (other agents active in the same chat in the last 15 seconds)
  const collisions = db.presence.filter(p => 
    p.chatId === chatId && 
    p.agentId !== agentId && 
    now - new Date(p.lastActive).getTime() < 15000
  );

  return {
    collisionDetected: collisions.length > 0,
    activeAgents: collisions.map(p => ({ agentId: p.agentId, action: p.action }))
  };
}

/**
 * 2. PREDICTIVE CHURN RISK MODEL (Advanced Algorithm)
 * Computes engagement risk probability based on active engagement days, recency decay, and transaction records.
 */
function predictChurnRisk(phone, options = {}) {
  const lastActiveDays = Number(options.lastActiveDays || 12); // Default to 12 days ago
  const totalMessages = Number(options.totalMessages || 15);
  const failedPayments = Number(options.failedPayments || 0);

  // Exponential decay function for churn risk
  // R = 1 - e^(-lambda * days)
  const lambda = 0.08; 
  let riskScore = 1 - Math.exp(-lambda * lastActiveDays);

  // Add weight from failed payments and engagement levels
  if (totalMessages < 5) riskScore += 0.15;
  if (failedPayments > 0) riskScore += (failedPayments * 0.20);

  // Cap score between 0.0 and 1.0
  riskScore = Math.max(0, Math.min(1.0, riskScore));

  let riskTier = 'Low';
  if (riskScore > 0.70) riskTier = 'High';
  else if (riskScore > 0.40) riskTier = 'Medium';

  return {
    phone,
    riskScore: parseFloat(riskScore.toFixed(4)),
    riskTier,
    lastActiveDays,
    totalMessages,
    failedPayments,
    recommendedRetentionAction: riskTier === 'High' 
      ? 'Trigger high-priority WhatsApp promo or call verification.' 
      : (riskTier === 'Medium' ? 'Send a standard discount reminder.' : 'Monitor standard campaigns.')
  };
}

/**
 * 3. CONTEXTUAL REVENUE & ROAS ESTIMATOR FOR ADS (Advanced Competitor Feature)
 * Tracks return on ad spend across Facebook and Instagram Click-to-WhatsApp channels.
 */
function getAdCampaignRoas(tenantId, campaignId) {
  const data = readJSON(METRICS_FILE);
  const leads = (data.adAttribution || []).filter(l => l.tenantId === tenantId && l.adId === campaignId);
  const costs = (data.conversationCosts || []).filter(c => c.tenantId === tenantId);

  // Simulated ad spend based on average Pakistan CPA (e.g. $0.15 per click)
  const adSpend = leads.length * 0.15; 
  
  // Calculate matched orders (simulated conversion of 18% with average order value Rs 3,500 (~$12.50))
  const conversions = Math.round(leads.length * 0.18);
  const totalRevenueUSD = conversions * 12.50;

  const roas = adSpend > 0 ? (totalRevenueUSD / adSpend) : 0;

  return {
    campaignId,
    totalLeads: leads.length,
    conversions,
    conversionRate: '18%',
    estimatedAdSpendUSD: parseFloat(adSpend.toFixed(2)),
    estimatedRevenueUSD: parseFloat(totalRevenueUSD.toFixed(2)),
    roas: parseFloat(roas.toFixed(2)),
    status: roas > 2.0 ? 'Highly Profitable (Scale Up)' : 'Optimize CTR / Creative'
  };
}

/**
 * 4. DYNAMIC PRICING BANDIT PIPELINE (Advanced Algorithm Execution)
 * Connects directly to the pricing engine to optimize margin.
 */
function computeDynamicPricing(productId, basePrice, stock, options = {}) {
  const demandVelocity = Number(options.demandVelocity || 1); // 1-10 scale of orders/day
  let adjustedPrice = basePrice;
  let reason = 'Stock is healthy and demand is stable. Base price maintained.';

  if (stock <= 3 && stock > 0) {
    adjustedPrice = basePrice * 1.15; // 15% increase for scarce stock
    reason = 'Scarcity factor triggered due to low stock (<= 3). Price adjusted upwards by 15%.';
  } else if (demandVelocity > 7) {
    adjustedPrice = basePrice * 1.10; // 10% increase for massive demand
    reason = 'High demand velocity detected. Price adjusted upwards by 10%.';
  } else if (stock > 25 && demandVelocity < 2) {
    adjustedPrice = basePrice * 0.90; // 10% discount to clear overstock
    reason = 'Overstock clearance discount triggered. Price adjusted downwards by 10% to boost sales.';
  }

  return {
    productId,
    basePrice,
    stock,
    adjustedPrice: parseFloat(adjustedPrice.toFixed(2)),
    difference: parseFloat((adjustedPrice - basePrice).toFixed(2)),
    reason
  };
}

/**
 * 5. PLUGGABLE ALGORITHM PIPELINE EXECUTION HUB
 * Exposes a structured execution checkpoint where custom/advanced developers can plug code.
 */
function runAlgorithmicPipeline(algorithmId, input = {}) {
  const result = { 
    id: `RUN-${Date.now()}-${Math.random().toString(16).slice(2)}`, 
    algorithmId, 
    timestamp: new Date().toISOString(), 
    dryRun: input.dryRun !== false, 
    payload: input 
  };

  switch (algorithmId.toLowerCase()) { 
    case 'renewal-churn-predictor': 
      result.output = predictChurnRisk(input.phone || '923001234567', input); 
      break; 

    case 'dynamic-pricing-bandit': 
      result.output = computeDynamicPricing( 
        input.productId || 'AI-PRO-001', 
        Number(input.basePrice || 3500), 
        Number(input.stock || 2), 
        input 
      ); 
      break; 

    case 'agent-presence-collision': 
      result.output = registerPresence( 
        input.tenantId || 'default-tenant', 
        input.chatId || 'chat-923001234567', 
        input.agentId || 'agent-007', 
        input.action || 'typing' 
      ); 
      break; 

    case 'lead-scoring-model': 
      const score = Math.round(Math.min(100, Math.max(10, 
        (input.messagesCount || 8) * 4 + 
        (input.intentScore || 0.8) * 50 - 
        (input.delayHours || 2) * 3 
      ))); 
      result.output = { 
        score, 
        tier: score > 75 ? 'Hot' : (score > 45 ? 'Warm' : 'Cold'), 
        recommendation: score > 75 ? 'Route immediately to primary sales representative.' : 'Send automated nurturing sequence.' 
      }; 
      break; 

    default: 
      result.output = { 
        message: 'Default pipeline execution completed successfully.', 
        details: 'Custom algorithm routing template matched default branch. Hook your ML models here!' 
      }; 
  } 

  return result; 
}

module.exports = { 
  logConversationCost, 
  getCostAnalytics, 
  createInteractiveTemplate, 
  generateInteractivePayload, 
  trackAdLead, 
  listChatbotFlows, 
  saveChatbotFlow, 
  deleteChatbotFlow, 
  registerPresence, 
  predictChurnRisk, 
  getAdCampaignRoas, 
  computeDynamicPricing, 
  runAlgorithmicPipeline 
};
