# Multi-Tenant Data Isolation + Workspace Boundary + Leak Detection Command Center

A safe **coordination layer** for SuperSender Pro. It does **not** replace Team Access, Tenant Portal, SaaS Billing, Security Gateway, Feature Flags, Compliance Center, Developer Portal, Reseller Portal, Audit Ledger, or auth/RBAC — it coordinates boundary checks across them via safe adapters.

## What it does
- Tenant / reseller / workspace / customer boundary checks
- API response & public-route PII/secret leak detection
- Developer API scope/data isolation preview
- Route & store (source-only) boundary scanning
- Cross-tenant leak simulations
- Isolation dashboard, docs, check script, smoke test

## Default posture
- `TENANT_ISOLATION_DRY_RUN=true` — report-only
- `TENANT_ISOLATION_BLOCK_CROSS_TENANT=true` — cross-tenant access is denied in decisions
- PII & secrets redacted · raw export disabled · non-destructive · no external calls

## Layout
- `lib/tenantIsolation/*` — config, store, redactor, privacy/safety guards, boundary model + evaluator, leak/payload scanners, route/store scanners, cross-tenant simulation, doctor, middleware, flow nodes, admin commands, 16 adapters
- `routes/tenantIsolationRoutes.js` — mounted at `/api/tenant-isolation`
- `public/tenant-isolation.html` + js + css

## Test
```
npm run tenant-isolation:check
npm run tenant-isolation:smoke
```

## What NOT to commit
`.env`, `data/tenant-isolation*.json`, raw tenant/customer/member data, raw leak reports with full PII, tokens, secrets. Protected in `.gitignore`.

_Coordination layer only. Generated reference._
