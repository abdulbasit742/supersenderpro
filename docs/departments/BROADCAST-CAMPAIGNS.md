# Broadcast Campaigns (#79)

One-time broadcast messaging to a contact segment or an explicit recipient list.
Compose once, gate by consent + sender-health, queue, and track per-recipient
status + delivery stats. **Draft-safe by default** — nothing is actually sent
until a notifier is wired AND `BROADCAST_LIVE=true`.

## Wiring (server.js, 2 lines)
```js
const broadcastRoutes = require('./routes/broadcastRoutes');
app.use('/api/broadcast', broadcastRoutes);
```

## REST
| Method | Path | Purpose |
|---|---|---|
| GET  | `/api/broadcast` | list campaigns (PII masked) |
| GET  | `/api/broadcast/:id` | get one campaign |
| POST | `/api/broadcast` | create draft campaign `{ name, message, segmentId?, recipients? }` |
| POST | `/api/broadcast/:id/dispatch` | dispatch (draft-safe unless live) |
| GET  | `/api/broadcast/:id/stats` | stats + state |

Tenant resolved from `req.user.tenantId`, `x-tenant-id` header, or body `tenantId`.

## Integrations (best-effort, degrade gracefully)
- **Contacts & Segmentation (#12):** `segmentId` resolves a roster via `lib/contacts.listBySegment`.
- **Consent & Opt-Out (#38):** opted-out numbers are `skipped` at dispatch.
- **Sender Health & Anti-Ban (#30):** unhealthy sender blocks dispatch (stays draft).
- **Notifier (`lib/notify`):** when present + `BROADCAST_LIVE=true`, messages go out; else draft-only.

## Env
| Var | Default | Meaning |
|---|---|---|
| `BROADCAST_LIVE` | `false` | master send switch |
| `BROADCAST_MAX_RECIPIENTS` | `5000` | per-campaign cap |
| `BROADCAST_RATE_PER_MIN` | `60` | advisory throttle hint |
| `BROADCAST_ENFORCE_CONSENT` | `true` | honor opt-out dept |
| `BROADCAST_ENFORCE_HEALTH` | `true` | honor sender-health dept |
| `BROADCAST_MASK_PII` | `true` | mask phone/name in views |

## Self-check
```
npm run broadcast:check   # doctor
npm run broadcast:smoke   # end-to-end smoke
```

State: `data/broadcast/campaigns.json` (atomic writes, tenant-scoped).
