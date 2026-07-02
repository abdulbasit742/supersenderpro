# Conversational Support - Analytics & Insights

Read-only performance analytics for the 24/7 WhatsApp Conversational AI Support agent. Everything
is derived from the already-stored conversations + handoff queue, so it makes **no LLM calls, no
sends, and no writes** and is safe to call at any time.

## Endpoints

| Method | Path | Auth | Description |
| ------ | ---- | ---- | ----------- |
| GET | `/api/conversational-support/analytics` | open (phones masked elsewhere) | Aggregate metrics for a tenant |
| GET | `/api/conversational-support/insights` | open | Human-readable highlights + health flags |

Query params:
- `tenantId` (default `default`)
- `sinceHours` (optional) - only count conversations/handoffs touched in the trailing window

## What you get from `/analytics`

- **conversations**: `total`, `byStatus` (active/escalated/closed), `byMode` (chat/order),
  `escalationRate`, `deflectionRate`, `orderRate`, `staleActive`
- **messages**: user/agent/total turns, `avgTurnsPerConversation`, `escalatedTurns`
- **intents**: count of agent replies per classified intent
- **answerSources**: where grounded answers came from (e.g. faq / llm / fallback)
- **handoffs**: `total`, `byStatus`, `byReason`, `resolveRate`, `openBacklog`
- **busiestHour** + **hourHistogram**: inbound volume by hour-of-day

## `/insights`

Returns `{ summary, highlights[], flags[], metrics }`. Flags call out things worth attention:
high escalation rate, a growing handoff backlog, stale active sessions, or a lot of
deterministic-fallback replies (a hint the local model is offline). Handy for the owner's daily
brief or the ops dashboard.

## Try it

```bash
# seed a demo KB, simulate a couple of chats, then read analytics
curl -X POST localhost:3000/api/conversational-support/seed-example
curl -X POST localhost:3000/api/conversational-support/simulate -H 'content-type: application/json' -d '{"text":"what are your prices?"}'
curl localhost:3000/api/conversational-support/analytics | jq .analytics
curl localhost:3000/api/conversational-support/insights  | jq .insights
```

Smoke test: `node tests/smoke/conversationalSupportAnalyticsSmoke.js`
