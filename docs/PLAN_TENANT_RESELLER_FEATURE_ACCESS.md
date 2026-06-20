# Plan / Tenant / Reseller Feature Access

Access is decided by `rolloutMode` + context:
- **plan_based** — `allowedPlans` must include the context plan; otherwise a billing upgrade preview is returned.
- **tenant_allowlist** — `allowedTenants` must include `tenantId`.
- **reseller_allowlist** — `allowedResellers` must include `resellerId`.
- **percentage_preview** — deterministic bucket (0-99) from tenant/reseller id vs `rolloutPercent` (no randomness).
- **beta_only** — context `betaGroup` must be true.
- **admin_only** — context role must be `admin`.

```
POST /api/feature-flags/access/check    {featureKey, tenantId, resellerId, planId, userRole, betaGroup}
POST /api/feature-flags/access/tenant   {featureKey, tenantId}
POST /api/feature-flags/access/reseller {featureKey, resellerId}
POST /api/feature-flags/access/plan     {featureKey, planId}
```
