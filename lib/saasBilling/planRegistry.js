// lib/saasBilling/planRegistry.js — Plan model + default tier catalog.
// Seeds default plans into data/saas-billing.json on first read. Does NOT touch the
// existing lib/subscriptionPlans.js store (we read it via tenantPlans for adaptation).

const { config } = require('./config');
const store = require('./store');
const { FEATURES, LIMIT_KEYS } = require('./featureCatalog');

const TIERS = ['free_trial', 'starter', 'growth', 'pro', 'agency', 'reseller', 'enterprise', 'lifetime', 'custom'];
const CUR = config.defaultCurrency;

function feats(list) {
  // expand a feature list into a {feature: bool} map covering the full catalog
  const set = new Set(list);
  const out = {};
  FEATURES.forEach((f) => { out[f] = set.has('*') ? true : set.has(f); });
  return out;
}
function limits(obj) {
  const out = {};
  LIMIT_KEYS.forEach((k) => { out[k] = obj[k] === undefined ? 0 : obj[k]; });
  return out;
}
const UNL = -1; // unlimited sentinel

function plan(id, name, tier, price, billingCycle, trialDays, featureList, limitObj) {
  const now = store.nowIso();
  return {
    id, name, tier, price, currency: CUR, billingCycle,
    features: feats(featureList), limits: limits(limitObj),
    trialDays, isActive: true, createdAt: now, updatedAt: now,
  };
}

function defaultPlans() {
  return [
    plan('free_trial', 'Free Trial', 'free_trial', 0, 'trial', 14,
      ['whatsapp_bot', 'channel_automation', 'analytics_reports', 'business_setup'],
      { whatsappAccounts: 1, whatsappChannels: 1, connectedSocialAccounts: 1, aiAgents: 1, channelPostsPerDay: 10, socialPostsPerDay: 5, customer360Profiles: 50, flowRunsPerMonth: 50, teamMembers: 1, storageMb: 200, apiCallsPerMonth: 500 }),
    plan('starter', 'Starter', 'starter', 2000, 'monthly', 7,
      ['whatsapp_bot', 'channel_automation', 'social_bridge', 'analytics_reports', 'business_setup', 'google_sheets'],
      { whatsappAccounts: 1, whatsappChannels: 3, connectedSocialAccounts: 3, ecommerceStores: 1, aiAgents: 2, channelPostsPerDay: 30, socialPostsPerDay: 20, customer360Profiles: 500, flowRunsPerMonth: 500, automationRules: 10, teamMembers: 2, storageMb: 1000, apiCallsPerMonth: 5000 }),
    plan('growth', 'Growth', 'growth', 5000, 'monthly', 7,
      ['whatsapp_bot', 'whatsapp_cloud', 'channel_automation', 'social_bridge', 'ecommerce_hub', 'customer_360', 'analytics_reports', 'business_setup', 'flow_studio', 'google_sheets', 'playbook_builder'],
      { whatsappAccounts: 3, whatsappChannels: 10, connectedSocialAccounts: 8, ecommerceStores: 3, aiAgents: 5, voiceMinutes: 100, ttsCharacters: 50000, sttMinutes: 60, channelPostsPerDay: 100, socialPostsPerDay: 60, customer360Profiles: 5000, marketplaceItems: 500, flowRunsPerMonth: 5000, automationRules: 50, teamMembers: 5, storageMb: 5000, apiCallsPerMonth: 50000 }),
    plan('pro', 'Pro', 'pro', 12000, 'monthly', 7,
      ['whatsapp_bot', 'whatsapp_cloud', 'channel_automation', 'social_bridge', 'ecommerce_hub', 'customer_360', 'voice_ai', 'marketplace_intelligence', 'ai_agent_deployment', 'owner_command', 'analytics_reports', 'business_setup', 'flow_studio', 'google_sheets', 'n8n_bridge', 'api_access', 'playbook_builder'],
      { whatsappAccounts: 10, whatsappChannels: 30, connectedSocialAccounts: 20, ecommerceStores: 10, aiAgents: 20, voiceMinutes: 500, ttsCharacters: 250000, sttMinutes: 300, channelPostsPerDay: 500, socialPostsPerDay: 200, customer360Profiles: 50000, marketplaceItems: 5000, flowRunsPerMonth: 50000, automationRules: 200, teamMembers: 15, storageMb: 25000, apiCallsPerMonth: 500000 }),
    plan('agency', 'Agency', 'agency', 30000, 'monthly', 7,
      ['*'],
      { whatsappAccounts: 50, whatsappChannels: 150, connectedSocialAccounts: 100, ecommerceStores: 50, aiAgents: 100, voiceMinutes: 2000, ttsCharacters: 1000000, sttMinutes: 1200, channelPostsPerDay: 2000, socialPostsPerDay: 1000, customer360Profiles: 250000, marketplaceItems: 25000, flowRunsPerMonth: 250000, automationRules: 1000, teamMembers: 50, storageMb: 100000, apiCallsPerMonth: 2000000 }),
    plan('reseller', 'Reseller', 'reseller', 50000, 'monthly', 0,
      ['*'],
      { whatsappAccounts: 100, whatsappChannels: 300, connectedSocialAccounts: 200, ecommerceStores: 100, aiAgents: 250, voiceMinutes: 5000, ttsCharacters: 2500000, sttMinutes: 3000, channelPostsPerDay: 5000, socialPostsPerDay: 2500, customer360Profiles: 1000000, marketplaceItems: 100000, flowRunsPerMonth: 1000000, automationRules: 5000, teamMembers: 200, storageMb: 500000, apiCallsPerMonth: 10000000 }),
    plan('enterprise', 'Enterprise', 'enterprise', 0, 'custom', 0,
      ['*'], LIMIT_KEYS.reduce((a, k) => (a[k] = UNL, a), {})),
    plan('lifetime', 'Lifetime', 'lifetime', 150000, 'lifetime', 0,
      ['*'], LIMIT_KEYS.reduce((a, k) => (a[k] = UNL, a), {})),
    plan('custom', 'Custom', 'custom', 0, 'custom', 0, [], {}),
  ];
}

function load() {
  const data = store.readJSON(config.paths.store, null);
  if (data && Array.isArray(data.plans) && data.plans.length) return data;
  const seeded = { plans: defaultPlans(), seededAt: store.nowIso() };
  store.writeJSON(config.paths.store, seeded); // best-effort; data dir is gitignored
  return seeded;
}

function getPlans() { return load().plans; }
function getPlan(id) { return getPlans().find((p) => p.id === id) || null; }

function upsertPlan(input) {
  const data = load();
  const now = store.nowIso();
  const idx = data.plans.findIndex((p) => p.id === input.id);
  if (idx >= 0) {
    data.plans[idx] = { ...data.plans[idx], ...input, features: input.features ? feats(Object.keys(input.features).filter((k) => input.features[k])) : data.plans[idx].features, limits: input.limits ? limits(input.limits) : data.plans[idx].limits, updatedAt: now };
  } else {
    data.plans.push(plan(input.id || store.genId('plan'), input.name || 'Untitled', input.tier || 'custom', input.price || 0, input.billingCycle || 'monthly', input.trialDays || 0, input.features ? Object.keys(input.features).filter((k) => input.features[k]) : [], input.limits || {}));
  }
  store.writeJSON(config.paths.store, data);
  return getPlan(input.id) || data.plans[data.plans.length - 1];
}

function deactivatePlan(id) {
  const data = load();
  const p = data.plans.find((x) => x.id === id);
  if (!p) return null;
  p.isActive = false; p.updatedAt = store.nowIso(); // soft-delete: never hard-remove
  store.writeJSON(config.paths.store, data);
  return p;
}

module.exports = { TIERS, defaultPlans, getPlans, getPlan, upsertPlan, deactivatePlan, feats, limits, UNL };
