# Maintenance Mode

Cleanly pause traffic for a deploy, migration, or incident - clients get a `503 + Retry-After` instead of errors or half-written data, while probes/LB stay green.

## Modes
| Mode | Effect |
|---|---|
| `off` | normal |
| `read-only` | GET/HEAD allowed; writes (POST/PUT/PATCH/DELETE) -> 503 |
| `full` | everything -> 503 except the allowlist |

**Always reachable** (allowlist): `/api/health*`, `/version`, `/metrics`, `/api/maintenance` - so health checks, the load balancer, and the admin toggle keep working during maintenance.

## Toggle
- `GET /api/maintenance` - current status (open, so clients/frontends can show a banner).
- `POST /api/maintenance` (admin) `{ mode, message?, retryAfterSec? }`.
```bash
curl -XPOST /api/maintenance -H 'x-admin-secret: ...' -d '{"mode":"read-only","message":"DB migration"}'
```

## Typical use
1. `read-only` before a data migration so no new writes land mid-migration.
2. Run `scripts/migrate-json-to-postgres.js` / `prisma migrate`.
3. `off` when done.

State is in-memory per instance with an optional persisted flag (platform namespace) so a fleet can share it (`maintenance.loadPersisted()` on boot).

## Env
```
MAINTENANCE_MODE=off          # initial mode
MAINTENANCE_RETRY_AFTER=120   # seconds in the Retry-After header
```

## Verify
```bash
node tests/smoke/maintenanceSmoke.js
```
