# Webhook Payload Examples (redacted)

```json
{ "event":"support.ticket_created", "data":{ "ticketIdSafe":"tk_***91", "subject":"Login issue", "priority":"high" } }
{ "event":"customer360.profile_preview_created", "data":{ "customerIdSafe":"cu_***88", "tier":"Gold", "phoneMasked":"923****77" } }
{ "event":"billing.preview_created", "data":{ "plan":"pro", "amountPreview":9900 } }
```
No full phone/email/payment refs, no secrets, no raw messages.
