# Webhook Event Hub

`GET /api/developer-portal/events` lists all webhook events.

Each event: `eventType, module, description, payloadSchema, redactedExample, piiRisk,
deliveryDefault (dry_run), retryPolicyPreview, enabled`.

Payload examples are **redacted** — no full phone/email/payment refs, no secrets, no raw messages or audio/transcripts.
