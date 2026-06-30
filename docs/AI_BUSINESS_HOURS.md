# Business Hours / Away-Message Auto-Responder

Auto-replies to WhatsApp messages that arrive outside your store working hours, so customers always get an instant acknowledgement even when nobody is online.

## Why
- 24/7 acknowledgement without staff online.
- Deterministic schedule: no AI needed for the open/closed decision.
- Optional Ollama phrasing to keep the away-message warm and on-brand.
- Anti-spam: per-contact cooldown so one customer is not blasted repeatedly.

## Design rules honored
- ZERO new npm dependencies (Node built-ins + existing express only).
- server.js is NOT touched. Router is self-mountable.
- Deterministic core works with NO model. Ollama only enriches; template fallback when offline.
- File-backed storage under data/businessHoursAuto/.
- Tenant/store-scoped. Missing tenantId throws.

## Mount
    app.use(require('./routes/businessHoursAutoRoutes'));

## Config (per tenant)
POST /api/business-hours-auto/config (header x-tenant-id):

    {
      "timezone": "Asia/Karachi",
      "hours": { "0": [], "1": [["09:00", "18:00"]], "6": [["10:00", "14:00"]] },
      "holidays": ["2026-08-14"],
      "awayMessage": "Hum abhi offline hain, working hours mein jawab denge.",
      "cooldownMinutes": 120,
      "useOllama": true
    }

- hours: keyed by weekday (0=Sun .. 6=Sat); each value is an array of [open, close] HH:MM windows. Empty array = closed that day.
- holidays: YYYY-MM-DD strings (closed all day).

## Endpoints
| Method | Path | Purpose |
| --- | --- | --- |
| GET | /api/business-hours-auto/config | Read config |
| POST | /api/business-hours-auto/config | Update config |
| GET | /api/business-hours-auto/status?when=ISO | Open/closed right now (or at when) |
| POST | /api/business-hours-auto/incoming | Decide auto-reply for an inbound message |

### incoming body
    { "contact": "+923001234567", "when": "2026-06-30T19:00:00Z" }

Returns { shouldReply, message?, status, reason }. reason is one of within-hours, after-hours, closed-day, holiday, cooldown.

## Wire into inbound flow
In your WhatsApp inbound handler, call handleIncoming first; if shouldReply is true, send message and skip the normal bot pipeline.

## Test
    node tests/smoke/businessHoursAutoSmoke.js

Forces OLLAMA_HOST unreachable to prove the deterministic core + template fallback work offline.
