# AI Customer Birthday & Occasion Greeter (#122)

Auto-collect per-contact occasion dates (birthday, anniversary, Eid, New Year, custom) and send warm, on-brand WhatsApp greetings on the right day, optionally with a discount code. Deterministic date logic works with no model; Ollama (qwen2.5:32b) phrases the message when available, with a safe template fallback.

## Why it's different from drip (#62) and recurring scheduler (#82)
- Drip = sequence triggered by an event (e.g. signup) over relative days.
- Recurring scheduler = fixed cron-like cadence for broadcasts.
- Occasion greeter = **date-of-occasion driven, per contact**. Each customer has their own birthday/anniversary; the engine figures out who is due today or in the next N days.

## Storage
- File-backed under `data/occasionGreeter/<tenantId>.json`.
- Tenant/store-scoped: every call needs a tenantId (missing tenantId throws).

## Date formats accepted
- `YYYY-MM-DD` (e.g. `2026-06-30`)
- `MM-DD` (e.g. `06-30`) — year-agnostic, recommended for recurring occasions
- `DD/MM` (e.g. `30/06`)

## Library API (`lib/occasionGreeter/occasionGreeter.js`)
- `upsertContact(tenantId, { phone, name, occasions: [{ type, label, date, discountCode }] })`
- `dueOccasions(tenantId, windowDays = 0, today?)` — contacts due today (0) or within N days
- `buildGreetings(tenantId, windowDays = 0, today?)` — same list with composed `message` (Ollama or template)
- `listContacts(tenantId)` / `removeContact(tenantId, phone)`
- Occasion types: `birthday`, `anniversary`, `eid`, `newyear`, `custom`

## HTTP API (`routes/occasionGreeterRoutes.js`)
Mount once (server.js untouched):
```js
app.use('/api/occasion-greeter', require('./routes/occasionGreeterRoutes'));
```
Tenant via `x-tenant-id` header, or `tenantId` in body/query.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/contacts` | Add/update a contact + occasions |
| GET | `/contacts` | List stored contacts |
| DELETE | `/contacts/:phone` | Remove a contact |
| GET | `/due?window=7` | Who is due (today or next N days), no text |
| GET | `/greetings?window=0` | Composed greetings (Ollama or template) |

### Example
```bash
curl -X POST localhost:3000/api/occasion-greeter/contacts \
  -H 'x-tenant-id: store1' -H 'content-type: application/json' \
  -d '{"phone":"+923001234567","name":"Ali","occasions":[{"type":"birthday","date":"06-30","discountCode":"BDAY10"}]}'

curl 'localhost:3000/api/occasion-greeter/greetings?window=0' -H 'x-tenant-id: store1'
```

## Daily use
Run a daily job (or call from the AI Suite mounter #52) hitting `/greetings?window=0` each morning; pipe the returned messages into your normal WhatsApp send path. All sends remain DRY-RUN/safe by default per repo convention.

## Smoke test
```bash
node tests/smoke/occasionGreeterSmoke.js
```
Forces an unreachable Ollama host so it validates the deterministic core + template fallback with no model running.
