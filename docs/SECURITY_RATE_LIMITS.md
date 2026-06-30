# Security - Rate-Limit Guards

Ready-to-mount rate limiters for abuse-prone routes, built on the Redis limiter (PR #126) so they're **shared across instances** (and fall back to in-memory for single-instance dev).

## Presets (`lib/security/guards.js`)
| Guard | Default | Keyed by | Use |
|---|---|---|---|
| `authGuard` | 10 / 60s | **IP** | brute-force protection on `/api/auth` (login/signup/reset) |
| `webhookGuard` | 120 / 60s | IP | `/api/billing/webhook` flood protection |
| `apiGuard` | 300 / 60s | tenant or IP | general `/api` ceiling |
| `broadcastGuard` | 30 / 60s | tenant or IP | wrap broadcast/send endpoints |

All limits override via env (`RL_AUTH_LIMIT`, `RL_API_WINDOW`, etc.) with **no code change**. The limiter never blocks traffic if it errors (fails open).

## Apply them
```bash
node scripts/wire-rate-limits.js   # mounts authGuard on /api/auth, webhookGuard on billing webhook, apiGuard on /api
```
Or import directly in a route: `router.post('/broadcast', require('../lib/security/guards').broadcastGuard, handler)`.

## Ordering note
Guards must run **before** the handlers they protect. The wire script inserts the block near the listen anchor as a safe default; if your routes are mounted later in `server.js`, move the `RATE LIMIT HOOK` block above those mounts for full effect.

## Verify
```bash
node tests/smoke/rateLimitGuardsSmoke.js
```

## Headers returned
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset` (seconds). Over cap -> `429` with `{ scope, retryMs }`.
