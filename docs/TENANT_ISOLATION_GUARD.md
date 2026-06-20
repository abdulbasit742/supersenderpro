# Tenant Isolation Guard

`lib/securityGateway/tenantIsolationGuard.js` checks reseller/tenant/client access safety.

```
check({ actorTenant, targetTenant }) -> { actorTenantHash, targetTenantHash, isolationWarning, allowed, wouldBlockLive, dryRun }
```

- Tenant IDs are **hashed** in output; raw IDs are never returned.
- Mismatch raises `isolationWarning` but is report-only unless enforcement is enabled.
- Endpoint: `POST /api/security-gateway/validate/tenant-access`.

Does not rebuild SaaS Billing or Tenant Portal — coordination only.
