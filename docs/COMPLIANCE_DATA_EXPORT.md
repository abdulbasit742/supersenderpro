# Compliance - Data Export + Erasure

GDPR-style 'download my data' and 'delete my data', over the tenant-scoped data layer. Owner-only and audited.

## Export
`GET /api/compliance/export` (auth + owner) -> JSON bundle of every known collection for the tenant. Add `?download=true` for a file attachment. **Secrets are redacted** (passwordHash, resetTokenHash, api key hashes dropped; webhook secrets masked) even though they're already hashed.

## Erasure (right to be forgotten)
`POST /api/compliance/erase` (auth + owner) with body `{ "confirm": "<tenantId>" }`. The confirm token **must equal the tenant id** - a deliberate guard so erasure can't fire by accident. Returns per-collection counts removed. Logged to the audit trail.

## Collections covered
customers, orders, quotes, inbox_messages, txns, webhook_endpoints, follow_ups, users, subscriptions, usage, deals, carts, audit_log, api_keys.

## Safety
- Export redacts secrets.
- Erase is double-gated: owner role **and** explicit `confirm === tenantId`.
- Both actions write an audit entry (`compliance.export` / `compliance.erase`).
- Tenant-scoped: erasing tenant A never touches tenant B (proven in smoke test).

## Verify
```bash
node tests/smoke/dataExportSmoke.js
```
