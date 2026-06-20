# Tenant Isolation Middleware

`lib/tenantIsolation/middleware.js` exports optional Express guards (default dry-run/report-only). They attach a redacted `req.tenantIsolation` decision and continue — they do **not** block existing routes unless `TENANT_ISOLATION_DRY_RUN=false`.

- `tenantBoundaryGuard(options)`
- `resellerBoundaryGuard(options)`
- `workspaceBoundaryGuard(options)`
- `publicResponseRedactionGuard(options)`
- `developerScopeBoundaryGuard(options)`
- `exportBoundaryGuard(options)`

Do not mass-apply to existing routes — wire only to new Tenant Isolation routes or clearly safe new endpoints; document integration points elsewhere.
