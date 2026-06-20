// developerPortal/adapters/index.js — registry of all source-module adapters.
const publicFunnelAdapter = require('./publicFunnelAdapter');
const supportHelpdeskAdapter = require('./supportHelpdeskAdapter');
const pilotOpsAdapter = require('./pilotOpsAdapter');
const resellerPortalAdapter = require('./resellerPortalAdapter');
const templateMarketplaceAdapter = require('./templateMarketplaceAdapter');
const customer360Adapter = require('./customer360Adapter');
const saasBillingAdapter = require('./saasBillingAdapter');
const complianceAdapter = require('./complianceAdapter');
const approvalInboxAdapter = require('./approvalInboxAdapter');
const auditLedgerAdapter = require('./auditLedgerAdapter');
const n8nBridgeAdapter = require('./n8nBridgeAdapter');
const integrationMarketplaceAdapter = require('./integrationMarketplaceAdapter');
const flowStudioAdapter = require('./flowStudioAdapter');
const ownerCommandAdapter = require('./ownerCommandAdapter');
const kpiCommandAdapter = require('./kpiCommandAdapter');
const deploymentCommandAdapter = require('./deploymentCommandAdapter');
const incidentCommandAdapter = require('./incidentCommandAdapter');
const backupRestoreAdapter = require('./backupRestoreAdapter');
const businessSetupAdapter = require('./businessSetupAdapter');
const ALL = [publicFunnelAdapter, supportHelpdeskAdapter, pilotOpsAdapter, resellerPortalAdapter, templateMarketplaceAdapter, customer360Adapter, saasBillingAdapter, complianceAdapter, approvalInboxAdapter, auditLedgerAdapter, n8nBridgeAdapter, integrationMarketplaceAdapter, flowStudioAdapter, ownerCommandAdapter, kpiCommandAdapter, deploymentCommandAdapter, incidentCommandAdapter, backupRestoreAdapter, businessSetupAdapter];
function statuses(){ return ALL.map(a=>a.status()); }
function available(){ return ALL.filter(a=>a.isAvailable()).map(a=>a.name); }
module.exports = { ALL, statuses, available, publicFunnelAdapter, supportHelpdeskAdapter, pilotOpsAdapter, resellerPortalAdapter, templateMarketplaceAdapter, customer360Adapter, saasBillingAdapter, complianceAdapter, approvalInboxAdapter, auditLedgerAdapter, n8nBridgeAdapter, integrationMarketplaceAdapter, flowStudioAdapter, ownerCommandAdapter, kpiCommandAdapter, deploymentCommandAdapter, incidentCommandAdapter, backupRestoreAdapter, businessSetupAdapter };
