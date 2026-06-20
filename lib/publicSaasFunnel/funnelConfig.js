// lib/publicSaasFunnel/funnelConfig.js
// Funnel configuration object (brand, markets, enabled pages, feature flags).

const { config, load, save } = require('./store');

const DEFAULT_TARGET_MARKETS = [
  'ecommerce stores', 'AI tools resellers', 'digital agencies', 'wholesalers/dealers',
  'education/scholarship channels', 'jobs channels', 'local shops', 'restaurants',
  'real estate', 'service businesses', 'content/channel owners', 'resellers/agencies',
];

const DEFAULT_FEATURED_MODULES = [
  'WhatsApp Automation', 'Channel Automation', 'Customer 360', 'Voice AI',
  'Marketplace Intelligence', 'AI Agent Deployment', 'Owner Command', 'Growth Campaigns',
  'SaaS Billing', 'Business Setup Wizard', 'Compliance Center', 'KPI Command',
];

function defaults() {
  const now = new Date().toISOString();
  return {
    id: 'public_saas_funnel',
    brandName: 'SuperSender Pro',
    headline: 'AI Business Command Center',
    subheadline: 'WhatsApp-first business automation platform',
    targetMarkets: DEFAULT_TARGET_MARKETS,
    enabledPages: ['landing', 'features', 'pricing', 'use-cases', 'start', 'leads'],
    featuredModules: DEFAULT_FEATURED_MODULES,
    pricingSource: 'saas_billing_or_fallback',
    defaultCurrency: config.defaultCurrency,
    defaultLanguage: config.defaultLanguage,
    demoEnabled: true,
    trialEnabled: true,
    resellerInquiryEnabled: true,
    leadCaptureEnabled: true,
    dryRun: config.dryRun,
    createdAt: now,
    updatedAt: now,
  };
}

function get() {
  const stored = load(config.paths.funnel, null);
  if (!stored) {
    const d = defaults();
    save(config.paths.funnel, d);
    return d;
  }
  // keep live flags in sync with current env
  stored.dryRun = config.dryRun;
  stored.defaultCurrency = config.defaultCurrency;
  stored.defaultLanguage = config.defaultLanguage;
  return stored;
}

function update(patch) {
  const current = get();
  const allowed = ['brandName', 'headline', 'subheadline', 'targetMarkets', 'enabledPages',
    'featuredModules', 'pricingSource', 'demoEnabled', 'trialEnabled',
    'resellerInquiryEnabled', 'leadCaptureEnabled'];
  for (const k of allowed) {
    if (patch[k] !== undefined) current[k] = patch[k];
  }
  current.updatedAt = new Date().toISOString();
  save(config.paths.funnel, current);
  return current;
}

module.exports = { get, update, defaults, DEFAULT_TARGET_MARKETS, DEFAULT_FEATURED_MODULES };
