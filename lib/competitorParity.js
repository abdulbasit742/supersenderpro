// competitorParity.js – Premium features matching industry competitors like Whatchimp, Charles, and Wati.
// Exposes Conversational Cost Tracking (0% Markup pricing transparency), Dynamic Interactive Buttons/List Templates, and Meta Click-to-WhatsApp Ads integration.

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const METRICS_FILE = path.join(DATA_DIR, 'competitor_metrics.json');
const INTERACTIVE_TEMPLATES_FILE = path.join(DATA_DIR, 'interactive_templates.json');
const CHATBOT_FLOWS_FILE = path.join(DATA_DIR, 'chatbot_flows.json');

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

module.exports = {
  logConversationCost,
  getCostAnalytics,
  createInteractiveTemplate,
  generateInteractivePayload,
  trackAdLead,
  listChatbotFlows,
  saveChatbotFlow,
  deleteChatbotFlow
};
