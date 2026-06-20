# Tenant Isolation Flow Nodes

`lib/tenantIsolation/flowNodes.js` registers Flow Studio triggers/actions (registry entries only — no live external execution).

## Triggers
- `tenant_isolation.boundary_violation`
- `tenant_isolation.pii_leak_detected`
- `tenant_isolation.secret_leak_detected`
- `tenant_isolation.cross_tenant_attempt`
- `tenant_isolation.public_route_risk`

## Actions
- `run_boundary_check` · `scan_payload_for_leaks` · `create_isolation_warning` · `request_admin_review` · `generate_isolation_report`
