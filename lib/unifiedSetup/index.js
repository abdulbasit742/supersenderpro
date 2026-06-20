// lib/unifiedSetup/index.js — Barrel export for the Unified Setup Wizard + Onboarding Autopilot.

module.exports = {
  config: require('./store').config,
  store: require('./store'),
  privacy: require('./privacy'),
  presets: require('./presets'),
  businessProfile: require('./businessProfile'),
  stepEngine: require('./stepEngine'),
  stepDefinitions: require('./stepDefinitions'),
  readinessScoring: require('./readinessScoring'),
  connectors: require('./connectors'),
  credentialChecklist: require('./credentialChecklist'),
  autopilotPlanner: require('./autopilotPlanner'),
  recommendationEngine: require('./recommendationEngine'),
  readinessReport: require('./readinessReport'),
  onboardingTasks: require('./onboardingTasks'),
  taskTemplates: require('./taskTemplates'),
};
