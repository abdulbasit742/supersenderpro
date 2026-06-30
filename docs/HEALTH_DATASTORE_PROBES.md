# Health Check - DB + Redis Probes

The health check already covered event-loop, memory, disk, JSON store and Ollama. This adds the two dependencies most likely to take the app down: the **data layer** and **Redis**.

## New probes
| Probe | ok | degraded | down |
|---|---|---|---|
| `db` | `repo.ping()` succeeds | - | repository unreachable (e.g. postgres down) |
| `redis` | reachable (`REDIS_URL` set) | unconfigured/unreachable (memory fallback active) | - |

Redis is **degraded, never down**: the app has an in-memory fallback, so it still serves - it's just not multi-instance safe until Redis is back. The data layer is **down** if it can't ping (on postgres that means the DB is unreachable, which should pull the node from rotation).

## Readiness now gates on DB
`/api/health/ready` now also checks `db` - so a node with a dead database is marked not-ready and drained, instead of accepting traffic it can't serve.

## Reuse, not duplication
Probes call the modules' own `repo.ping()` and `redis.healthz()` - no second connection path to drift.

## Verify
```bash
node tests/smoke/healthProbesSmoke.js
# after boot: curl localhost:PORT/api/health  (see checks.db, checks.redis)
```
