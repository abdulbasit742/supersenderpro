# Developer Portal Command Center

The Developer Portal is a **safe coordination layer** that exposes SuperSender Pro to external
developers, resellers, agencies, and automation tools (n8n, Zapier-style, Make.com-style, custom CRMs).

It is **preview/dry-run first**:
- No live webhook delivery by default
- No real API secrets in responses (DEMO keys unless explicitly enabled)
- All payloads redacted (no full phone/email/payment refs, no secrets, no raw messages)

## Components
- **Developer App registry** — register integration apps with scopes + masked webhook URL.
- **API catalog + OpenAPI** — redacted documentation of safe existing endpoints.
- **Webhook Event Hub** — catalog of events with redacted example payloads.
- **Webhook subscriptions** — masked URL + signing secret preview; dry-run delivery.
- **Delivery preview + replay** — simulated deliveries with redacted payloads and retry plan.
- **API keys + scopes + rate limits** — one-time demo key previews; scope/rate-limit policy.
- **Source-module adapters** — detect existing modules and build redacted event previews; never mutate sources.

## Mount
`server.js` mounts: `app.use('/api/developer-portal', require('./routes/developerPortalRoutes'))`.

## UI
- Admin dashboard: `/developer-portal.html`
- Public docs: `/developers.html`
