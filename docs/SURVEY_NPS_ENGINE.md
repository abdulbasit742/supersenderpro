# AI Survey + NPS/CSAT Engine (#145)

WhatsApp-native customer feedback: build surveys, schedule sends (dry-run safe),
collect responses, and compute **NPS / CSAT / CES** automatically. Free-text
verbatims get clustered into themes deterministically, and optionally summarised
by your self-hosted **Ollama** model when one is reachable.

## Why GPU-edge

- Verbatim theming/summarisation runs on **your own RTX A6000 via Ollama**
  (`qwen2.5:32b`). Zero cloud cost, customer feedback never leaves your box.
- If no model is up, a keyword clusterer gives you themes anyway. The core
  scoring never needs a model.

## Endpoints (mounted at `/api/survey`)

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET  | `/health` | - | liveness |
| GET  | `/templates` | - | list built-in templates (nps, csat, ces) |
| GET  | `/surveys` | tenant | list surveys |
| GET  | `/surveys/:id` | tenant | one survey |
| GET  | `/surveys/:id/score` | tenant | NPS / CSAT / CES result |
| GET  | `/surveys/:id/themes` | tenant | verbatim themes (Ollama-optional) |
| POST | `/surveys` | admin | create a survey |
| POST | `/surveys/:id/schedule` | admin | build send plan (dry-run default) |
| POST | `/surveys/:id/responses` | tenant | record a customer response |

Tenant via `x-tenant-id` header (or `?tenant=`). Admin writes guarded by
`x-admin-secret` matching `ADMIN_TOKEN` (open when no token set, for dev).

## Scoring

- **NPS**: promoters (9-10) - detractors (0-6), as a % of all responses. Range -100..100.
- **CSAT** (1-5) / **CES** (1-7): average score + top-box % (top two values).

## Quick start

```bash
# create an NPS survey
curl -XPOST localhost:3000/api/survey/surveys \
  -H 'x-tenant-id: acme' -H 'content-type: application/json' \
  -d '{"name":"Post-purchase NPS","template":"nps","audience":["+923001234567"]}'

# build the send plan (dry-run, phones masked, nothing actually sent)
curl -XPOST localhost:3000/api/survey/surveys/<id>/schedule -H 'x-tenant-id: acme'

# record a response
curl -XPOST localhost:3000/api/survey/surveys/<id>/responses \
  -H 'x-tenant-id: acme' -H 'content-type: application/json' \
  -d '{"phone":"+923001234567","score":9,"comment":"delivery fast"}'

# get the NPS + themes
curl localhost:3000/api/survey/surveys/<id>/score -H 'x-tenant-id: acme'
curl localhost:3000/api/survey/surveys/<id>/themes -H 'x-tenant-id: acme'
```

## Self-hosted AI

Set `OLLAMA_HOST=http://127.0.0.1:11434` and `OLLAMA_KEEP_ALIVE=-1`. Theming
uses the shared `aiBrain`/`llmHub` resolver, so it follows your existing
provider config. No model? You still get keyword themes.

## Storage

Tenant-scoped JSON under `data/survey/<tenant>/`. Phones are masked at rest.
Dry-run by default: the engine **never** sends WhatsApp messages itself.

## Test

```bash
node tests/smoke/surveySmoke.js   # offline, no model needed
```
