# Security Events & Audit

`lib/securityGateway/securityEventWriter.js` writes **redacted** security events.

## Event shape
```
{ id, eventType, source, route, actorSafe, ipHash, userAgentHash, riskLevel, abuseScore, summary, metadataRedacted, dryRun, createdAt }
```

## Routing (safe adapters, best-effort, non-fatal)
- Audit Ledger adapter when present
- Incident Command adapter for high/critical risk
- Approval Inbox adapter when a risky action needs review

Raw IP, full PII and secrets are never included. Summaries and metadata are redacted.

## Endpoints
- `GET /api/security-gateway/events`
- `GET /api/security-gateway/events/:id`
- `POST /api/security-gateway/events/export-redacted`
