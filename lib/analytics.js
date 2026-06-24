'use strict';

/**
 * lib/analytics.js — cross-feature analytics aggregator.
 * Pulls a unified overview from every feature store. Each store is required
 * defensively so analytics still works if a module is absent.
 */

function safe(fn, fallback) { try { return fn(); } catch (_) { return fallback; } }

function overview() {
  const out = { generatedAt: new Date().toISOString() };

  // Campaigns + delivery
  out.campaigns = safe(() => {
    const s = require('./campaignStore');
    const sum = s.summaryAnalytics();
    return { total: sum.campaigns, recipients: sum.recipients, sent: sum.sent, failed: sum.failed, deliveryRate: sum.deliveryRate };
  }, null);

  // Contacts
  out.contacts = safe(() => {
    const c = require('./contactStore');
    return { total: c.listContacts().length, tags: c.tagCounts().length };
  }, null);

  // Templates
  out.templates = safe(() => ({ total: require('./templateStore').listTemplates().length }), null);

  // Automation (chatbot + quick replies)
  out.automation = safe(() => ({
    rules: require('./chatbotStore').listRules().length,
    quickReplies: require('./quickReplyStore').listReplies().length,
    botEnabled: require('./chatbotStore').getSettings().enabled,
  }), null);

  // Channel sharing
  out.channels = safe(() => {
    const cs = require('./channelSharing/store');
    const logs = cs.listLogs(500);
    const by = (st) => logs.filter((l) => l.status === st).length;
    return { routes: cs.listRoutes().length, sent: by('sent'), drafted: by('drafted'), failed: by('failed'), drafts: cs.listDrafts().filter((d) => d.status === 'pending').length };
  }, null);

  // E-commerce
  out.ecommerce = safe(() => {
    const e = require('./ecommerceStore');
    const conns = e.listConnections();
    return {
      connections: conns.length,
      products: conns.reduce((s, c) => s + (c.products ? c.products.length : 0), 0),
      orders: conns.reduce((s, c) => s + (c.orders ? c.orders.length : 0), 0),
      byPlatform: conns.reduce((m, c) => { m[c.platform] = (m[c.platform] || 0) + 1; return m; }, {}),
    };
  }, null);

  // Team inbox
  out.inbox = safe(() => {
    const i = require('./inboxStore');
    return { ...i.counts(), agents: i.listAgents().length };
  }, null);

  // Developer
  out.developer = safe(() => ({
    apiKeys: require('./apiKeyStore').list().filter((k) => !k.revoked).length,
    webhooks: require('./webhookStore').listWebhooks().filter((w) => w.active).length,
  }), null);

  return out;
}

module.exports = { overview };
