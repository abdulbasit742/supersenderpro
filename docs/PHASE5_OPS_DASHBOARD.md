# Phase 5 - Uptime Monitor + Ops Dashboard

Completes observability: a self-uptime monitor and a zero-build admin dashboard so you can see the system at a glance.

## What's here
| File | Role |
|---|---|
| `lib/observability/uptime.js` | periodic self-probe of the health subsystem; rolling uptime %, incident log on status transitions |
| `routes/opsDashboardRoutes.js` | `/api/ops/dashboard` (JSON aggregate) + `/api/ops/ui` (single-file HTML dashboard) |
| `scripts/wire-ops-dashboard.js` | idempotent mount + starts the uptime monitor |

## The dashboard
`/api/ops/ui` is a single self-contained HTML page (no build step, no framework) that polls `/api/ops/dashboard` every 5s and shows: health status + per-probe states, uptime %, recent errors, plan list, and recent incidents. Open `…/api/ops/ui?secret=YOUR_ADMIN_SECRET` when an admin secret is configured.

## Wire + verify
```bash
node scripts/wire-ops-dashboard.js
node tests/smoke/uptimeSmoke.js
# after boot: open http://localhost:PORT/api/ops/ui
```

## Env
```
UPTIME_INTERVAL_SEC=60     # how often to sample health
UPTIME_SAMPLES=1440        # ring-buffer size (24h at 1/min)
```

## Roadmap
- [x] Phase 1, Phase 2, sales pipeline, health, alerts, CI, go-live tooling
- [x] Phase 5: logs + tracing + error capture (PR #133)
- [x] **Phase 5: uptime monitor + admin dashboard (this)**
- [ ] Split 2.1MB server.js (Phase 3) + deploy (Phase 4) - do with review
