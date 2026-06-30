# Phase 1 - Redis Shared State (multi-instance safety)

The last Phase 1 piece: move queue/locks/rate-limits off per-process memory so **2+ app instances run safely**. Without this, two instances can double-decrement stock or double-send.

## What's here
| File | Role |
|---|---|
| `lib/redis/client.js` | lazy ioredis connection; **null + memory fallback** when `REDIS_URL` unset |
| `lib/redis/lock.js` | distributed lock (`SET NX PX` + token-checked Lua release); `withLock(key, fn)` helper |
| `lib/redis/rateLimit.js` | fixed-window limiter (atomic `INCR`+`EXPIRE`) + Express `middleware()` |
| `lib/redis/cache.js` | TTL cache (`get/set/del`) for hot reads |

## Graceful fallback (important)
Every helper works **with or without Redis**. No `REDIS_URL` -> in-process memory (correct for one instance). Set `REDIS_URL` -> true shared state, and the same code is now multi-instance safe. Nothing to change in callers.

## Migrating existing code
- Replace `lib/stockMutex.js` usages with `withLock('stock:'+sku, fn)`.
- The queue already uses BullMQ (Redis-backed) per the roadmap; point it at the same `REDIS_URL`.
- Wrap abuse-prone routes with `rateLimit.middleware({ limit, windowSec })`.

## Verify
```bash
node tests/smoke/redisSmoke.js          # memory mode, no Redis required
REDIS_URL=redis://localhost:6379 node tests/smoke/redisSmoke.js   # against real Redis
```

## Env
```
REDIS_URL=redis://localhost:6379    # unset = in-memory single-instance fallback
```
`npm run setup:db` already starts a Redis container via docker-compose.

## Roadmap
- [x] Persistence seam + multi-tenancy (PR #86)
- [x] Auth + RBAC (PR #90), Billing (PR #95)
- [x] **Redis shared state (this)** - queue/locks/rate-limits multi-instance safe
- [ ] Split 2.1MB server.js into modules (Phase 3)
- [ ] Stateless containers + managed Postgres/Redis + zero-downtime deploy (Phase 4)
