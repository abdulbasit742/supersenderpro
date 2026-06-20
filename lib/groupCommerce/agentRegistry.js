// lib/groupCommerce/agentRegistry.js - Group AI Agent Assignment System
const messageAnalyzer = require('./messageAnalyzer');

const availableAgents = [
  { id: 'sales', name: 'Sales Closer Pro', role: 'Helps buyers find product SKU matches, prices, and drafts order requests.' },
  { id: 'support', name: 'Support Concierge', role: 'Answers group logistics questions, COD options, delivery terms.' },
  { id: 'moderation', name: 'Shield Sentinel', role: 'Identifies banned links, repeated posts, flags rule breakers.' },
  { id: 'catalog', name: 'Catalog Curator', role: 'Extracts seller listings and updates the virtual group catalog.' },
  { id: 'seller_intelligence', name: 'Deal Scout', role: 'Tracks seller offers, pricing histories, stock revisions.' },
  { id: 'buyer_matching', name: 'Lead Matcher', role: 'Alerts seller lists when buyer intent matching their SKU is detected.' },
  { id: 'pricing_intelligence', name: 'Market Arbitrageur', role: 'Computes product price histories and flags high/low limits.' }
];

function listAgents() {
  return availableAgents;
}

function processAgentDecision(groupId, agentId, messageText) {
  const analysis = messageAnalyzer.analyzeMessage(messageText);
  let recommendation = '';
  let updatedCatalogDraft = null;

  switch (agentId) {
    case 'sales':
      if (analysis.roleIntent === 'buyer') {
        recommendation = "🤖 *AI Sales Agent Suggestion:* \"Hey there! I spotted you're looking for SKU: " + (analysis.sku || 'N/A') + ". We have active stock from verified sellers in our group catalog. Would you like me to draft an order for " + analysis.quantity + " pcs of " + (analysis.productName || 'this product') + "?\"";
      } else {
        recommendation = "🤖 *AI Sales Agent Suggestion:* No buyer intent detected, monitoring active marketplace inquiries.";
      }
      break;

    case 'support':
      if (messageText.toLowerCase().includes('cod') || messageText.toLowerCase().includes('delivery') || messageText.toLowerCase().includes('payment')) {
        recommendation = "🤖 *AI Support Agent Suggestion:* \"Our verified group rules state Cash on Delivery (COD) is available in Lahore, Karachi, and Islamabad. Payments are verified securely through our payment pipeline verifier. Let an admin know if you need help!\"";
      } else {
        recommendation = "🤖 *AI Support Agent Suggestion:* Standard support query monitoring. No active alerts.";
      }
      break;

    case 'moderation':
      if (messageText.includes('http') || messageText.includes('www')) {
        recommendation = "🛡️ *AI Moderation Agent alert:* Message containing unapproved external links detected. Flagged for dry-run removal warning.";
      } else {
        recommendation = "🛡️ *AI Moderation Agent:* Content matches group compliance regulations.";
      }
      break;

    case 'catalog':
      if (analysis.roleIntent === 'seller' && analysis.sku) {
        recommendation = "🤖 *AI Catalog Curator Suggestion:* \"Seller offer detected! I've automatically drafted an item update for " + analysis.productName + " (" + analysis.sku + ") at price Rs. " + analysis.price + " with stock: " + analysis.quantity + " pcs.\"";
        updatedCatalogDraft = {
          sku: analysis.sku,
          productName: analysis.productName,
          latestPrice: analysis.price,
          stock: analysis.quantity
        };
      } else {
        recommendation = "🤖 *AI Catalog Curator:* No seller products with proper SKU found in the text.";
      }
      break;

    default:
      recommendation = "🤖 *AI Agent (" + agentId + ") Suggestion:* Standard group intelligence processing. No critical alerts.";
      break;
  }

  return {
    success: true,
    agentId,
    recommendation,
    analyzedPayload: analysis,
    updatedCatalogDraft,
    dryRun: true
  };
}

module.exports = {
  listAgents,
  processAgentDecision
};
