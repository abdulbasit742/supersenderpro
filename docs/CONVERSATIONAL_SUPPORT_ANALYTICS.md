# Conversational Support - Analytics

Read-only health metrics for the 24/7 WhatsApp support agent (Feature #1). Builds on the agent
from PR #293. It never sends, never writes, and never exposes phone numbers or message text - it
just rolls up the conversations + handoffs the agent already records.

## Endpoint

```
GET /api/conversational-support/analytics
GET /api/conversational-support/analytics?days=7
GET /api/conversational-support/analytics?tenantId=<tid>&days=30
```

- `days` (optional): only count records updated in the last N days. Omit or `0` = all time.
- `tenantId` (optional): defaults to `default`.
- Open (read-only) endpoint, same as the other GETs on this router.

## Response shape

```json
{
  "success": true,
  "analytics": {
    "tenantId": "default",
    "windowDays": "all",
    "generatedAt": "2026-07-02T13:00:00.000Z",
    "conversations": { "total": 42, "byStatus": { "active": 3, "escalated": 5, "closed": 34 }, "order": 9, "avgTurns": 4.6 },
    "messages": { "user": 210, "agent": 198, "grounded": 171, "groundingRate": 86.4 },
    "intents": { "faq": 120, "order": 40, "smalltalk": 25, "unknown": 13 },
    "escalation": { "convosEscalated": 5, "escalationRate": 11.9, "handoffs": 5, "byStatus": { "open": 1, "claimed": 1, "resolved": 3 }, "byReason": { "explicit": 3, "low_confidence": 1, "repeated_fallback": 1 }, "openNow": 1, "resolutionRate": 60 },
    "automation": { "selfServeRate": 88.1 }
  }
}
```

## What the numbers mean

- **conversations.byStatus** - active / escalated / closed mix. Historical conversations stay in the
  store (closed), so all-time trends survive session rollover.
- **conversations.avgTurns** - average history entries (user + agent) per conversation. A proxy for
  how much back-and-forth it takes.
- **messages.groundingRate** - % of agent replies backed by the knowledge base or the AI hub rather
  than a blind fallback. Low grounding = your KB needs more FAQs/products.
- **intents** - distribution of detected intents across agent turns (faq / order / smalltalk / unknown).
- **escalation.escalationRate** - % of conversations that needed a human. **byReason** tells you why
  (explicit request, low confidence, not grounded, repeated fallback).
- **escalation.resolutionRate** - % of handoffs your team marked resolved. **openNow** is the current
  backlog.
- **automation.selfServeRate** - % of conversations the bot handled end-to-end without escalating.
  This is the headline "how much work is the agent saving me" number.

## Notes

- Pure function over the JSON stores: safe to call as often as you like.
- Pairs well with the ops dashboard - drop the `selfServeRate` and `openNow` on a tile.
- No new env vars. Ships with the agent; nothing to wire beyond the existing router mount.
