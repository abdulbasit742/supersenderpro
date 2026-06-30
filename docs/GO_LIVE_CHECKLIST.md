# Go-Live Checklist - SuperSender Pro (Phase 1 + 2)

Everything below is now on `main`. This is the order to actually run it in production.

## 1. Install deps
```bash
npm install            # adds @prisma/client, prisma, pg (Phase 1) + existing deps
npm install stripe     # only if going live with billing
```

## 2. Set environment
Minimum to boot safely (everything defaults to safe/dry-run if unset):
```
SESSION_SECRET=<strong-random>
AUTH_JWT_SECRET=<strong-random>
DB_DRIVER=json                 # keep json until Postgres is migrated, then flip to postgres
```
Billing (when ready to charge):
```
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
STRIPE_PRICE_STARTER=...
STRIPE_PRICE_PRO=...
BILLING_ENFORCE=warn           # flip to block after a warn-only period
APP_URL=https://your-app
```
Alerts (optional):
```
ADMIN_ALERT_DRY_RUN=false
ADMIN_ALERT_RECIPIENTS=92300xxxxxxx
```

## 3. Wire the subsystems into server.js (one command)
```bash
node scripts/wire-all.js
```
This idempotently adds: AUTH HOOK, BILLING HOOK, HEALTH CHECK HOOK, ADMIN ALERTS HOOK, SALES PIPELINE HOOK. Safe to re-run.

## 4. (Optional) Migrate to Postgres
```bash
npm run setup:db                                  # docker-compose db + redis
npx prisma migrate dev -n init && npx prisma generate
DB_DRIVER=postgres DATABASE_URL=... node scripts/migrate-json-to-postgres.js --dry   # preview
DB_DRIVER=postgres DATABASE_URL=... node scripts/migrate-json-to-postgres.js         # real
DB_DRIVER=postgres node scripts/db-doctor.js      # proves tenant isolation
```
Flip `DB_DRIVER=postgres` only once a module's data is migrated; others keep running on json.

## 5. Verify before exposing traffic
```bash
node scripts/ci-smoke.js          # all smoke tests + doctors
node scripts/health-verify.js     # exits non-zero if unhealthy
```
Then hit:
- `GET /api/health` -> expect 200 ok
- `GET /api/billing/plans` -> lists Free/Starter/Pro
- `POST /api/auth/signup` (first user becomes owner)

## 6. Stripe webhook
Point a Stripe webhook at `POST /api/billing/webhook/stripe` for events:
`checkout.session.completed`, `invoice.payment_succeeded`, `invoice.payment_failed`, `customer.subscription.deleted`.
Confirm that path receives the **raw** body (not pre-parsed by a global `express.json()`).

## Roadmap status
- [x] Phase 1: persistence seam + multi-tenancy (tenant-scoped data layer, Prisma schema, migration)
- [x] Phase 2: auth + RBAC, plans + Stripe billing + usage metering
- [x] Sales & Pipeline (deal-closing), health checks, admin alerts
- [x] CI smoke suite guarding all of it
- [ ] Redis for shared queue/locks (Phase 1 remaining)
- [ ] Split the 2.1MB server.js into modules (Phase 3)
- [ ] Deploy: stateless containers, managed Postgres/Redis, zero-downtime (Phase 4)
