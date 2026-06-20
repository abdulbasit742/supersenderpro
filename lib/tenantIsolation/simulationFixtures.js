// lib/tenantIsolation/simulationFixtures.js — Synthetic (no real) contexts for cross-tenant simulations.
module.exports = [
  { id: 'sim_tenant_cross', name: 'Tenant A reads Tenant B customer preview', expectedBlock: true, ctx: { actorType: 'tenant', tenantId: 'T_A', targetTenantId: 'T_B', resourceType: 'customer', requestsPrivateData: true } },
  { id: 'sim_reseller_unassigned', name: 'Reseller reads unassigned client', expectedBlock: true, ctx: { actorType: 'reseller', resellerId: 'R1', assignedClientIds: ['C1'], targetClientId: 'C2' } },
  { id: 'sim_support_billing', name: 'Support agent tries billing admin action', expectedBlock: true, ctx: { actorType: 'support_agent', route: '/api/admin/billing', actionType: 'write', authPresent: false, requestsPrivateData: true, tenantId: 'T_A', targetTenantId: 'T_B' } },
  { id: 'sim_dev_scope', name: 'Developer app requests unsupported scope', expectedBlock: true, ctx: { actorType: 'developer_app', requiredScope: 'billing:read', providedScopes: ['public:read'] } },
  { id: 'sim_public_private', name: 'Public form requests private lead details', expectedBlock: true, ctx: { actorType: 'public', requestsPrivateData: true } },
  { id: 'sim_workspace_cross', name: 'Team member workspace A tries workspace B', expectedBlock: true, ctx: { actorType: 'workspace_member', workspaceId: 'W_A', targetWorkspaceId: 'W_B' } },
  { id: 'sim_webhook_raw', name: 'Webhook subscription tries raw payload', expectedBlock: true, ctx: { actorType: 'developer_app', requiredScope: 'webhook:redacted', providedScopes: [], requestsPrivateData: true } },
  { id: 'sim_audit_raw', name: 'Audit export tries raw data', expectedBlock: true, ctx: { actorType: 'public', route: '/api/audit/export', requestsPrivateData: true } },
  { id: 'sim_c360_email', name: 'Customer 360 response includes full email', expectedBlock: true, payload: { email: 'jane.doe@example.com', name: 'Jane' } },
  { id: 'sim_billing_payref', name: 'Billing preview includes payment ref', expectedBlock: true, payload: { paymentRef: 'txn_ABC123456', amount: 50 } },
];
