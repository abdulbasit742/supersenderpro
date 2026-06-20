# Security Gateway Flow Nodes

`lib/securityGateway/flowNodes.js` registers Flow Studio triggers/actions (registry entries only — **no live external execution**).

## Triggers
- `security_gateway.abuse_detected`
- `security_gateway.rate_limit_warning`
- `security_gateway.scope_mismatch`
- `security_gateway.tenant_isolation_warning`
- `security_gateway.raw_export_attempt`
- `security_gateway.live_action_blocked`

## Actions
- `run_security_check`
- `record_security_event`
- `create_security_notification`
- `request_admin_review`

Add these to Flow Studio's registry only if Flow Studio exists.
