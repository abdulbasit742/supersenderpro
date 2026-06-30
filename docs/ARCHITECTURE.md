# SuperSender Pro - SaaS Architecture Overview

One map of the SaaS-readiness layer added on top of the existing app. Each subsystem follows the repo convention: `lib/<feature>/` (logic) + `routes/<feature>Routes.js` (HTTP) + a wire script + smoke test + doc.

## Subsystems
| Subsystem | lib | routes | mount | doc |
|---|---|---|---|---|
| Data layer (tenant-scoped) | `lib/db` | - (used by all) | n/a | PHASE1_POSTGRES_MULTITENANCY |
| Redis shared state | `lib/redis` | - | n/a | PHASE1_REDIS |
| Auth + RBAC | `lib/auth` | `authRoutes` | `/api/auth` | PHASE2_AUTH |
| Billing + Stripe | `lib/billing` | `billingRoutes` | `/api/billing` | PHASE2_BILLING |
| Sales & Pipeline | `lib/salesPipeline` | `salesPipelineRoutes` | `/api/sales-pipeline` | SALES_PIPELINE_COMMAND_CENTER |
| Health checks | `lib/healthCheck` | `healthRoutes` | `/api/health` | CORE_STABILITY_HEALTH_CHECK |
| Admin alerts | `lib/adminAlert` | `adminAlertRoutes` | `/api/admin-alerts` | CORE_STABILITY_ADMIN_ALERTS |
| Observability | `lib/observability` | `observabilityRoutes` | `/api/ops` | PHASE5_OBSERVABILITY |
| Uptime + dashboard | `lib/observability/uptime` | `opsDashboardRoutes` | `/api/ops/ui` | PHASE5_OPS_DASHBOARD |
| Graceful shutdown | `lib/lifecycle` | - | n/a | PHASE4_GRACEFUL_SHUTDOWN |
| Rate limits | `lib/security/guards` | - (middleware) | n/a | SECURITY_RATE_LIMITS |
| Security headers | `lib/security/headers` | - (middleware) | n/a | SECURITY_HEADERS |
| Request validation | `lib/security/validate` | - (middleware) | n/a | SECURITY_VALIDATION |
| Bootstrap (single mount) | `lib/bootstrap/registerSubsystems` | - | one hook | PHASE3_MODULAR_BOOTSTRAP |
| Deploy doctor | `lib/deploy/envSchema` | - | n/a | PHASE4_DEPLOY_HARDENING |

## Request order (via registerSubsystems.registerAll)
```
security headers + body-size guard
  -> request tracing (X-Request-Id)
    -> rate-limit guards (auth/webhook/api)
      -> feature routers (auth, billing, health, alerts, sales, ops, dashboard)
        -> [your existing app routes]
          -> error handler (last)
background: uptime monitor, admin-alert polling, graceful shutdown
```

## Data model (tenant-scoped)
All business data goes through `lib/db` keyed by `tenantId` (throws if missing). Driver `json` (default) or `postgres` (Prisma). Collections -> Prisma models: customers, orders, quotes, inbox_messages, txns, webhook_endpoints, follow_ups, users, subscriptions, usage->usageRecord, deals, carts.

## Environment (essentials)
| Key | Default | Purpose |
|---|---|---|
| `SESSION_SECRET` / `AUTH_JWT_SECRET` | - (required) | sessions + JWT signing |
| `DB_DRIVER` | `json` | `json` or `postgres` |
| `DATABASE_URL` | - | required when postgres |
| `REDIS_URL` | - | multi-instance shared state |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` | - | live billing |
| `BILLING_ENFORCE` | `warn` | `warn` then `block` |
| `SALES_PIPELINE_DRY_RUN` | `true` | prepare vs send |
| `ADMIN_ALERT_DRY_RUN` | `true` | prepare vs send |
| `SENTRY_DSN` | - | error tracking |
Full template: `.env.production.example`.

## Deploy flow
```bash
npm install
node scripts/wire-all.js          # or scripts/wire-bootstrap.js (single hook)
node scripts/deploy-doctor.js     # GO / NO-GO (env + hooks + doctors)
node scripts/ci-smoke.js          # all smoke tests + e2e + doctors
```

## Roadmap status
- [x] Phase 1: persistence seam + multi-tenancy + Redis shared state
- [x] Phase 2: auth + RBAC, plans + Stripe billing + usage metering
- [x] Phase 5: structured logs + tracing + error capture + uptime + dashboard
- [x] Phase 4 (partial): graceful shutdown, env validation/deploy doctor
- [x] Cross-cutting: sales pipeline, health, alerts, rate limits, security headers, validation, CI, e2e tenant-isolation test, single-call bootstrap
- [ ] Phase 3 (full): physically split the 2.1MB server.js route/socket/WA-engine code - **do with review**
- [ ] Phase 4 (full): stateless containers, managed Postgres/Redis, zero-downtime rollout - **do with review**

## Safety posture
Everything new defaults to safe: dry-run sends, json/memory storage, warn-only enforcement, no live charges. Tenant isolation is enforced at the data layer (missing tenantId throws) and proven by `tests/smoke/e2eFlowSmoke.js`.
