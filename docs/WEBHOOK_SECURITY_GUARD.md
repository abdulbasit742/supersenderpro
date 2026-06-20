# Webhook Security Guard

Webhook abuse protection reuses the rate limiter (scope `webhook`, default 30 req / 10 min) and the input validator for payload inspection.

- Detects webhook test spam, suspicious payloads, secrets and PII in payloads.
- Does **not** rebuild the existing Webhook Event Hub or signing logic — it only adds preview-level abuse checks.
- Endpoint: `POST /api/security-gateway/validate/webhook`.

No webhook signing secrets are stored or logged.
