# Emergency Kill Switches

Kill switch supports: disable a module immediately (preview), mark feature `killed`, owner warning, incident
warning, audit event, evaluator block, and rollback recommendation.

## Triggers
`security_risk, compliance_risk, payment_billing_risk, tenant_data_leak_risk, webhook_abuse,
external_api_failure, whatsapp_ban_risk, high_error_rate, admin_manual`

## Default behavior
- **Preview only** unless `FEATURE_FLAGS_ALLOW_KILL_SWITCH_WRITE=true`.
- Even when write is enabled, an **audit event + approval** are required unless `emergency:true` is explicitly
  passed.
- A killed flag is **always blocked** by the evaluator.

```
POST /api/feature-flags/kill-switch/preview        {featureKey, reason}
POST /api/feature-flags/kill-switch/:key/preview   {reason}
GET  /api/feature-flags/kill-switches
```
