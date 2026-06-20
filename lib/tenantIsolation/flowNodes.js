// lib/tenantIsolation/flowNodes.js — Flow Studio trigger/action registry entries (no live external execution).
const triggers = [
  { id: 'tenant_isolation.boundary_violation', label: 'Boundary violation', outputs: ['boundaryType', 'riskLevel'] },
  { id: 'tenant_isolation.pii_leak_detected', label: 'PII leak detected', outputs: ['leakCount', 'riskLevel'] },
  { id: 'tenant_isolation.secret_leak_detected', label: 'Secret leak detected', outputs: ['riskLevel'] },
  { id: 'tenant_isolation.cross_tenant_attempt', label: 'Cross-tenant attempt', outputs: ['boundaryType'] },
  { id: 'tenant_isolation.public_route_risk', label: 'Public route risk', outputs: ['route', 'riskLevel'] },
];
const actions = [
  { id: 'run_boundary_check', label: 'Run boundary check', live: false },
  { id: 'scan_payload_for_leaks', label: 'Scan payload for leaks', live: false },
  { id: 'create_isolation_warning', label: 'Create isolation warning', live: false },
  { id: 'request_admin_review', label: 'Request admin review', live: false },
  { id: 'generate_isolation_report', label: 'Generate isolation report', live: false },
];
module.exports = { triggers, actions };
