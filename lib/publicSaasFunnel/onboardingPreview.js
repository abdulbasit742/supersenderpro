// lib/publicSaasFunnel/onboardingPreview.js
// Self-serve onboarding preview: recommended modules, playbooks, agents, checklist.
// Pure preview — never creates a live tenant or sends messages.

const businessSetup = require('./adapters/businessSetupAdapter');
const billing = require('./adapters/saasBillingAdapter');
const pageRegistry = require('./pageRegistry');

const GOALS = ['more sales', 'automate support', 'manage WhatsApp', 'post to channels/social', 'manage ecommerce', 'track payments/orders', 'launch SaaS/reseller'];

function build({ businessType, goal, modules = [], planInterest } = {}) {
  const setup = businessSetup.setupPreview(businessType, goal);
  const planCatalog = billing.plans();
  const recommendedPlan = planCatalog.plans.find((p) => p.id === planInterest) || planCatalog.plans.find((p) => p.id === 'growth') || planCatalog.plans[0];

  // Map any provided module keys to known features for friendly names.
  const featureMap = new Map(pageRegistry.FEATURES.map((f) => [f.key, f.name]));
  const chosen = (modules.length ? modules : setup.recommendedModules).map((m) => ({ key: m, name: featureMap.get(m) || m }));

  return {
    type: 'onboarding_preview',
    businessType: businessType || 'custom',
    goal: goal || null,
    recommendedModules: chosen,
    recommendedPlaybooks: setup.recommendedPlaybooks,
    recommendedAgents: setup.recommendedAgents,
    setupChecklist: setup.readinessChecklist,
    recommendedPlan: recommendedPlan ? { id: recommendedPlan.id, name: recommendedPlan.name, price: recommendedPlan.price, cycle: recommendedPlan.cycle } : null,
    liveTenantCreated: false,
    liveMessagesSent: false,
    note: 'PREVIEW only — review and submit a trial/demo request to proceed. Nothing was activated.',
    createdAt: new Date().toISOString(),
  };
}

module.exports = { build, GOALS };
