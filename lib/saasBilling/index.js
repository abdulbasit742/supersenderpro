// lib/saasBilling/index.js — Barrel export for the SaaS Billing + Tenant License + Usage
// Metering Command Center. Import this to access every submodule from one place.
//
// SAFETY: warn-only / dry-run by default. Nothing here charges payments, sends live
// messages, or suspends tenants unless an operator explicitly opts in via env.

const { config } = require('./config');

module.exports = {
  config,
  store: require('./store'),
  privacy: require('./privacy'),
  safetyGuard: require('./safetyGuard'),
  featureCatalog: require('./featureCatalog'),

  // Plans + tenants
  planRegistry: require('./planRegistry'),
  tenantPlans: require('./tenantPlans'),

  // License
  licenseEngine: require('./licenseEngine'),
  licenseStore: require('./licenseStore'),
  licenseValidator: require('./licenseValidator'),
  licenseKeys: require('./licenseKeys'),

  // Usage
  usageMeter: require('./usageMeter'),
  usageStore: require('./usageStore'),
  usageRollups: require('./usageRollups'),
  quotaChecker: require('./quotaChecker'),

  // Gating
  featureGate: require('./featureGate'),
  routeGuard: require('./routeGuard'),
  limitGuard: require('./limitGuard'),

  // Billing + invoices
  billingStatus: require('./billingStatus'),
  invoiceStore: require('./invoiceStore'),
  invoiceBuilder: require('./invoiceBuilder'),
  renewalEngine: require('./renewalEngine'),

  // Payments
  paymentAdapters: require('./paymentAdapters'),

  // Reseller
  resellerStore: require('./resellerStore'),
  resellerManager: require('./resellerManager'),
  commissionTracker: require('./commissionTracker'),

  // Plan change
  planChange: require('./planChange'),
  upgradeAdvisor: require('./upgradeAdvisor'),

  // Integrations
  flowNodes: require('./flowNodes'),
  adminCommands: require('./adminCommands'),
  adapters: {
    ownerCommand: require('./adapters/ownerCommandAdapter'),
    businessSetup: require('./adapters/businessSetupAdapter'),
  },

  // Ops
  reportBuilder: require('./reportBuilder'),
  doctor: require('./doctor'),
};
