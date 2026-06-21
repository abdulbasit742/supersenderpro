// lib/groupCommerce/agentRegistry.js
// Group Commerce OS - assigns EXISTING AI agents to groups. Does not create an
// agent runtime; it records assignments and produces SUGGESTIONS only.
// Auto-reply is off unless GROUP_COMMERCE_AI_AUTO_REPLY=true.

'use strict';

const store = require('./store');
const analyzer = require('./messageAnalyzer');

const AGENTS = ['sales', 'support', 'moderation', 'catalog', 'seller_intelligence', 'buyer_matching',
'pricing_intelligence'];
const CONFIG = { autoReply: String(process.env.GROUP_COMMERCE_AI_AUTO_REPLY || 'false') === 'true' };

function listAgents() { return AGENTS.slice(); }


function getAssignments(groupId) {
    const db = store.readGroups();
    return (db.agents[String(groupId)] || []);
}
function setAssignment(groupId, agent, on) {
    if (!AGENTS.includes(agent)) return { ok: false, error: 'unknown agent' };
    const db = store.readGroups();
    const cur = new Set(db.agents[String(groupId)] || []);
    if (on) cur.add(agent); else cur.delete(agent);
    db.agents[String(groupId)] = Array.from(cur);
    store.writeGroups(db);
    return { ok: true, agents: db.agents[String(groupId)] };
}

// Produce agent SUGGESTIONS for a message. Never sends unless autoReply (handled
// by the caller, which must also check pause + dry-run).
function suggest(groupId, message) {
    const assigned = getAssignments(groupId);
    const a = analyzer.analyze(message);
    const suggestions = [];

    if (assigned.includes('catalog') && (a.price || a.sku)) {
      suggestions.push({ agent: 'catalog', type: 'update_catalogue_draft', item: { sku: a.sku, productName: a.productName,
price: a.price, currency: a.currency, stockStatus: a.stockStatus } });
  }
    if (assigned.includes('seller_intelligence') && a.roleIntent === 'seller') {
      suggestions.push({ agent: 'seller_intelligence', type: 'seller_detected', confidence: a.sellerConfidence });


    }
    if (assigned.includes('buyer_matching') && a.roleIntent === 'buyer') {
      suggestions.push({ agent: 'buyer_matching', type: 'suggest_product_match', productName: a.productName });
    }
    if (assigned.includes('pricing_intelligence') && a.price) {
    suggestions.push({ agent: 'pricing_intelligence', type: 'price_observed', price: a.price, currency: a.currency, sku:
a.sku });
    }
    if (assigned.includes('moderation') && a.flags.length) {
        suggestions.push({ agent: 'moderation', type: 'flag_risky_post', flags: a.flags });
    }
    if (assigned.includes('sales') && a.roleIntent === 'buyer') {
      suggestions.push({ agent: 'sales', type: 'suggest_reply', replyDraft: `Yeh available hai. Order ke liye SKU +
quantity bata dein.` });
  }
    if (assigned.includes('support')) {
      suggestions.push({ agent: 'support', type: 'suggest_reply', replyDraft: `Madad chahiye? Apna order ya issue likh
dein.` });
  }


    return { autoReply: CONFIG.autoReply, suggestions, analysis: a };
}


module.exports = { listAgents, getAssignments, setAssignment, suggest, AGENTS, CONFIG };
