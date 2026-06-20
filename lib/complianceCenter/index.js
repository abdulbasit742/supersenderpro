// lib/complianceCenter/index.js — Barrel export for the Compliance & Consent Center.
module.exports = {
  config: require('./config').config,
  privacy: require('./privacy'),
  store: require('./store'),
  auditLog: require('./auditLog'),
  consentRegistry: require('./consentRegistry'),
  optOutManager: require('./optOutManager'),
  complianceRules: require('./complianceRules'),
  policyChecker: require('./policyChecker'),
  reportBuilder: require('./reportBuilder'),
};
