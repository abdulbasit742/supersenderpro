# Security Gateway + Rate Limit + Abuse Protection Command Center

A safe **coordination layer** for SuperSender Pro. It does **not** replace existing Admin Auth/RBAC, Compliance Center, Developer Portal, Webhook Event Hub, Audit Ledger, Approval Inbox, or any other module — it wires them together for security visibility.

## What it does
- API access protection (preview), public form / webhook abuse protection
- Developer API scope enforcement **preview**
- Reseller / tenant access safety checks
- Rate limit policy engine (hashed identifiers only)
- IP / user-agent fingerprint **hashing** (no raw IP stored)
- Suspicious-activity detection + abuse scoring
- Redacted security event audit log + security dashboard
- Safe adapters to existing modules

## Default posture (very important)
- `SECURITY_GATEWAY_DRY_RUN=true` — report-only
- `SECURITY_GATEWAY_ENFORCE=false` — **no live blocking** by default
- Raw IP is hashed; PII and secrets are redacted; raw export disabled
- Non-destructive: nothing is deleted, no external API is called

To preview live enforcement behaviour set `SECURITY_GATEWAY_ENFORCE=true` in a controlled environment only.

## Layout
- `lib/securityGateway/*` — policy, rate limiter, abuse detector, validators, guards, event writer, doctor, middleware, adapters
- `routes/securityGatewayRoutes.js` — mounted at `/api/security-gateway`
- `public/security-gateway.html` + `public/js/security-gateway.js` + `public/css/security-gateway.css`
- `scripts/security-gateway-check.js`, `tests/smoke/securityGatewaySmoke.js`

## Test
```
npm run security-gateway:check
npm run security-gateway:smoke
```

## What NOT to commit
`.env`, `data/security-*.json`, `data/security-events*.json`, raw security/IP logs, tokens, secrets. These are protected in `.gitignore`.

_Generated reference. Coordination layer only._
