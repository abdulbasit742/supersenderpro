# Developer Portal Safety

Safe-by-default guarantees:
- `DEVELOPER_PORTAL_DRY_RUN=true` — simulate, do not deliver.
- `DEVELOPER_PORTAL_ALLOW_LIVE_WEBHOOKS=false` — live HTTP delivery blocked. Live requires BOTH
  `allowLiveWebhooks=true` AND `dryRun=false`.
- `DEVELOPER_PORTAL_ALLOW_REAL_KEYS=false` — demo keys only.
- `DEVELOPER_PORTAL_REDACT_PAYLOADS=true` — redact all outbound payloads.
- `DEVELOPER_PORTAL_REQUIRE_APPROVAL_FOR_WEBHOOKS=true` — risky deliveries become `queued_preview`.

## Never committed
`.env`, secrets, signing secrets, API keys, raw webhook payloads, customer/order/payment/lead runtime JSON, logs, uploads.
All portal data files live under `data/` (gitignored).
