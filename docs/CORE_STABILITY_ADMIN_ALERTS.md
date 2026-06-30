# Core Stability - Admin Alerts

Satisfies the backlog **admin alert for Core Stability** cluster (TASK-0041..0060). Pairs with the health-check subsystem (PR #53): when a probe goes `degraded`/`down`, the owner gets notified.

## How it works
- Polls `lib/healthCheck` every `ADMIN_ALERT_POLL_SEC` (default 60s).
- If status meets/exceeds `ADMIN_ALERT_MIN_SEVERITY`, raises an alert.
- **Dedupe via cooldown** (`ADMIN_ALERT_COOLDOWN_MIN`, default 15m) so you don't get spammed while something stays down.
- Dispatches via the project's `global.sendWhatsApp` to `ADMIN_ALERT_RECIPIENTS`; if unavailable or in dry-run, it logs instead (never throws).

## Endpoints (`/api/admin-alerts`)
| Path | Purpose |
|---|---|
| `GET /status` | config + last-alert timestamps + history count |
| `GET /history?limit=` | recent alerts |
| `POST /evaluate` | evaluate against live health report now (admin) |
| `POST /test` | send a synthetic `down` alert to verify dispatch (admin) |

## Wire it up
```bash
node scripts/wire-admin-alerts.js   # mounts route + starts health polling (idempotent)
```

## Env
```
ADMIN_ALERT_ENABLED=true
ADMIN_ALERT_DRY_RUN=true              # prepare, don't send
ADMIN_ALERT_MIN_SEVERITY=down         # degraded | down
ADMIN_ALERT_COOLDOWN_MIN=15
ADMIN_ALERT_POLL_SEC=60
ADMIN_ALERT_RECIPIENTS=9230000000000  # comma-separated WhatsApp numbers
```

## Going live
Set `ADMIN_ALERT_DRY_RUN=false`, add `ADMIN_ALERT_RECIPIENTS`, and ensure a `global.sendWhatsApp(to, text, meta)` sender exists. Verify with `POST /api/admin-alerts/test`.
