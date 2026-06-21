'use strict';
// Aggregates all existing-module adapters into one read-only status map.
const names = ['localDemoAdapter', 'demoSandboxAdapter', 'approvalInboxAdapter', 'auditLedgerAdapter',
'securityGatewayAdapter', 'featureFlagsAdapter', 'teamAccessAdapter', 'tenantIsolationAdapter', 'developerPortalAdapter',
'supportHelpdeskAdapter', 'ecommerceAdapter', 'socialAdapter', 'voiceAIAdapter'];
function statusAll() {
  return names.map(function (n) { try { return require('./' + n).status(); } catch (e) { return { available: false,
provider: n }; } });
}
module.exports = { statusAll, names };
