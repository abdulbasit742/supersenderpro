# Tenant Management

First-class tenant lifecycle for the multi-tenant SaaS. Auth, billing and the data layer were already tenant-scoped, but there was no API to **create / list / suspend / resume** tenants. This adds it.

## Storage
Tenant records live in a reserved platform namespace (`tenantId='__platform__'`) of the same `lib/db` repository, so we reuse the data layer without weakening isolation for real tenants.

## API (`/api/tenants`, platform-admin guarded)
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/tenants?status=` | list tenants |
| POST | `/api/tenants` | create `{ id?, name, planId? }` |
| GET | `/api/tenants/:id` | get one |
| POST | `/api/tenants/:id/suspend` | suspend `{ reason? }` |
| POST | `/api/tenants/:id/resume` | reactivate |
| POST | `/api/tenants/:id/plan` | set `{ planId }` |

Guarded by `PLATFORM_ADMIN_SECRET` (header `x-platform-secret`) - these are **cross-tenant** ops, distinct from a tenant's own owner/admin role.

## Enforcing suspension
`lib/tenants/guard.js` exports `requireActiveTenant()`. Mounted in the bootstrap before feature routers: a suspended tenant's requests get `403 tenant suspended`. No tenant context (public routes) passes through untouched.

## Verify
```bash
node tests/smoke/tenantsSmoke.js
```

## Env
```
PLATFORM_ADMIN_SECRET=         # required in prod to manage tenants (falls back to ADMIN_TOKEN)
```
