# Phase 4 - Graceful Shutdown + Readiness Gating

First safe step toward zero-downtime deploys. Additive - no `server.js` rewrite, just one hook installed right after `listen()`.

## What it does
On `SIGTERM`/`SIGINT` (what your orchestrator sends on deploy/scale-down):
1. Flip **readiness** to draining -> `/api/health/ready` returns 503, so the load balancer stops routing new traffic to this instance.
2. Wait `SHUTDOWN_DRAIN_MS` (default 3s) so the LB notices.
3. Stop accepting new connections (`server.close`).
4. Run registered closers (Redis `quit`, Prisma `$disconnect`, queues) with a hard `SHUTDOWN_DEADLINE_MS` (default 15s) safety timer.
5. Exit cleanly (or force-exit at the deadline).

## Integrating readiness
Gate `/api/health/ready` (and any custom readiness) with `require('lib/lifecycle').isReady()`. While draining it returns false -> 503. Other modules register cleanup via `onShutdown(name, fn)`.

## Wire + verify
```bash
node scripts/wire-graceful-shutdown.js   # installs handlers right after listen()
node tests/smoke/lifecycleSmoke.js
```
The wire script auto-detects the server handle (`server`/`httpServer`/`app`) from the `listen()` call. Verify the inserted line references the right variable.

## Env
```
SHUTDOWN_DRAIN_MS=3000      # grace for LB to see readiness=false
SHUTDOWN_DEADLINE_MS=15000  # hard cap before force-exit
```

## Roadmap
- [x] Phase 1, Phase 2, Phase 5 (observability + dashboard)
- [x] **Phase 4: graceful shutdown + readiness gating (this)**
- [ ] Stateless containers + managed PG/Redis + zero-downtime rollout (Phase 4 cont.)
- [ ] Split 2.1MB server.js (Phase 3) - do with review
