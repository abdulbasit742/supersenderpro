// lib/securityGateway/flowNodes.js — Flow Studio trigger/action registry entries (no live external execution).
const triggers = [
  { id: 'security_gateway.abuse_detected', label: 'Abuse detected', outputs: ['riskLevel', 'abuseScore', 'route'] },
  { id: 'security_gateway.rate_limit_warning', label: 'Rate limit warning', outputs: ['scope', 'limit', 'retryAfterSeconds'] },
  { id: 'security_gateway.scope_mismatch', label: 'API scope mismatch', outputs: ['requiredScope'] },
  { id: 'security_gateway.tenant_isolation_warning', label: 'Tenant isolation warning', outputs: ['actorTenantHash', 'targetTenantHash'] },
  { id: 'security_gateway.raw_export_attempt', label: 'Raw export attempt', outputs: ['route'] },
  { id: 'security_gateway.live_action_blocked', label: 'Live action blocked', outputs: ['route', 'reason'] },
];
const actions = [
  { id: 'run_security_check', label: 'Run security check', live: false },
  { id: 'record_security_event', label: 'Record security event', live: false },
  { id: 'create_security_notification', label: 'Create security notification', live: false },
  { id: 'request_admin_review', label: 'Request admin review', live: false },
];
module.exports = { triggers, actions };
