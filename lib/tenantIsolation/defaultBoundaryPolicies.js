// lib/tenantIsolation/defaultBoundaryPolicies.js — The 12 default boundary policies.
module.exports = [
  { name: 'Tenant own-workspace only', boundaryType: 'tenant', targetModules: ['tenantPortal', 'saasBilling'], allowedActors: ['tenant', 'admin'], blockedFields: ['phone', 'email', 'paymentRef'], severity: 'high' },
  { name: 'Reseller assigned clients only', boundaryType: 'reseller', targetModules: ['resellerPortal'], allowedActors: ['reseller', 'admin'], blockedFields: ['phone', 'email', 'paymentRef'], severity: 'high' },
  { name: 'Support agent assigned tickets only', boundaryType: 'support', targetModules: ['supportHelpdesk'], allowedActors: ['support_agent', 'admin'], blockedFields: ['paymentRef', 'token'], severity: 'medium' },
  { name: 'Developer scoped/redacted payloads', boundaryType: 'developer_api', targetModules: ['developerPortal'], allowedActors: ['developer_app', 'admin'], blockedFields: ['secret', 'token', 'paymentRef'], severity: 'high' },
  { name: 'Public pages public-safe only', boundaryType: 'public', targetModules: ['publicFunnel'], allowedActors: ['public'], blockedFields: ['phone', 'email', 'paymentRef', 'token', 'secret', 'rawMessage'], severity: 'critical' },
  { name: 'Billing preview/redacted unless admin', boundaryType: 'billing', targetModules: ['saasBilling'], allowedActors: ['admin', 'tenant'], blockedFields: ['paymentRef', 'transactionId'], severity: 'high' },
  { name: 'Audit data redacted, no raw export', boundaryType: 'audit', targetModules: ['auditLedger', 'complianceCenter'], allowedActors: ['admin'], blockedFields: ['phone', 'email', 'secret', 'token'], severity: 'high' },
  { name: 'Team member no cross-workspace', boundaryType: 'workspace', targetModules: ['teamAccess'], allowedActors: ['workspace_member', 'admin'], severity: 'high' },
  { name: 'Pilot/trial no full contact', boundaryType: 'customer', targetModules: ['pilotOps'], allowedActors: ['admin', 'tenant'], blockedFields: ['phone', 'email'], severity: 'medium' },
  { name: 'Customer 360 mask phone/email/payment', boundaryType: 'customer', targetModules: ['customer360'], allowedActors: ['admin', 'tenant'], blockedFields: ['phone', 'email', 'paymentRef'], severity: 'high' },
  { name: 'Webhook payloads redacted', boundaryType: 'developer_api', targetModules: ['developerPortal', 'securityGateway'], allowedActors: ['developer_app', 'system'], blockedFields: ['secret', 'token', 'phone', 'email'], severity: 'high' },
  { name: 'Raw runtime data never public', boundaryType: 'public', targetModules: ['*'], allowedActors: ['admin'], blockedFields: ['rawMessage', 'transcript', 'orderData', 'secret', 'token'], severity: 'critical' },
];
