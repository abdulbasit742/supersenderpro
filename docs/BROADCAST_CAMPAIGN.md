# Broadcast Campaign Composer & Audience Targeter

AI-assisted broadcast builder for WhatsApp campaigns. Composes multi-variant
copy (A/B/n), targets an audience by deterministic rules, and produces a
throttled, quiet-hours-aware **dry-run** send plan. Nothing is ever sent unless
you wire a send adapter and explicitly disable dry-run.

## Why this exists

Blasting one message to everyone burns your WhatsApp number and ignores who
you're talking to. This lets you segment, test variants, and pace sends so the
number stays healthy.

## House rules honoured

- **Zero new dependencies** (Node built-ins + existing `express`).
- **Deterministic core**: works with NO model running. Template engine produces
  distinct Roman-Urdu + English variants on its own.
- **Optional AI**: if `lib/llmHub` is present and `CAMPAIGN_USE_LLM=true`, copy
  is phrased/varied by your self-hosted Ollama (qwen2.5:32b). Falls back to
  templates on any error or unreachable model.
- **Dry-run by default** (`CAMPAIGN_DRY_RUN=true`). No live sends.
- **Tenant-scoped**: every call needs a tenantId; missing tenantId throws.
- **server.js untouched**: router is self-mountable.

## Wiring

Auto-mounted via `lib/bootstrap/registerSubsystems.js`, or manually:

```js
const { wire } = require('./scripts/wire-broadcast-campaign');
wire(app); // mounts at /api/broadcast-campaign
```

## API

All write routes accept `x-admin-secret` (matched against `ADMIN_TOKEN`).
Tenant via `x-tenant-id` header, body `tenantId`, or `?tenantId=`.

- `GET  /api/broadcast-campaign/health` — doctor self-check.
- `GET  /api/broadcast-campaign/campaigns` — list tenant campaigns.
- `GET  /api/broadcast-campaign/campaigns/:id` — one campaign.
- `POST /api/broadcast-campaign/campaigns` — create draft. Body:
  `{ name, brief:{ message }, variants, context, contacts, audienceRule }`.
- `POST /api/broadcast-campaign/campaigns/:id/plan` — build (dry-run) send plan.
  Body: `{ contacts, ratePerMinute, batchSize, startAt, dryRun }`.
- `POST /api/broadcast-campaign/preview` — preview variants, persist nothing.

### Audience rule shape

```json
{
  "tags": ["vip"],
  "anyTags": ["vip", "repeat"],
  "excludeTags": ["unsub"],
  "city": ["Karachi", "Lahore"],
  "minOrders": 1,
  "lastSeenWithinDays": 30,
  "optedInOnly": true
}
```

## Env

| Var | Default | Meaning |
| --- | --- | --- |
| `CAMPAIGN_DRY_RUN` | `true` | Never dispatch when true. |
| `CAMPAIGN_RATE_PER_MINUTE` | `20` | Throttle per tenant. |
| `CAMPAIGN_BATCH_SIZE` | `50` | Recipients per batch. |
| `CAMPAIGN_MAX_VARIANTS` | `3` | Default variant count. |
| `CAMPAIGN_QUIET_START` | `22` | Quiet-hours start (local). |
| `CAMPAIGN_QUIET_END` | `8` | Quiet-hours end (local). |
| `CAMPAIGN_USE_LLM` | `true` | Use Ollama to phrase copy if available. |
| `CAMPAIGN_CURRENCY` | `PKR` | Currency. |
| `CAMPAIGN_TZ` | `Asia/Karachi` | Default timezone. |

## Test

```bash
node tests/smoke/broadcastCampaignSmoke.js   # offline, forces model unreachable
node scripts/broadcast-campaign-check.js     # doctor
```
