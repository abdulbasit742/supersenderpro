# Job Scheduler

One place to register + observe periodic background work, instead of each subsystem spinning its own `setInterval` invisibly. Uses `node-cron` (already a dep) for cron expressions, with a `setInterval` fallback.

## Default jobs (`registerDefaults()`)
| Job | Interval | Does |
|---|---|---|
| `sales-tick` | `SALES_TICK_MS` (5m) | runs `salesPipeline.tick()` per tenant - due follow-ups + cart recovery (respects dry-run) |
| `audit-retention` | daily | trims `audit_log` older than `AUDIT_RETENTION_DAYS` (disabled unless set) |
| `uptime-sample` | `UPTIME_INTERVAL_SEC` | feeds the uptime monitor |

Multi-tenant: set `SALES_TICK_TENANTS=default,acme,...` for the jobs that iterate tenants.

## Register your own
```js
const scheduler = require('./lib/scheduler');
scheduler.register('nightly-report', { schedule: '0 2 * * *', fn: async () => { ... } }); // cron
scheduler.register('ping', { intervalMs: 30000, fn: async () => { ... }, runOnBoot: true });
```
Each job is wrapped: a throwing job is logged + recorded in status, never crashes the loop.

## Status
`GET /api/scheduler` (admin) -> `{ started, jobs: [{ name, schedule, runs, lastRun, lastError }] }`.

## Lifecycle
Call `scheduler.start()` after boot (and `registerDefaults()` first). `stop()` clears all timers - the graceful-shutdown hook (#140) can call it via `onShutdown`.

## Env
```
SALES_TICK_MS=300000
SALES_TICK_TENANTS=default
AUDIT_RETENTION_DAYS=0       # 0 = keep forever
```

## Verify
```bash
node tests/smoke/schedulerSmoke.js
```
