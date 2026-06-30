# Phase 3 - Modular Bootstrap (one hook instead of nine)

The first **safe** step of breaking up the 2.1MB `server.js`: instead of nine separate hook blocks edited into the monolith, all subsystem wiring moves into one module with a single entry point.

## Before vs after
**Before** (9 insertion points in server.js): AUTH HOOK, BILLING HOOK, HEALTH CHECK HOOK, ADMIN ALERTS HOOK, SALES PIPELINE HOOK, OBSERVABILITY HOOK, OPS DASHBOARD HOOK, GRACEFUL SHUTDOWN HOOK, RATE LIMIT HOOK.

**After** (1 insertion point):
```js
require('./lib/bootstrap/registerSubsystems').registerAll(app, server);
```

## What registerAll does (in order)
1. observability request tracing (first -> everything after is traced)
2. rate-limit guards (auth/webhook/api)
3. feature routers: auth, billing, health, admin-alerts, sales-pipeline, ops, dashboard
4. error handler (last middleware)
5. uptime monitor + graceful shutdown + admin-alert polling (need the server handle)

Each step is individually guarded: if one subsystem throws on mount, the others still come up and the failure is reported (not fatal).

## Wire
```bash
node scripts/wire-bootstrap.js   # single SUBSYSTEMS HOOK
```
The per-subsystem `wire-*.js` scripts still exist; use either the single hook OR the individual ones, not both (the bootstrap and the individual hooks would double-mount).

## Ordering caveat (important)
`registerAll` is best called **right after `app` is created** so tracing + rate limits sit before routes defined elsewhere in server.js. The wire script inserts it after `listen()` as a safe default; for full effect, move the call up. This is exactly the kind of ordering the full Phase 3 split will formalize.

## Verify
```bash
node tests/smoke/bootstrapSmoke.js   # mounts everything on a throwaway app (needs express)
```

## Why this is the right first step
It shrinks the monolith's surface area (9 edits -> 1), centralizes mount order in a testable module, and is reversible. The eventual full split (routes/services/socket/WA-engine/bootstrap) can build on this seam instead of fighting the 2.1MB file directly.
