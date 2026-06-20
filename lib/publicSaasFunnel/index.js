// lib/publicSaasFunnel/index.js
// Barrel export for the Public SaaS Launch Funnel + Self-Serve Onboarding + Demo/Lead Command Center.
// Safe by default: dry-run ON, consent enforced, no live sends, drafts/previews only.

module.exports = {
  config: require('./store').config,
  store: require('./store'),
  funnelConfig: require('./funnelConfig'),
  pageRegistry: require('./pageRegistry'),
  safetyGuard: require('./safetyGuard'),
  privacyGuard: require('./privacyGuard'),
  leadStore: require('./leadStore'),
  leadNormalizer: require('./leadNormalizer'),
  leadScoring: require('./leadScoring'),
  leadFollowupDrafts: require('./leadFollowupDrafts'),
  demoRequests: require('./demoRequests'),
  demoScheduler: require('./demoScheduler'),
  trialRequests: require('./trialRequests'),
  onboardingPreview: require('./onboardingPreview'),
  tenantProvisionPreview: require('./tenantProvisionPreview'),
  complianceAdapter: require('./complianceAdapter'),
  flowNodes: require('./flowNodes'),
  adminCommands: require('./adminCommands'),
  doctor: require('./doctor'),
  adapters: {
    saasBilling: require('./adapters/saasBillingAdapter'),
    businessSetup: require('./adapters/businessSetupAdapter'),
    customer360: require('./adapters/customer360Adapter'),
    growthCampaign: require('./adapters/growthCampaignAdapter'),
    kpiCommand: require('./adapters/kpiCommandAdapter'),
  },
};
