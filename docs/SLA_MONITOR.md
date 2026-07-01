# AI SLA & Response-Time Monitor

Tracks support SLAs from conversation event timelines: **first-response time** and
**resolution time**, flags **breaches** and **at-risk** chats, and drafts a short
owner brief. Self-hosted Ollama phrases the brief; everything else is deterministic
and works with **no model and no network**.

## Why

The 24/7 WhatsApp support agent answers, takes orders, and escalates. This module
watches *how fast* those replies happen so nothing slips. Pakistan-first defaults
(business hours 9am-9pm, off-hours clock paused).

## Module layout

- `lib/slaMonitor/config.js` - env-overridable targets and guards
- `lib/slaMonitor/store.js` - tenant-scoped JSON store, mtime read-cache
- `lib/slaMonitor/index.js` - deterministic SLA math + optional AI brief
- `lib/slaMonitor/doctor.js` - offline self-check
- `routes/slaMonitorRoutes.js` - self-mountable Express router
- `scripts/wire-sla-monitor.js` - idempotent mounting (no server.js edits)
- `tests/smoke/slaMonitorSmoke.js` - offline smoke (auto-run by ci-smoke)

## Endpoints (`/api/sla`)

| Method | Path | Guard | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | - | liveness |
| GET | `/report` | - | scored conversations + totals (phones masked) |
| GET | `/brief` | admin | owner brief (Ollama-first, deterministic fallback) |
| POST | `/conversations` | admin | upsert conversation event timelines (dry-run safe) |

Tenant via `x-tenant-id` header or `tenantId` query/body. Admin via `x-admin-secret`.

## Config (env)

| Env | Default | Meaning |
| --- | --- | --- |
| `SLA_FIRST_RESPONSE_MIN` | 15 | first-response target (min) |
| `SLA_RESOLUTION_MIN` | 240 | resolution target (min) |
| `SLA_WARN_FRACTION` | 0.8 | at-risk threshold (fraction of target) |
| `SLA_BIZ_START` / `SLA_BIZ_END` | 9 / 21 | business hours |
| `SLA_PAUSE_OFF_HOURS` | true | pause SLA clock outside business hours |
| `OLLAMA_HOST` / `OLLAMA_MODEL` | 127.0.0.1:11434 / qwen2.5:32b | optional AI |

## Wiring

```js
require('./scripts/wire-sla-monitor')(app); // mounts at /api/sla
```

## Conversation shape

```json
{
  "id": "abc",
  "tenantId": "t1",
  "customer": "923001234567",
  "events": [
    { "t": "2026-06-30T10:00:00", "dir": "in", "kind": "open" },
    { "t": "2026-06-30T10:05:00", "dir": "out" }
  ],
  "resolvedAt": "2026-06-30T10:30:00"
}
```
