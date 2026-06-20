# n8n Examples (demo tokens, redacted)

1. Add an **HTTP Request** node (or Webhook trigger) in n8n.
2. In SuperSender Pro, create a webhook subscription to `public_funnel.lead_created`.
3. Use the n8n webhook URL as the subscription target.

Example incoming (redacted) payload:
```json
{ "event":"public_funnel.lead_created", "data":{ "leadIdSafe":"ld_***42", "source":"whatsapp", "interest":"AI Tools" }, "timestamp":"2026-01-01T00:00:00Z" }
```
Verify signature header `X-SuperSender-Signature: sha256=...` using your signing secret.
Deliveries are dry-run until live mode is enabled by an admin.
