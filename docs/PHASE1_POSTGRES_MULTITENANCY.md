# Phase 1 - Postgres + Multi-tenancy Foundation

This is the heart of the SaaS-readiness roadmap: **one source of truth + hard tenant boundaries**, with a clean swap path off JSON files. It does NOT rip out the existing JSON store overnight; it introduces the seam so the swap is incremental and safe.

## What's here
| File | Role |
|---|---|
| `prisma/schema.prisma` | Core tables (Tenant, Customer, Order, Quote, InboxMessage, Txn, WebhookEndpoint, FollowUp). Every table has `tenantId` + composite indexes. |
| `lib/db/index.js` | The data-access layer / service seam. Routes call this, not fs or Prisma. Driver-selectable: `json` (default) or `postgres`. |
| `scripts/migrate-json-to-postgres.js` | Idempotent importer from legacy `data/*.json` into Postgres. |
| `scripts/db-doctor.js` | Connectivity + tenant-isolation self-check. |

## Hard tenant isolation
Every repository method takes `tenantId` first. A missing tenantId **throws**. The Postgres driver force-merges `{ tenantId }` into every where-clause, and the JSON driver puts the tenant in the file path - so one customer can never read another's data. `db-doctor` proves it (cross-tenant read must return null).

## Rollout (incremental, low-risk)
1. `npm i` (adds `@prisma/client`, `prisma`, `pg`).
2. Start DB: `npm run setup:db` (docker-compose db + redis, already in repo).
3. `npx prisma migrate dev -n init` then `npx prisma generate`.
4. Dry-run import: `DB_DRIVER=postgres DATABASE_URL=... node scripts/migrate-json-to-postgres.js --dry`.
5. Real import, then flip services to the repo one module at a time.
6. Set `DB_DRIVER=postgres` once a module is migrated; others keep working on JSON.

## Verify
```bash
node scripts/db-doctor.js                 # json driver (default)
DB_DRIVER=postgres DATABASE_URL=... node scripts/db-doctor.js
```

## Why a seam instead of a big-bang rewrite
The 2.1MB `server.js` reads JSON inline everywhere. Swapping all of it at once is how you break production. The repository lets each route/service migrate independently behind one interface - exactly the Phase 3 'thin service layer' goal, delivered early so the DB swap is clean.

## Env
```
DB_DRIVER=json                 # json (default) | postgres
DATABASE_URL=postgresql://user:pass@localhost:5432/supersender
```
