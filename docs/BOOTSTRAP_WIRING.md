# Bootstrap Wiring (complete)

`lib/bootstrap/registerSubsystems.registerAll(app, server)` now mounts **everything** built this session, in the right order, with one call in `server.js`.

## Full order
```
security headers + body-size guard
  -> CORS
    -> request timeout + slow-request log
      -> request tracing (X-Request-Id) + http metrics
        -> rate-limit guards (auth/webhook/api)
          -> feature routers:
             /api/auth /api/billing /api/sales-pipeline /api/health
             /api/admin-alerts /api/ops (+dashboard) /version /metrics
             /api/docs /api/tenants /api/api-keys /api/audit
             /api/compliance /api/scheduler
            -> [existing app routes]
              -> 404 (unknown /api) -> error handler (last)
background: uptime monitor, scheduler (default jobs), admin-alert polling, graceful shutdown
```

## One hook in server.js
```js
require('./lib/bootstrap/registerSubsystems').registerAll(app, server);
```
(or run `node scripts/wire-bootstrap.js` to insert it). Use this OR the individual `wire-*.js` scripts, not both.

## Guarantees
- Each mount is guarded - one failing subsystem is reported, others still come up.
- Middleware order is correct (security/CORS/timeout/tracing/rate-limit BEFORE routes; 404 + error handler AFTER).
- Scheduler starts with default jobs and **stops on graceful shutdown** (registered via `onShutdown`).
- Returns a `{ mounted, failed }` report for boot logs.

## Verify
```bash
node tests/smoke/bootstrapSmoke.js
node scripts/ci-smoke.js
```
