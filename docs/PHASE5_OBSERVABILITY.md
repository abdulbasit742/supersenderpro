# Phase 5 - Observability

Hear about breakage before the customer does. Structured logs + request tracing + error capture. Fully **additive** - no surgery on the 2.1MB `server.js` (just two hook blocks via the wire script), so it's low-risk to land now.

## What's here
| File | Role |
|---|---|
| `lib/observability/logger.js` | pino-backed structured logger (pino already a dep); console shim fallback; `child(meta)` for per-request binding |
| `lib/observability/tracing.js` | `requestTracing()` middleware: assigns `X-Request-Id`, binds `req.log`, logs method/status/duration; `errorHandler()` |
| `lib/observability/errorTracker.js` | `capture(err, ctx)` -> Sentry when `SENTRY_DSN` set + `@sentry/node` installed, else in-memory ring buffer + log |
| `routes/observabilityRoutes.js` | `/api/ops/errors`, `/api/ops/log-level` (admin) |

## Wire
```bash
node scripts/wire-observability.js   # adds tracing (early) + /api/ops + error handler (late)
```
The error handler must be the **last** middleware; the wire script inserts it before `listen()`. If you want every route access-logged, ensure `requestTracing()` sits right after `app` is created (verify order in server.js).

## Verify
```bash
node tests/smoke/observabilitySmoke.js
# after wiring + boot:
curl localhost:PORT/api/ops/errors -H 'x-admin-secret: ...'
```

## Env
```
LOG_LEVEL=info
SENTRY_DSN=                 # set + `npm i @sentry/node` to ship errors to Sentry
SENTRY_TRACES_RATE=0
ERROR_BUFFER_SIZE=100
```

## Roadmap
- [x] Phase 1 (persistence + tenancy + Redis), Phase 2 (auth + billing)
- [x] Sales pipeline, health checks, admin alerts, CI, go-live tooling
- [x] **Phase 5 observability (this): logs + tracing + error capture**
- [ ] Uptime monitoring + admin dashboard (Phase 5 cont.)
- [ ] Split 2.1MB server.js (Phase 3) + deploy (Phase 4) - do with review
